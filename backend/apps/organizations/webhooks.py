"""
Razorpay Webhook Handler

Receives and processes Razorpay webhook events for subscription lifecycle management.
Verifies HMAC-SHA256 signatures to ensure authenticity.
"""

import json
import logging
from datetime import datetime

from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.choices import SubscriptionStatus
from apps.organizations.models import Subscription
from apps.organizations.payment import RazorpayService

logger = logging.getLogger(__name__)


class RazorpayWebhookView(APIView):
    """
    Receive Razorpay webhook events.

    POST /api/v1/webhooks/razorpay/
    No authentication required — verified via HMAC signature.
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # Disable JWT auth for webhooks

    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        # Verify signature
        signature = request.META.get("HTTP_X_RAZORPAY_SIGNATURE", "")
        body = request.body

        service = RazorpayService()
        if not service.verify_webhook_signature(body, signature):
            logger.warning("Invalid Razorpay webhook signature")
            return Response({"status": "invalid_signature"}, status=400)

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            logger.error("Invalid JSON in Razorpay webhook")
            return Response({"status": "invalid_json"}, status=400)

        event = payload.get("event", "")
        entity = payload.get("payload", {})

        logger.info("Razorpay webhook received: %s", event)

        # Route to handler
        handler = self._get_handler(event)
        if handler:
            try:
                handler(entity)
            except Exception:
                logger.exception("Error processing webhook event: %s", event)
                # Return 200 anyway — we don't want Razorpay to retry on our errors
        else:
            logger.info("Unhandled webhook event: %s", event)

        return Response({"status": "ok"})

    def _get_handler(self, event):
        handlers = {
            "subscription.activated": self._handle_subscription_activated,
            "subscription.charged": self._handle_subscription_charged,
            "subscription.halted": self._handle_subscription_halted,
            "subscription.cancelled": self._handle_subscription_cancelled,
            "subscription.paused": self._handle_subscription_paused,
            "subscription.resumed": self._handle_subscription_resumed,
            "subscription.completed": self._handle_subscription_completed,
            "payment.failed": self._handle_payment_failed,
        }
        return handlers.get(event)

    def _get_subscription(self, entity):
        """Extract subscription from webhook payload and find local record."""
        sub_entity = entity.get("subscription", {}).get("entity", {})
        razorpay_sub_id = sub_entity.get("id", "")

        if not razorpay_sub_id:
            logger.warning("No subscription ID in webhook payload")
            return None, None

        try:
            subscription = Subscription.objects.select_related(
                "plan", "organization"
            ).get(external_subscription_id=razorpay_sub_id)
            return subscription, sub_entity
        except Subscription.DoesNotExist:
            logger.warning("Subscription not found for Razorpay ID: %s", razorpay_sub_id)
            return None, None

    def _timestamp_to_datetime(self, ts):
        """Convert Unix timestamp to timezone-aware datetime."""
        if not ts:
            return None
        return timezone.make_aware(
            datetime.fromtimestamp(ts), timezone=timezone.utc
        )

    def _handle_subscription_activated(self, entity):
        """First payment successful — activate subscription."""
        subscription, sub_entity = self._get_subscription(entity)
        if not subscription:
            return

        subscription.status = SubscriptionStatus.ACTIVE
        update_fields = ["status"]

        # Update period dates from Razorpay
        current_start = self._timestamp_to_datetime(sub_entity.get("current_start"))
        current_end = self._timestamp_to_datetime(sub_entity.get("current_end"))
        if current_start:
            subscription.current_period_start = current_start
            update_fields.append("current_period_start")
        if current_end:
            subscription.current_period_end = current_end
            update_fields.append("current_period_end")

        # Store payment method from payment entity if available
        payment_entity = entity.get("payment", {}).get("entity", {})
        if payment_entity.get("method"):
            method = payment_entity["method"]
            card = payment_entity.get("card", {})
            if card:
                subscription.payment_method = f"{method}_{card.get('last4', '****')}"
            else:
                subscription.payment_method = method
            update_fields.append("payment_method")

        subscription.save(update_fields=update_fields)
        logger.info(
            "Subscription %s activated for org %s",
            subscription.external_subscription_id,
            subscription.organization_id,
        )

    def _handle_subscription_charged(self, entity):
        """Recurring payment successful — renew period."""
        subscription, sub_entity = self._get_subscription(entity)
        if not subscription:
            return

        current_start = self._timestamp_to_datetime(sub_entity.get("current_start"))
        current_end = self._timestamp_to_datetime(sub_entity.get("current_end"))

        update_fields = ["status"]
        subscription.status = SubscriptionStatus.ACTIVE

        if current_start:
            subscription.current_period_start = current_start
            update_fields.append("current_period_start")
        if current_end:
            subscription.current_period_end = current_end
            update_fields.append("current_period_end")

        subscription.save(update_fields=update_fields)
        logger.info(
            "Subscription %s charged (renewed) for org %s",
            subscription.external_subscription_id,
            subscription.organization_id,
        )

    def _handle_subscription_halted(self, entity):
        """Payment failures exceeded retry limit."""
        subscription, _ = self._get_subscription(entity)
        if not subscription:
            return

        subscription.status = SubscriptionStatus.PAST_DUE
        subscription.save(update_fields=["status"])
        logger.warning(
            "Subscription %s halted (past due) for org %s",
            subscription.external_subscription_id,
            subscription.organization_id,
        )

    def _handle_subscription_cancelled(self, entity):
        """Subscription cancelled."""
        subscription, _ = self._get_subscription(entity)
        if not subscription:
            return

        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancelled_at = timezone.now()
        subscription.save(update_fields=["status", "cancelled_at"])
        logger.info(
            "Subscription %s cancelled for org %s",
            subscription.external_subscription_id,
            subscription.organization_id,
        )

    def _handle_subscription_paused(self, entity):
        """Subscription paused."""
        subscription, _ = self._get_subscription(entity)
        if not subscription:
            return

        subscription.status = SubscriptionStatus.PAUSED
        subscription.save(update_fields=["status"])
        logger.info(
            "Subscription %s paused for org %s",
            subscription.external_subscription_id,
            subscription.organization_id,
        )

    def _handle_subscription_resumed(self, entity):
        """Subscription resumed after pause."""
        subscription, _ = self._get_subscription(entity)
        if not subscription:
            return

        subscription.status = SubscriptionStatus.ACTIVE
        subscription.save(update_fields=["status"])
        logger.info(
            "Subscription %s resumed for org %s",
            subscription.external_subscription_id,
            subscription.organization_id,
        )

    def _handle_subscription_completed(self, entity):
        """All billing cycles completed."""
        subscription, _ = self._get_subscription(entity)
        if not subscription:
            return

        subscription.status = SubscriptionStatus.EXPIRED
        subscription.save(update_fields=["status"])
        logger.info(
            "Subscription %s completed (expired) for org %s",
            subscription.external_subscription_id,
            subscription.organization_id,
        )

    def _handle_payment_failed(self, entity):
        """Payment attempt failed — log for now."""
        payment_entity = entity.get("payment", {}).get("entity", {})
        logger.warning(
            "Payment failed: id=%s, method=%s, error=%s",
            payment_entity.get("id"),
            payment_entity.get("method"),
            payment_entity.get("error_description", "unknown"),
        )

"""
Razorpay Payment Gateway Service

Encapsulates all Razorpay API interactions for subscription management.
"""

import hashlib
import hmac
import logging

import razorpay

from django.conf import settings

logger = logging.getLogger(__name__)


class RazorpayService:
    """Service class for Razorpay API operations."""

    def __init__(self):
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    # =========================================================================
    # Customer Management
    # =========================================================================

    def get_or_create_customer(self, user) -> str:
        """
        Get or create a Razorpay customer for the given user.
        Returns the Razorpay customer ID.
        """
        from apps.organizations.models import OrganizationMembership

        # Check if user's org subscription already has a customer_id
        membership = (
            OrganizationMembership.objects.filter(user=user, is_active=True)
            .select_related("organization__subscription")
            .first()
        )

        if membership:
            try:
                sub = membership.organization.subscription
                if sub.external_customer_id:
                    return sub.external_customer_id
            except Exception:
                pass

        # Create or fetch existing Razorpay customer
        customer_data = {
            "name": user.get_full_name() or user.email,
            "email": user.email,
            "fail_existing": "0",  # Return existing customer instead of error
        }
        if hasattr(user, "phone_number") and user.phone_number:
            customer_data["contact"] = str(user.phone_number)

        result = self.client.customer.create(customer_data)
        logger.info("Razorpay customer %s for user %s", result["id"], user.id)
        return result["id"]

    # =========================================================================
    # Plan Sync
    # =========================================================================

    def sync_plan(self, plan, force=False):
        """
        Sync a local Plan to Razorpay by creating monthly and annual Razorpay plans.
        Idempotent — skips if already synced unless force=True.
        """
        from apps.core.choices import BillingCycle

        if plan.is_free:
            logger.info("Skipping free plan: %s", plan.name)
            return

        updated_fields = []

        # Monthly plan
        if not plan.razorpay_plan_id or force:
            monthly_amount = int(plan.monthly_price * 100)  # Convert to paise
            if monthly_amount > 0:
                monthly_data = {
                    "period": "monthly",
                    "interval": 1,
                    "item": {
                        "name": f"{plan.name} - {BillingCycle.MONTHLY.label}",
                        "amount": monthly_amount,
                        "currency": "INR",
                        "description": plan.description or f"{plan.name} monthly subscription",
                    },
                }
                result = self.client.plan.create(monthly_data)
                plan.razorpay_plan_id = result["id"]
                updated_fields.append("razorpay_plan_id")
                logger.info(
                    "Created Razorpay monthly plan %s for %s",
                    result["id"],
                    plan.name,
                )

        # Annual plan
        if not plan.razorpay_annual_plan_id or force:
            annual_amount = int(plan.annual_price * 100)  # Convert to paise
            if annual_amount > 0:
                annual_data = {
                    "period": "yearly",
                    "interval": 1,
                    "item": {
                        "name": f"{plan.name} - {BillingCycle.ANNUAL.label}",
                        "amount": annual_amount,
                        "currency": "INR",
                        "description": plan.description or f"{plan.name} annual subscription",
                    },
                }
                result = self.client.plan.create(annual_data)
                plan.razorpay_annual_plan_id = result["id"]
                updated_fields.append("razorpay_annual_plan_id")
                logger.info(
                    "Created Razorpay annual plan %s for %s",
                    result["id"],
                    plan.name,
                )

        if updated_fields:
            plan.save(update_fields=updated_fields)

    # =========================================================================
    # Subscription Management
    # =========================================================================

    def create_subscription(self, plan, billing_cycle, customer_id, org_id) -> dict:
        """
        Create a Razorpay subscription for the given plan and billing cycle.
        Returns the Razorpay subscription data.
        """
        from apps.core.choices import BillingCycle

        if billing_cycle == BillingCycle.ANNUAL:
            razorpay_plan_id = plan.razorpay_annual_plan_id
            total_count = 5  # 5 annual cycles
        else:
            razorpay_plan_id = plan.razorpay_plan_id
            total_count = 60  # 60 monthly cycles (5 years)

        if not razorpay_plan_id:
            raise ValueError(
                f"Plan '{plan.name}' has no Razorpay plan ID for {billing_cycle} billing. "
                "Run 'python manage.py sync_razorpay_plans' first."
            )

        subscription_data = {
            "plan_id": razorpay_plan_id,
            "customer_id": customer_id,
            "total_count": total_count,
            "customer_notify": 1,
            "notes": {
                "organization_id": str(org_id),
                "plan_name": plan.name,
                "billing_cycle": billing_cycle,
            },
        }

        result = self.client.subscription.create(subscription_data)
        logger.info(
            "Created Razorpay subscription %s for org %s (plan: %s, cycle: %s)",
            result["id"],
            org_id,
            plan.name,
            billing_cycle,
        )
        return result

    def cancel_subscription(self, external_subscription_id, at_period_end=True) -> dict:
        """Cancel a Razorpay subscription."""
        result = self.client.subscription.cancel(
            external_subscription_id,
            {"cancel_at_cycle_end": 1 if at_period_end else 0},
        )
        logger.info(
            "Cancelled Razorpay subscription %s (at_period_end=%s)",
            external_subscription_id,
            at_period_end,
        )
        return result

    def update_subscription_plan(self, external_subscription_id, new_plan, billing_cycle) -> dict:
        """Update a Razorpay subscription to a different plan."""
        from apps.core.choices import BillingCycle

        if billing_cycle == BillingCycle.ANNUAL:
            razorpay_plan_id = new_plan.razorpay_annual_plan_id
        else:
            razorpay_plan_id = new_plan.razorpay_plan_id

        if not razorpay_plan_id:
            raise ValueError(
                f"Plan '{new_plan.name}' has no Razorpay plan ID for {billing_cycle} billing."
            )

        result = self.client.subscription.edit(
            external_subscription_id,
            {
                "plan_id": razorpay_plan_id,
                "schedule_change_at": "now",
                "customer_notify": 1,
            },
        )
        logger.info(
            "Updated Razorpay subscription %s to plan %s",
            external_subscription_id,
            new_plan.name,
        )
        return result

    def fetch_subscription(self, external_subscription_id) -> dict:
        """Fetch subscription details from Razorpay."""
        return self.client.subscription.fetch(external_subscription_id)

    # =========================================================================
    # Webhook Verification
    # =========================================================================

    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        """Verify Razorpay webhook HMAC-SHA256 signature."""
        if not settings.RAZORPAY_WEBHOOK_SECRET:
            logger.warning("RAZORPAY_WEBHOOK_SECRET not configured")
            return False

        expected = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

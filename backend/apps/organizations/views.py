"""
Organization API Views
"""

import hashlib
import secrets

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAdminOrManager
from apps.organizations.models import (
    Organization,
    OrganizationAPIKey,
    OrganizationMembership,
    Plan,
    Subscription,
)
from apps.organizations.serializers import (
    APIKeyCreateResponseSerializer,
    APIKeyCreateSerializer,
    APIKeyListSerializer,
    OrganizationBillingSerializer,
    PlanSerializer,
    SubscriptionSerializer,
)


class PlanListView(generics.ListAPIView):
    """
    List all active subscription plans.

    GET /api/v1/plans/
    Returns all active plans ordered by display_order and price.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = PlanSerializer

    def get_queryset(self):
        return Plan.objects.filter(is_active=True).order_by("display_order", "monthly_price")


class BillingOverviewView(APIView):
    """
    Get billing overview for the current user's organization.

    GET /api/v1/billing/
    Returns organization plan, subscription, and usage stats.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Find the user's active organization membership
        membership = (
            OrganizationMembership.objects.filter(
                user=request.user,
                is_active=True,
            )
            .select_related("organization", "organization__plan")
            .first()
        )

        if not membership:
            return Response(
                {"success": False, "message": "No organization found for this user"},
                status=status.HTTP_404_NOT_FOUND,
            )

        organization = membership.organization
        org_data = OrganizationBillingSerializer(organization).data

        # Fetch subscription separately, deferring the encrypted payment_method field
        try:
            subscription = (
                Subscription.objects.defer("payment_method")
                .select_related("plan")
                .get(organization=organization)
            )
            org_data["subscription"] = SubscriptionSerializer(subscription).data
        except Subscription.DoesNotExist:
            org_data["subscription"] = None

        return Response({"success": True, "data": org_data})


def get_user_organization(user):
    """Helper to get the user's active organization."""
    membership = (
        OrganizationMembership.objects.filter(user=user, is_active=True)
        .select_related("organization")
        .first()
    )
    return membership.organization if membership else None


class APIKeyListCreateView(APIView):
    """
    List and create API keys for the current user's organization.

    GET /api/v1/api-keys/
    POST /api/v1/api-keys/
    """

    permission_classes = [IsAuthenticated, IsAdminOrManager]

    def get(self, request):
        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"success": False, "message": "No organization found for this user"},
                status=status.HTTP_404_NOT_FOUND,
            )

        api_keys = (
            OrganizationAPIKey.objects.filter(organization=organization)
            .select_related("created_by_user")
            .order_by("-created_at")
        )

        serializer = APIKeyListSerializer(api_keys, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"success": False, "message": "No organization found for this user"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = APIKeyCreateSerializer(
            data=request.data, context={"organization": organization}
        )
        serializer.is_valid(raise_exception=True)

        # Create key manually to use save_without_historical_record
        # (simple_history + modeltranslation conflict on translated fields)
        raw_key = f"flyng_{secrets.token_urlsafe(32)}"
        prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        api_key = OrganizationAPIKey(
            organization=organization,
            name=serializer.validated_data["name"],
            prefix=prefix,
            key_hash=key_hash,
            scopes=serializer.validated_data.get("scopes", []),
            expires_at=serializer.validated_data.get("expires_at"),
            created_by_user=request.user,
            description=serializer.validated_data.get("description", ""),
        )
        api_key.save_without_historical_record()

        response_data = APIKeyCreateResponseSerializer(api_key).data
        response_data["raw_key"] = raw_key

        return Response(
            {"success": True, "data": response_data},
            status=status.HTTP_201_CREATED,
        )


class APIKeyRevokeView(APIView):
    """
    Revoke an API key.

    POST /api/v1/api-keys/<id>/revoke/
    """

    permission_classes = [IsAuthenticated, IsAdminOrManager]

    def post(self, request, pk):
        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"success": False, "message": "No organization found for this user"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            api_key = OrganizationAPIKey.objects.get(
                pk=pk, organization=organization
            )
        except OrganizationAPIKey.DoesNotExist:
            return Response(
                {"success": False, "message": "API key not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not api_key.is_active:
            return Response(
                {"success": False, "message": "API key is already revoked"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key.is_active = False
        api_key.save_without_historical_record(update_fields=["is_active"])
        return Response({"success": True, "message": "API key revoked successfully"})

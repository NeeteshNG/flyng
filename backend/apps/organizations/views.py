"""
Organization API Views
"""

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.organizations.models import Organization, OrganizationMembership, Plan, Subscription
from apps.organizations.serializers import (
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

"""
Organization API Views
"""

import hashlib
import secrets
from datetime import timedelta

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
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


class DashboardStatsView(APIView):
    """
    Get aggregated dashboard stats for the current user's organization.

    GET /api/v1/dashboard/stats/
    Returns counts, breakdowns, recent jobs, and order activity chart data.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.batteries.models import DroneBattery
        from apps.drones.models import Drone
        from apps.inventory.models import InventoryItem, InventoryStock
        from apps.jobs.models import DroneJob
        from apps.orders.models import PickOrder
        from apps.warehouses.models import Warehouse

        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"success": False, "message": "No organization found for this user"},
                status=status.HTTP_404_NOT_FOUND,
            )

        org_id = organization.id
        now = timezone.now()

        # --- Drones ---
        drones_qs = Drone.objects.filter(
            work_area__ground_control_station__zone__warehouse__organization=org_id
        )
        total_drones = drones_qs.count()
        drone_by_status = dict(
            drones_qs.values_list("status").annotate(count=Count("id")).values_list("status", "count")
        )

        # --- Warehouses ---
        total_warehouses = Warehouse.objects.filter(organization=org_id, is_active=True).count()

        # --- Batteries ---
        batteries_qs = DroneBattery.objects.filter(
            warehouse__organization=org_id
        )
        total_batteries = batteries_qs.count()
        battery_by_status = dict(
            batteries_qs.values_list("status").annotate(count=Count("id")).values_list("status", "count")
        )

        # --- Items & Stock ---
        items_qs = InventoryItem.objects.filter(organization=org_id, is_active=True)
        total_items = items_qs.count()
        total_stock_qty = (
            InventoryStock.objects.filter(item__organization=org_id)
            .aggregate(total=Sum("quantity"))["total"]
            or 0
        )

        # Low stock: items where total stock < min_stock_level
        low_stock_count = (
            items_qs.filter(min_stock_level__gt=0)
            .annotate(total_stock=Sum("stocks__quantity"))
            .filter(Q(total_stock__lt=F("min_stock_level")) | Q(total_stock__isnull=True))
            .count()
        )

        # --- Orders ---
        orders_qs = PickOrder.objects.filter(organization=org_id)
        total_orders = orders_qs.count()
        order_by_status = dict(
            orders_qs.values_list("status").annotate(count=Count("id")).values_list("status", "count")
        )
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        orders_today = orders_qs.filter(created_at__gte=today_start).count()
        in_progress_orders = order_by_status.get("PICKING", 0) + order_by_status.get("PACKING", 0)

        # --- Jobs ---
        jobs_qs = DroneJob.objects.filter(organization=org_id)
        total_jobs = jobs_qs.count()
        job_by_status = dict(
            jobs_qs.values_list("status").annotate(count=Count("id")).values_list("status", "count")
        )
        completed_jobs = job_by_status.get("COMPLETED", 0)

        # --- Recent jobs (last 5) ---
        recent_jobs_qs = (
            jobs_qs.select_related("drone", "source_bin", "destination_bin")
            .order_by("-created_at")[:5]
        )
        recent_jobs = []
        for job in recent_jobs_qs:
            recent_jobs.append({
                "id": job.id,
                "job_number": job.job_number,
                "status": job.status,
                "status_display": job.get_status_display(),
                "drone_name": job.drone.name if job.drone else None,
                "source_bin_code": job.source_bin.code if job.source_bin else None,
                "destination_bin_code": job.destination_bin.code if job.destination_bin else None,
                "created_at": job.created_at.isoformat(),
            })

        # --- Order activity (last 7 days) ---
        seven_days_ago = now - timedelta(days=6)
        seven_days_ago = seven_days_ago.replace(hour=0, minute=0, second=0, microsecond=0)
        daily_orders = dict(
            orders_qs.filter(created_at__gte=seven_days_ago)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .values_list("day", "count")
        )
        # Fill in all 7 days
        order_activity = []
        for i in range(7):
            day = (seven_days_ago + timedelta(days=i)).date()
            order_activity.append({
                "date": day.isoformat(),
                "count": daily_orders.get(day, 0),
            })

        return Response({
            "success": True,
            "data": {
                "drones": {
                    "total": total_drones,
                    "by_status": drone_by_status,
                    "in_flight": drone_by_status.get("IN_FLIGHT", 0),
                    "available": drone_by_status.get("AVAILABLE", 0),
                },
                "warehouses": {
                    "total": total_warehouses,
                },
                "batteries": {
                    "total": total_batteries,
                    "by_status": battery_by_status,
                },
                "items": {
                    "total": total_items,
                    "total_stock_qty": total_stock_qty,
                    "low_stock_count": low_stock_count,
                },
                "orders": {
                    "total": total_orders,
                    "by_status": order_by_status,
                    "today": orders_today,
                    "in_progress": in_progress_orders,
                },
                "jobs": {
                    "total": total_jobs,
                    "by_status": job_by_status,
                    "completed": completed_jobs,
                },
                "recent_jobs": recent_jobs,
                "order_activity": order_activity,
            },
        })


class AnalyticsView(APIView):
    """
    Get analytics data for the current user's organization.

    GET /api/v1/dashboard/analytics/
    Returns time-series data for orders, jobs, and drones over the last 30 days,
    plus status distribution breakdowns for pie/donut charts.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.batteries.models import DroneBattery
        from apps.drones.models import Drone
        from apps.inventory.models import InventoryItem, InventoryStock
        from apps.jobs.models import DroneJob
        from apps.orders.models import PickOrder

        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        org_id = organization.id
        now = timezone.now()
        thirty_days_ago = (now - timedelta(days=29)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        # --- Order activity (last 30 days) ---
        orders_qs = PickOrder.objects.filter(organization=org_id)
        daily_orders = dict(
            orders_qs.filter(created_at__gte=thirty_days_ago)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .values_list("day", "count")
        )

        # --- Job activity (last 30 days) ---
        jobs_qs = DroneJob.objects.filter(organization=org_id)
        daily_jobs = dict(
            jobs_qs.filter(created_at__gte=thirty_days_ago)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .values_list("day", "count")
        )

        # Fill in all 30 days
        activity_data = []
        for i in range(30):
            day = (thirty_days_ago + timedelta(days=i)).date()
            activity_data.append({
                "date": day.isoformat(),
                "orders": daily_orders.get(day, 0),
                "jobs": daily_jobs.get(day, 0),
            })

        # --- Status distributions ---
        drones_qs = Drone.objects.filter(
            work_area__ground_control_station__zone__warehouse__organization=org_id
        )
        drone_by_status = list(
            drones_qs.values("status").annotate(count=Count("id")).order_by("status")
        )

        order_by_status = list(
            orders_qs.values("status").annotate(count=Count("id")).order_by("status")
        )

        job_by_status = list(
            jobs_qs.values("status").annotate(count=Count("id")).order_by("status")
        )

        batteries_qs = DroneBattery.objects.filter(warehouse__organization=org_id)
        battery_by_status = list(
            batteries_qs.values("status").annotate(count=Count("id")).order_by("status")
        )

        battery_by_health = list(
            batteries_qs.values("health_status").annotate(count=Count("id")).order_by("health_status")
        )

        # --- Inventory breakdown ---
        items_qs = InventoryItem.objects.filter(organization=org_id, is_active=True)
        total_items = items_qs.count()
        items_with_stock = (
            items_qs.annotate(total_stock=Sum("stocks__quantity"))
            .filter(total_stock__gt=0)
            .count()
        )
        low_stock = (
            items_qs.filter(min_stock_level__gt=0)
            .annotate(total_stock=Sum("stocks__quantity"))
            .filter(Q(total_stock__lt=F("min_stock_level")) | Q(total_stock__isnull=True))
            .count()
        )
        out_of_stock = (
            items_qs.annotate(total_stock=Sum("stocks__quantity"))
            .filter(Q(total_stock__isnull=True) | Q(total_stock=0))
            .count()
        )

        return Response({
            "success": True,
            "data": {
                "activity": activity_data,
                "distributions": {
                    "drones": [{"name": d["status"], "value": d["count"]} for d in drone_by_status],
                    "orders": [{"name": d["status"], "value": d["count"]} for d in order_by_status],
                    "jobs": [{"name": d["status"], "value": d["count"]} for d in job_by_status],
                    "batteries": [{"name": d["status"], "value": d["count"]} for d in battery_by_status],
                    "battery_health": [{"name": d["health_status"], "value": d["count"]} for d in battery_by_health],
                },
                "inventory": {
                    "total_items": total_items,
                    "in_stock": items_with_stock,
                    "low_stock": low_stock,
                    "out_of_stock": out_of_stock,
                },
            },
        })


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

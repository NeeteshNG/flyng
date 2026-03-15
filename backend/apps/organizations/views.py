"""
Organization API Views
"""

import hashlib
import secrets
from datetime import date, datetime, timedelta

from django.db import transaction
from django.db.models import Avg, Count, ExpressionWrapper, F, Q, Sum
from django.db.models.fields import DurationField
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.choices import BillingCycle, InvitationStatus, SubscriptionStatus
from apps.core.pagination import StandardPagination
from apps.core.permissions import IsAdminOrManager
from apps.organizations.models import (
    Organization,
    OrganizationAPIKey,
    OrganizationInvitation,
    OrganizationMembership,
    OrganizationSettings,
    Plan,
    Subscription,
)
from apps.organizations.serializers import (
    APIKeyCreateResponseSerializer,
    APIKeyCreateSerializer,
    APIKeyListSerializer,
    CancelSubscriptionSerializer,
    CheckoutSerializer,
    InvitationCreateSerializer,
    InvitationListSerializer,
    MembershipDetailSerializer,
    MembershipListSerializer,
    MembershipUpdateSerializer,
    OrganizationBillingSerializer,
    OrganizationSettingsSerializer,
    PlanSerializer,
    SubscriptionSerializer,
    TransferOwnershipSerializer,
    UpgradePlanSerializer,
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

    GET /api/v1/dashboard/analytics/?range=30d
    Returns time-series data for orders, jobs, and drones,
    plus status distribution breakdowns for pie/donut charts.
    Supports date range filtering via ?range= or ?date_from=&date_to=.
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
        date_from, date_to, prev_from, prev_to = parse_date_range(request)

        # --- Order activity ---
        orders_qs = PickOrder.objects.filter(organization=org_id)
        daily_orders = dict(
            orders_qs.filter(created_at__range=(date_from, date_to))
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .values_list("day", "count")
        )

        # --- Job activity ---
        jobs_qs = DroneJob.objects.filter(organization=org_id)
        daily_jobs = dict(
            jobs_qs.filter(created_at__range=(date_from, date_to))
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .values_list("day", "count")
        )

        # Fill in all days
        period_days = (date_to.date() - date_from.date()).days + 1
        activity_data = []
        for i in range(period_days):
            day = date_from.date() + timedelta(days=i)
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
                "meta": {
                    "date_from": date_from.date().isoformat(),
                    "date_to": date_to.date().isoformat(),
                },
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


def parse_date_range(request):
    """
    Parse date range from query params.

    Supports:
      ?range=7d|30d|90d|6m|1y
      ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Returns (date_from, date_to, previous_from, previous_to) as datetime objects.
    The previous period is the same length, immediately preceding the current period.
    """
    now = timezone.now()
    today = now.date()

    range_param = request.query_params.get("range")
    date_from_param = request.query_params.get("date_from")
    date_to_param = request.query_params.get("date_to")

    if date_from_param and date_to_param:
        try:
            date_from = datetime.strptime(date_from_param, "%Y-%m-%d").date()
            date_to = datetime.strptime(date_to_param, "%Y-%m-%d").date()
        except ValueError:
            date_from = today - timedelta(days=29)
            date_to = today
    elif range_param:
        range_days = {
            "7d": 6,
            "30d": 29,
            "90d": 89,
            "6m": 179,
            "1y": 364,
        }
        days = range_days.get(range_param, 29)
        date_from = today - timedelta(days=days)
        date_to = today
    else:
        date_from = today - timedelta(days=29)
        date_to = today

    period_length = (date_to - date_from).days + 1
    previous_to = date_from - timedelta(days=1)
    previous_from = previous_to - timedelta(days=period_length - 1)

    # Convert to timezone-aware datetimes
    date_from_dt = timezone.make_aware(datetime.combine(date_from, datetime.min.time()))
    date_to_dt = timezone.make_aware(datetime.combine(date_to, datetime.max.time()))
    prev_from_dt = timezone.make_aware(datetime.combine(previous_from, datetime.min.time()))
    prev_to_dt = timezone.make_aware(datetime.combine(previous_to, datetime.max.time()))

    return date_from_dt, date_to_dt, prev_from_dt, prev_to_dt


def _kpi(value, previous_value):
    """Build a KPI dict with change_percent and trend."""
    if previous_value and previous_value != 0:
        change = round(((value - previous_value) / previous_value) * 100, 1)
    else:
        change = 0.0
    trend = "up" if change > 0 else ("down" if change < 0 else "stable")
    return {"value": value, "change_percent": change, "trend": trend}


def _fill_time_series(daily_data, date_from, date_to, keys):
    """Fill gaps in time-series data to ensure every day has an entry."""
    result = []
    d = date_from.date() if hasattr(date_from, "date") else date_from
    end = date_to.date() if hasattr(date_to, "date") else date_to
    while d <= end:
        entry = {"period": d.isoformat()}
        row = daily_data.get(d, {})
        for key in keys:
            entry[key] = row.get(key, 0)
        result.append(entry)
        d += timedelta(days=1)
    return result


class OrderAnalyticsView(APIView):
    """
    Order fulfillment analytics.

    GET /api/v1/dashboard/analytics/orders/?range=30d
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.inventory.models import InventoryItem
        from apps.orders.models import PickOrder, PickOrderLine

        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        org_id = organization.id
        date_from, date_to, prev_from, prev_to = parse_date_range(request)

        # --- KPIs for current period ---
        orders_qs = PickOrder.objects.filter(organization=org_id)
        current_orders = orders_qs.filter(created_at__range=(date_from, date_to))
        prev_orders = orders_qs.filter(created_at__range=(prev_from, prev_to))

        total_current = current_orders.count()
        total_prev = prev_orders.count()

        # Fulfillment rate: DELIVERED orders / total * 100
        delivered_current = current_orders.filter(status="DELIVERED").count()
        delivered_prev = prev_orders.filter(status="DELIVERED").count()
        fulfillment_current = round((delivered_current / total_current * 100), 1) if total_current else 0
        fulfillment_prev = round((delivered_prev / total_prev * 100), 1) if total_prev else 0

        # Avg cycle time (confirmed_at → delivered_at) in hours
        cycle_agg = current_orders.filter(
            delivered_at__isnull=False, confirmed_at__isnull=False
        ).aggregate(
            avg_cycle=Avg(
                ExpressionWrapper(
                    F("delivered_at") - F("confirmed_at"),
                    output_field=DurationField(),
                )
            )
        )
        avg_cycle_current = round(cycle_agg["avg_cycle"].total_seconds() / 3600, 1) if cycle_agg["avg_cycle"] else 0

        cycle_agg_prev = prev_orders.filter(
            delivered_at__isnull=False, confirmed_at__isnull=False
        ).aggregate(
            avg_cycle=Avg(
                ExpressionWrapper(
                    F("delivered_at") - F("confirmed_at"),
                    output_field=DurationField(),
                )
            )
        )
        avg_cycle_prev = round(cycle_agg_prev["avg_cycle"].total_seconds() / 3600, 1) if cycle_agg_prev["avg_cycle"] else 0

        # Overdue count (active orders past due_date)
        active_statuses = ["PENDING", "CONFIRMED", "PICKING", "PICKED", "PACKING", "PACKED"]
        overdue_count = orders_qs.filter(
            status__in=active_statuses,
            due_date__lt=timezone.now().date(),
        ).count()

        # Picking accuracy: sum(picked_quantity) / sum(quantity) * 100
        lines_current = PickOrderLine.objects.filter(order__organization=org_id, order__created_at__range=(date_from, date_to))
        lines_agg = lines_current.aggregate(
            total_qty=Sum("quantity"),
            picked_qty=Sum("picked_quantity"),
        )
        total_qty = lines_agg["total_qty"] or 0
        picked_qty = lines_agg["picked_qty"] or 0
        picking_accuracy = round((picked_qty / total_qty * 100), 1) if total_qty else 100.0

        # --- Charts ---
        # Orders over time
        daily_qs = (
            current_orders.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                total=Count("id"),
                completed=Count("id", filter=Q(status="DELIVERED")),
                cancelled=Count("id", filter=Q(status="CANCELLED")),
            )
            .order_by("day")
        )
        daily_data = {}
        for row in daily_qs:
            daily_data[row["day"]] = {
                "total": row["total"],
                "completed": row["completed"],
                "cancelled": row["cancelled"],
            }
        orders_over_time = _fill_time_series(daily_data, date_from, date_to, ["total", "completed", "cancelled"])

        # Orders by priority
        priority_dist = list(
            current_orders.values("priority")
            .annotate(count=Count("id"))
            .order_by("priority")
        )
        orders_by_priority = [{"name": d["priority"], "value": d["count"]} for d in priority_dist]

        # Orders by status
        status_dist = list(
            current_orders.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        orders_by_status = [{"name": d["status"], "value": d["count"]} for d in status_dist]

        # Top 10 picked items
        top_items_qs = (
            lines_current.filter(picked_quantity__gt=0)
            .values("item__name", "item__sku")
            .annotate(quantity=Sum("picked_quantity"))
            .order_by("-quantity")[:10]
        )
        top_picked_items = [
            {"name": row["item__name"], "sku": row["item__sku"], "quantity": row["quantity"]}
            for row in top_items_qs
        ]

        # Top 10 pick locations (source bins most picked from)
        top_pick_locations = list(
            lines_current.filter(
                picked_quantity__gt=0, source_bin__isnull=False
            )
            .values("source_bin__code", "source_bin__location__aisle")
            .annotate(picks=Count("id"), quantity=Sum("picked_quantity"))
            .order_by("-picks")[:10]
        )
        top_pick_locs = [
            {
                "bin_code": row["source_bin__code"],
                "aisle": row["source_bin__location__aisle"] or "",
                "picks": row["picks"],
                "quantity": row["quantity"],
            }
            for row in top_pick_locations
        ]

        # Top 10 drop locations (destination bins from completed jobs)
        from apps.jobs.models import DroneJob

        top_drop_locations = list(
            DroneJob.objects.filter(
                organization=org_id,
                status="COMPLETED",
                destination_bin__isnull=False,
                completed_at__range=(date_from, date_to),
            )
            .values("destination_bin__code", "destination_bin__location__aisle")
            .annotate(drops=Count("id"), quantity=Sum("picked_quantity"))
            .order_by("-drops")[:10]
        )
        top_drop_locs = [
            {
                "bin_code": row["destination_bin__code"],
                "aisle": row["destination_bin__location__aisle"] or "",
                "drops": row["drops"],
                "quantity": row["quantity"] or 0,
            }
            for row in top_drop_locations
        ]

        return Response({
            "success": True,
            "data": {
                "meta": {
                    "date_from": date_from.date().isoformat(),
                    "date_to": date_to.date().isoformat(),
                },
                "kpis": {
                    "total_orders": _kpi(total_current, total_prev),
                    "fulfillment_rate": _kpi(fulfillment_current, fulfillment_prev),
                    "avg_cycle_time_hours": _kpi(avg_cycle_current, avg_cycle_prev),
                    "overdue_count": {"value": overdue_count, "change_percent": 0, "trend": "stable"},
                    "picking_accuracy": {"value": picking_accuracy, "change_percent": 0, "trend": "stable"},
                },
                "orders_over_time": orders_over_time,
                "orders_by_priority": orders_by_priority,
                "orders_by_status": orders_by_status,
                "top_picked_items": top_picked_items,
                "top_pick_locations": top_pick_locs,
                "top_drop_locations": top_drop_locs,
            },
        })


class FleetAnalyticsView(APIView):
    """
    Drone fleet and battery analytics.

    GET /api/v1/dashboard/analytics/fleet/?range=30d
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.batteries.models import DroneBattery
        from apps.drones.models import Drone
        from apps.jobs.models import DroneJob

        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        org_id = organization.id
        date_from, date_to, prev_from, prev_to = parse_date_range(request)

        # --- Drone KPIs ---
        drones_qs = Drone.objects.filter(
            work_area__ground_control_station__zone__warehouse__organization=org_id,
            is_active=True,
        )
        total_drones = drones_qs.count()
        in_flight = drones_qs.filter(status="IN_FLIGHT").count()
        fleet_utilization = round((in_flight / total_drones * 100), 1) if total_drones else 0

        # Total flight hours
        flight_hours_agg = drones_qs.aggregate(total=Sum("total_flight_hours"))
        total_flight_hours = round(float(flight_hours_agg["total"] or 0), 1)

        # --- Job KPIs ---
        jobs_qs = DroneJob.objects.filter(organization=org_id)
        current_jobs = jobs_qs.filter(created_at__range=(date_from, date_to))
        prev_jobs = jobs_qs.filter(created_at__range=(prev_from, prev_to))

        completed_current = current_jobs.filter(status="COMPLETED").count()
        failed_current = current_jobs.filter(status="FAILED").count()
        completed_prev = prev_jobs.filter(status="COMPLETED").count()
        failed_prev = prev_jobs.filter(status="FAILED").count()

        success_denom_current = completed_current + failed_current
        success_denom_prev = completed_prev + failed_prev
        job_success_current = round((completed_current / success_denom_current * 100), 1) if success_denom_current else 100.0
        job_success_prev = round((completed_prev / success_denom_prev * 100), 1) if success_denom_prev else 100.0

        # Avg job duration (started_at → completed_at) in minutes
        duration_agg = current_jobs.filter(
            completed_at__isnull=False, started_at__isnull=False
        ).aggregate(
            avg_duration=Avg(
                ExpressionWrapper(
                    F("completed_at") - F("started_at"),
                    output_field=DurationField(),
                )
            )
        )
        avg_duration_current = round(duration_agg["avg_duration"].total_seconds() / 60, 1) if duration_agg["avg_duration"] else 0

        duration_agg_prev = prev_jobs.filter(
            completed_at__isnull=False, started_at__isnull=False
        ).aggregate(
            avg_duration=Avg(
                ExpressionWrapper(
                    F("completed_at") - F("started_at"),
                    output_field=DurationField(),
                )
            )
        )
        avg_duration_prev = round(duration_agg_prev["avg_duration"].total_seconds() / 60, 1) if duration_agg_prev["avg_duration"] else 0

        # --- Battery KPIs ---
        batteries_qs = DroneBattery.objects.filter(
            warehouse__organization=org_id, is_active=True
        )
        battery_agg = batteries_qs.aggregate(avg_charge=Avg("current_charge_percent"))
        battery_avg_charge = round(float(battery_agg["avg_charge"] or 0), 1)

        batteries_needing_replacement = batteries_qs.filter(
            health_status__in=["POOR", "REPLACE"]
        ).count()

        # --- Charts ---
        # Jobs over time
        daily_jobs_qs = (
            current_jobs.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                completed=Count("id", filter=Q(status="COMPLETED")),
                failed=Count("id", filter=Q(status="FAILED")),
                cancelled=Count("id", filter=Q(status="CANCELLED")),
            )
            .order_by("day")
        )
        daily_data = {}
        for row in daily_jobs_qs:
            daily_data[row["day"]] = {
                "completed": row["completed"],
                "failed": row["failed"],
                "cancelled": row["cancelled"],
            }
        jobs_over_time = _fill_time_series(daily_data, date_from, date_to, ["completed", "failed", "cancelled"])

        # Jobs by type
        type_dist = list(
            current_jobs.values("job_type")
            .annotate(count=Count("id"))
            .order_by("job_type")
        )
        jobs_by_type = [{"name": d["job_type"], "value": d["count"]} for d in type_dist]

        # Drone status distribution (current snapshot)
        all_drones = Drone.objects.filter(
            work_area__ground_control_station__zone__warehouse__organization=org_id
        )
        drone_status_dist = list(
            all_drones.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        drone_status = [{"name": d["status"], "value": d["count"]} for d in drone_status_dist]

        # Battery distributions (current snapshot)
        all_batteries = DroneBattery.objects.filter(warehouse__organization=org_id)
        battery_health_dist = list(
            all_batteries.values("health_status")
            .annotate(count=Count("id"))
            .order_by("health_status")
        )
        battery_health = [{"name": d["health_status"], "value": d["count"]} for d in battery_health_dist]

        battery_status_dist = list(
            all_batteries.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        battery_status = [{"name": d["status"], "value": d["count"]} for d in battery_status_dist]

        # Telemetry analytics: per-drone aggregated stats from recent telemetry
        from apps.drones.models import DroneTelemetryLog

        telemetry_qs = DroneTelemetryLog.objects.filter(
            drone__in=drones_qs,
            timestamp__range=(date_from, date_to),
        )
        telemetry_agg = telemetry_qs.aggregate(
            avg_speed=Avg("ground_speed"),
            avg_altitude=Avg("position_z"),
            avg_battery=Avg("battery_percentage"),
        )
        # Per-drone performance (top 10 most active)
        per_drone_stats = list(
            telemetry_qs.values("drone__name", "drone__serial_number")
            .annotate(
                entries=Count("id"),
                avg_speed=Avg("ground_speed"),
                avg_altitude=Avg("position_z"),
                avg_battery=Avg("battery_percentage"),
            )
            .order_by("-entries")[:10]
        )
        drone_telemetry = [
            {
                "name": row["drone__name"],
                "serial": row["drone__serial_number"],
                "entries": row["entries"],
                "avg_speed": round(float(row["avg_speed"] or 0), 2),
                "avg_altitude": round(float(row["avg_altitude"] or 0), 1),
                "avg_battery": round(float(row["avg_battery"] or 0), 1),
            }
            for row in per_drone_stats
        ]

        return Response({
            "success": True,
            "data": {
                "meta": {
                    "date_from": date_from.date().isoformat(),
                    "date_to": date_to.date().isoformat(),
                },
                "kpis": {
                    "fleet_utilization": {"value": fleet_utilization, "change_percent": 0, "trend": "stable"},
                    "job_success_rate": _kpi(job_success_current, job_success_prev),
                    "avg_job_duration_minutes": _kpi(avg_duration_current, avg_duration_prev),
                    "battery_avg_charge": {"value": battery_avg_charge, "change_percent": 0, "trend": "stable"},
                    "batteries_needing_replacement": {"value": batteries_needing_replacement, "change_percent": 0, "trend": "stable"},
                    "total_flight_hours": {"value": total_flight_hours, "change_percent": 0, "trend": "stable"},
                    "avg_speed": {"value": round(float(telemetry_agg["avg_speed"] or 0), 2), "change_percent": 0, "trend": "stable"},
                    "avg_altitude": {"value": round(float(telemetry_agg["avg_altitude"] or 0), 1), "change_percent": 0, "trend": "stable"},
                },
                "jobs_over_time": jobs_over_time,
                "jobs_by_type": jobs_by_type,
                "drone_status": drone_status,
                "battery_health": battery_health,
                "battery_status": battery_status,
                "drone_telemetry": drone_telemetry,
            },
        })


class InventoryAnalyticsView(APIView):
    """
    Inventory analytics.

    GET /api/v1/dashboard/analytics/inventory/?range=30d
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.inventory.models import (
            InventoryItem,
            InventoryStock,
            StorageBin,
        )

        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        org_id = organization.id

        # --- KPIs ---
        items_qs = InventoryItem.objects.filter(organization=org_id, is_active=True)
        total_skus = items_qs.count()

        # Low stock: items where total stock < min_stock_level
        items_with_min = items_qs.filter(min_stock_level__gt=0).annotate(
            total_stock=Sum("stocks__quantity")
        )
        low_stock_count = items_with_min.filter(
            Q(total_stock__lt=F("min_stock_level")) | Q(total_stock__isnull=True)
        ).count()

        # Below reorder point
        items_with_reorder = items_qs.filter(reorder_point__gt=0).annotate(
            total_stock=Sum("stocks__quantity")
        )
        below_reorder_count = items_with_reorder.filter(
            Q(total_stock__lt=F("reorder_point")) | Q(total_stock__isnull=True)
        ).count()

        # Expiring soon (next 30 days)
        thirty_days = timezone.now().date() + timedelta(days=30)
        expiring_soon_count = (
            InventoryStock.objects.filter(
                item__organization=org_id,
                expiry_date__isnull=False,
                expiry_date__lte=thirty_days,
                expiry_date__gte=timezone.now().date(),
                quantity__gt=0,
            )
            .values("item")
            .distinct()
            .count()
        )

        # Storage utilization: full bins / total bins
        bins_qs = StorageBin.objects.filter(
            location__zone__warehouse__organization=org_id,
            is_active=True,
        )
        total_bins = bins_qs.count()
        full_bins = bins_qs.filter(is_full=True).count()
        storage_utilization = round((full_bins / total_bins * 100), 1) if total_bins else 0

        # --- Charts ---
        # Stock by category
        stock_by_category_qs = (
            items_qs.filter(category__isnull=False)
            .values("category__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        stock_by_category = [
            {"name": row["category__name"], "value": row["count"]}
            for row in stock_by_category_qs
        ]

        # Inventory summary
        items_with_stock = (
            items_qs.annotate(total_stock=Sum("stocks__quantity"))
            .filter(total_stock__gt=0)
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
                "kpis": {
                    "total_skus": {"value": total_skus, "change_percent": 0, "trend": "stable"},
                    "low_stock_count": {"value": low_stock_count, "change_percent": 0, "trend": "stable"},
                    "below_reorder_count": {"value": below_reorder_count, "change_percent": 0, "trend": "stable"},
                    "expiring_soon_count": {"value": expiring_soon_count, "change_percent": 0, "trend": "stable"},
                    "storage_utilization": {"value": storage_utilization, "change_percent": 0, "trend": "stable"},
                },
                "stock_by_category": stock_by_category,
                "inventory_summary": {
                    "total_items": total_skus,
                    "in_stock": items_with_stock,
                    "low_stock": low_stock_count,
                    "out_of_stock": out_of_stock,
                },
            },
        })


class OrganizationSettingsView(APIView):
    """
    Get or update organization settings.

    GET /api/v1/settings/
    PATCH /api/v1/settings/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"success": False, "message": "No organization found for this user"},
                status=status.HTTP_404_NOT_FOUND,
            )

        settings, _ = OrganizationSettings.objects.get_or_create(
            organization=organization
        )
        serializer = OrganizationSettingsSerializer(settings)
        return Response({"success": True, "data": serializer.data})

    def patch(self, request):
        if not request.user.is_manager():
            return Response(
                {"success": False, "message": "Admin or Manager access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"success": False, "message": "No organization found for this user"},
                status=status.HTTP_404_NOT_FOUND,
            )

        settings, _ = OrganizationSettings.objects.get_or_create(
            organization=organization
        )
        serializer = OrganizationSettingsSerializer(
            settings, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "data": serializer.data})


class OrganizationSettingsRegenerateWebhookView(APIView):
    """
    Regenerate the webhook secret.

    POST /api/v1/settings/regenerate-webhook-secret/
    """

    permission_classes = [IsAuthenticated, IsAdminOrManager]

    def post(self, request):
        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"success": False, "message": "No organization found for this user"},
                status=status.HTTP_404_NOT_FOUND,
            )

        settings, _ = OrganizationSettings.objects.get_or_create(
            organization=organization
        )
        settings.regenerate_webhook_secret()
        return Response({
            "success": True,
            "message": "Webhook secret regenerated successfully.",
        })


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


class ReferenceDataView(APIView):
    """
    Reference data for dropdowns (timezones, currencies).

    GET /api/v1/reference-data/
    Returns all valid timezones and currencies.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.core.choices import CURRENCY_CHOICES, get_all_timezones

        timezones = [
            {"value": tz, "label": tz.replace("_", " ")}
            for tz in get_all_timezones()
        ]
        currencies = [
            {"value": code, "label": f"{code} — {name}"}
            for code, name in CURRENCY_CHOICES
        ]

        return Response(
            {
                "success": True,
                "data": {
                    "timezones": timezones,
                    "currencies": currencies,
                },
            }
        )


# =============================================================================
# Membership Views
# =============================================================================


def get_user_membership(user):
    """Get the user's active membership with admin check info."""
    return (
        OrganizationMembership.objects.filter(user=user, is_active=True)
        .select_related("organization")
        .first()
    )


class MembershipListView(APIView):
    """
    List organization members.

    GET /api/v1/members/
    Supports search, is_active, membership_role, user_role filters.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = get_user_membership(request.user)
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        qs = (
            OrganizationMembership.objects.filter(
                organization=membership.organization
            )
            .select_related("user", "invited_by")
            .order_by("-joined_at")
        )

        # Filters
        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
            )

        is_active = request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        membership_role = request.query_params.get("membership_role")
        if membership_role:
            qs = qs.filter(membership_role=membership_role)

        user_role = request.query_params.get("user_role")
        if user_role:
            qs = qs.filter(user_role=user_role)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = MembershipListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class MembershipStatsView(APIView):
    """
    Get membership statistics.

    GET /api/v1/members/stats/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = get_user_membership(request.user)
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        org = membership.organization
        members_qs = OrganizationMembership.objects.filter(organization=org)

        total = members_qs.count()
        active = members_qs.filter(is_active=True).count()
        admin_count = members_qs.filter(
            is_active=True, membership_role__in=["OWNER", "ADMIN"]
        ).count()
        pending_invitations = OrganizationInvitation.objects.filter(
            organization=org,
            status=InvitationStatus.PENDING,
            expires_at__gt=timezone.now(),
        ).count()

        return Response({
            "success": True,
            "data": {
                "total_members": total,
                "active_count": active,
                "admin_count": admin_count,
                "pending_invitations": pending_invitations,
            },
        })


class MembershipDetailView(APIView):
    """
    Get or update a member.

    GET /api/v1/members/<pk>/
    PATCH /api/v1/members/<pk>/
    """

    permission_classes = [IsAuthenticated]

    def _get_target(self, request, pk):
        membership = get_user_membership(request.user)
        if not membership:
            return None, None, Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            target = (
                OrganizationMembership.objects.select_related("user", "invited_by")
                .get(pk=pk, organization=membership.organization)
            )
        except OrganizationMembership.DoesNotExist:
            return membership, None, Response(
                {"success": False, "message": "Member not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return membership, target, None

    def get(self, request, pk):
        membership, target, error = self._get_target(request, pk)
        if error:
            return error

        serializer = MembershipDetailSerializer(target)
        return Response({"success": True, "data": serializer.data})

    def patch(self, request, pk):
        membership, target, error = self._get_target(request, pk)
        if error:
            return error

        if not membership.is_admin:
            return Response(
                {"success": False, "message": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if target.is_owner:
            return Response(
                {"success": False, "message": "Cannot modify the owner's roles"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = MembershipUpdateSerializer(target, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        detail = MembershipDetailSerializer(target)
        return Response({"success": True, "data": detail.data})


class MembershipDeactivateView(APIView):
    """
    Deactivate a member.

    POST /api/v1/members/<pk>/deactivate/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        membership = get_user_membership(request.user)
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not membership.is_admin:
            return Response(
                {"success": False, "message": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            target = OrganizationMembership.objects.get(
                pk=pk, organization=membership.organization
            )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {"success": False, "message": "Member not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if target.pk == membership.pk:
            return Response(
                {"success": False, "message": "Cannot deactivate yourself"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target.is_owner:
            return Response(
                {"success": False, "message": "Cannot deactivate the owner"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target.deactivate()
        return Response({"success": True, "message": "Member deactivated successfully"})


class MembershipActivateView(APIView):
    """
    Activate a member.

    POST /api/v1/members/<pk>/activate/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        membership = get_user_membership(request.user)
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not membership.is_admin:
            return Response(
                {"success": False, "message": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            target = OrganizationMembership.objects.get(
                pk=pk, organization=membership.organization
            )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {"success": False, "message": "Member not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        target.activate()
        return Response({"success": True, "message": "Member activated successfully"})


class TransferOwnershipView(APIView):
    """
    Transfer organization ownership.

    POST /api/v1/members/transfer-ownership/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        membership = get_user_membership(request.user)
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not membership.is_owner:
            return Response(
                {"success": False, "message": "Only the owner can transfer ownership"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TransferOwnershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            new_owner = OrganizationMembership.objects.get(
                pk=serializer.validated_data["new_owner_membership_id"],
                organization=membership.organization,
                is_active=True,
            )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {"success": False, "message": "Target member not found or inactive"},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            membership.transfer_ownership(new_owner)

        return Response({
            "success": True,
            "message": f"Ownership transferred to {new_owner.user.get_full_name()}",
        })


# =============================================================================
# Invitation Views
# =============================================================================


class InvitationListCreateView(APIView):
    """
    List or create invitations.

    GET /api/v1/invitations/
    POST /api/v1/invitations/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = get_user_membership(request.user)
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        qs = (
            OrganizationInvitation.objects.filter(
                organization=membership.organization
            )
            .select_related("invited_by")
            .order_by("-created_at")
        )

        inv_status = request.query_params.get("status")
        if inv_status:
            qs = qs.filter(status=inv_status)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = InvitationListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = get_user_membership(request.user)
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not membership.is_admin:
            return Response(
                {"success": False, "message": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = InvitationCreateSerializer(
            data=request.data,
            context={"organization": membership.organization},
        )
        serializer.is_valid(raise_exception=True)

        invitation = OrganizationInvitation(
            organization=membership.organization,
            invited_by=request.user,
            **serializer.validated_data,
        )
        invitation.save()

        result = InvitationListSerializer(invitation)
        return Response(
            {"success": True, "data": result.data},
            status=status.HTTP_201_CREATED,
        )


class InvitationResendView(APIView):
    """
    Resend an invitation.

    POST /api/v1/invitations/<pk>/resend/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        membership = get_user_membership(request.user)
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not membership.is_admin:
            return Response(
                {"success": False, "message": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            invitation = OrganizationInvitation.objects.get(
                pk=pk, organization=membership.organization
            )
        except OrganizationInvitation.DoesNotExist:
            return Response(
                {"success": False, "message": "Invitation not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            invitation.resend()
        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"success": True, "message": "Invitation resent successfully"})


class InvitationRevokeView(APIView):
    """
    Revoke an invitation.

    POST /api/v1/invitations/<pk>/revoke/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        membership = get_user_membership(request.user)
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not membership.is_admin:
            return Response(
                {"success": False, "message": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            invitation = OrganizationInvitation.objects.get(
                pk=pk, organization=membership.organization
            )
        except OrganizationInvitation.DoesNotExist:
            return Response(
                {"success": False, "message": "Invitation not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            invitation.revoke()
        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"success": True, "message": "Invitation revoked successfully"})


# =============================================================================
# Billing / Payment Views
# =============================================================================


class CreateCheckoutView(APIView):
    """
    Create a Razorpay subscription and return checkout details.

    POST /api/v1/billing/checkout/
    Body: { plan_id: int, billing_cycle: "MONTHLY" | "ANNUAL" }
    Returns: { subscription_id: str, razorpay_key_id: str }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.conf import settings as django_settings

        from apps.organizations.payment import RazorpayService

        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan_id = serializer.validated_data["plan_id"]
        billing_cycle = serializer.validated_data["billing_cycle"]

        # Get user's organization
        membership = (
            OrganizationMembership.objects.filter(user=request.user, is_active=True)
            .select_related("organization")
            .first()
        )
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        org = membership.organization

        # Check for existing active subscription with Razorpay
        existing_sub = Subscription.objects.filter(
            organization=org,
            status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        ).first()
        if existing_sub and existing_sub.external_subscription_id:
            return Response(
                {"success": False, "message": "Organization already has an active payment subscription. Use upgrade instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Hard-delete any existing subscription without a Razorpay ID (e.g. seeded data)
        # to free up the unique constraint on organization_id
        # Use raw SQL because safedelete's force_policy doesn't reliably hard-delete
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM organizations_subscription WHERE organization_id = %s AND (external_subscription_id = '' OR external_subscription_id IS NULL)",
                [org.id],
            )

        # Validate plan
        try:
            plan = Plan.objects.get(id=plan_id, is_active=True)
        except Plan.DoesNotExist:
            return Response(
                {"success": False, "message": "Plan not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if plan.is_free:
            return Response(
                {"success": False, "message": "Cannot create a checkout for a free plan"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create Razorpay subscription
        try:
            service = RazorpayService()
            customer_id = service.get_or_create_customer(request.user)
            rzp_sub = service.create_subscription(plan, billing_cycle, customer_id, org.id)
        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"Payment gateway error: {e}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Create local subscription record (status will be updated by webhook)
        now = timezone.now()
        amount = plan.annual_price if billing_cycle == BillingCycle.ANNUAL else plan.monthly_price
        period_end = now + timedelta(days=365 if billing_cycle == BillingCycle.ANNUAL else 30)

        with transaction.atomic():
            subscription = Subscription.objects.create(
                organization=org,
                plan=plan,
                status=SubscriptionStatus.TRIALING,
                billing_cycle=billing_cycle,
                amount=amount,
                currency="INR",
                started_at=now,
                current_period_start=now,
                current_period_end=period_end,
                external_subscription_id=rzp_sub["id"],
                external_customer_id=customer_id,
                metadata={"razorpay_short_url": rzp_sub.get("short_url", "")},
            )
            # Update org plan using queryset update to avoid simple-history signal
            Organization.objects.filter(pk=org.pk).update(plan=plan)

        return Response({
            "success": True,
            "data": {
                "subscription_id": rzp_sub["id"],
                "razorpay_key_id": django_settings.RAZORPAY_KEY_ID,
            },
        })


class CancelSubscriptionView(APIView):
    """
    Cancel the current subscription.

    POST /api/v1/billing/cancel/
    Body: { cancel_immediately: bool }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.organizations.payment import RazorpayService

        serializer = CancelSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cancel_immediately = serializer.validated_data["cancel_immediately"]

        # Get user's organization subscription
        membership = (
            OrganizationMembership.objects.filter(user=request.user, is_active=True)
            .select_related("organization")
            .first()
        )
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            subscription = Subscription.objects.select_related("plan").get(
                organization=membership.organization,
                status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
            )
        except Subscription.DoesNotExist:
            return Response(
                {"success": False, "message": "No active subscription found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Cancel on Razorpay
        if subscription.external_subscription_id:
            try:
                service = RazorpayService()
                service.cancel_subscription(
                    subscription.external_subscription_id,
                    at_period_end=not cancel_immediately,
                )
            except Exception as e:
                return Response(
                    {"success": False, "message": f"Payment gateway error: {e}"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        # Update local subscription
        subscription.cancel(immediately=cancel_immediately)

        return Response({
            "success": True,
            "data": SubscriptionSerializer(subscription).data,
        })


class UpgradePlanView(APIView):
    """
    Upgrade or downgrade the subscription plan.

    POST /api/v1/billing/upgrade/
    Body: { plan_id: int, billing_cycle: "MONTHLY" | "ANNUAL" }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.organizations.payment import RazorpayService

        serializer = UpgradePlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan_id = serializer.validated_data["plan_id"]
        billing_cycle = serializer.validated_data["billing_cycle"]

        # Get user's organization subscription
        membership = (
            OrganizationMembership.objects.filter(user=request.user, is_active=True)
            .select_related("organization")
            .first()
        )
        if not membership:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            subscription = Subscription.objects.select_related("plan").get(
                organization=membership.organization,
                status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
            )
        except Subscription.DoesNotExist:
            return Response(
                {"success": False, "message": "No active subscription found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate new plan
        try:
            new_plan = Plan.objects.get(id=plan_id, is_active=True)
        except Plan.DoesNotExist:
            return Response(
                {"success": False, "message": "Plan not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if new_plan.is_free:
            return Response(
                {"success": False, "message": "Cannot upgrade to a free plan. Cancel your subscription instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_plan.id == subscription.plan_id and billing_cycle == subscription.billing_cycle:
            return Response(
                {"success": False, "message": "Already on this plan and billing cycle"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Require Razorpay subscription to upgrade — if none exists,
        # the user must go through checkout to create one first
        if not subscription.external_subscription_id:
            return Response(
                {
                    "success": False,
                    "message": "No payment subscription found. Please subscribe through checkout first.",
                    "requires_checkout": True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check Razorpay subscription state before attempting update
        service = RazorpayService()
        try:
            rz_sub = service.fetch_subscription(subscription.external_subscription_id)
        except Exception as e:
            return Response(
                {"success": False, "message": f"Payment gateway error: {e}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        rz_status = rz_sub.get("status", "")

        # Only active/authenticated subscriptions can be updated on Razorpay
        if rz_status not in ("active", "authenticated"):
            # Cancel the incomplete subscription on Razorpay if possible
            if rz_status == "created":
                try:
                    service.cancel_subscription(subscription.external_subscription_id, at_period_end=False)
                except Exception:
                    pass
            # Clear local subscription so user goes through checkout
            subscription.external_subscription_id = ""
            subscription.save(update_fields=["external_subscription_id"])
            return Response(
                {
                    "success": False,
                    "message": "Your previous payment was not completed. Please subscribe again.",
                    "requires_checkout": True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            service.update_subscription_plan(
                subscription.external_subscription_id,
                new_plan,
                billing_cycle,
            )
        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"Payment gateway error: {e}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Update local subscription
        new_amount = new_plan.annual_price if billing_cycle == BillingCycle.ANNUAL else new_plan.monthly_price
        with transaction.atomic():
            subscription.plan = new_plan
            subscription.billing_cycle = billing_cycle
            subscription.amount = new_amount
            subscription.save(update_fields=["plan", "billing_cycle", "amount"])

            # Update org plan using queryset update to avoid simple-history signal
            # (HistoricalOrganization conflicts with modeltranslation fields)
            Organization.objects.filter(pk=membership.organization_id).update(plan=new_plan)

        # Refetch for serialization
        subscription.refresh_from_db()

        return Response({
            "success": True,
            "data": SubscriptionSerializer(subscription).data,
        })

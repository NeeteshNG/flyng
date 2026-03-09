"""
Battery Views

API views for drone batteries, charging sessions, and swap records.
"""

from django.db.models import Count
from django_filters import rest_framework as django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.choices import ActivityAction
from apps.core.mixins import ActivityLoggingMixin
from apps.core.permissions import HasPermission

from .models import BatteryChargingSession, BatterySwapRecord, DroneBattery
from .serializers import (
    BatteryChargingSessionCreateSerializer,
    BatteryChargingSessionDetailSerializer,
    BatteryChargingSessionListSerializer,
    BatterySwapRecordCreateSerializer,
    BatterySwapRecordDetailSerializer,
    BatterySwapRecordListSerializer,
    DroneBatteryCreateUpdateSerializer,
    DroneBatteryDetailSerializer,
    DroneBatteryListSerializer,
)


# =============================================================================
# DroneBattery ViewSet
# =============================================================================


class DroneBatteryFilter(django_filters.FilterSet):
    """Filter for batteries."""

    warehouse = django_filters.NumberFilter(field_name="warehouse")
    status = django_filters.CharFilter(field_name="status")
    health_status = django_filters.CharFilter(field_name="health_status")
    chemistry = django_filters.CharFilter(field_name="chemistry")
    is_active = django_filters.BooleanFilter(field_name="is_active")
    manufacturer = django_filters.CharFilter(field_name="manufacturer")
    low_charge = django_filters.BooleanFilter(method="filter_low_charge")
    needs_replacement = django_filters.BooleanFilter(method="filter_needs_replacement")

    class Meta:
        model = DroneBattery
        fields = [
            "warehouse",
            "status",
            "health_status",
            "chemistry",
            "is_active",
            "manufacturer",
        ]

    def filter_low_charge(self, queryset, name, value):
        if value:
            return queryset.filter(current_charge_percent__lt=20)
        return queryset

    def filter_needs_replacement(self, queryset, name, value):
        if value:
            from django.db.models import Q

            return queryset.filter(
                Q(health_status__in=["POOR", "REPLACE"])
                | Q(status="FAULTY")
            )
        return queryset


class DroneBatteryViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for drone batteries.

    list: Get all batteries
    create: Register a new battery
    retrieve: Get a battery by UUID
    update: Update a battery
    partial_update: Partially update a battery
    destroy: Deactivate a battery (soft delete)
    """

    permission_classes = [IsAuthenticated, HasPermission]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = DroneBatteryFilter
    search_fields = ["name", "serial_number", "manufacturer", "model_number"]
    ordering_fields = [
        "name",
        "serial_number",
        "status",
        "health_status",
        "current_charge_percent",
        "cycle_count",
        "created_at",
    ]
    ordering = ["name"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return batteries with related data and counts."""
        return (
            DroneBattery.objects.select_related("warehouse")
            .annotate(
                charging_sessions_count=Count("charging_sessions"),
                swaps_count=Count("swaps_installed"),
            )
            .order_by("name")
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return DroneBatteryListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return DroneBatteryCreateUpdateSerializer
        return DroneBatteryDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        self.log_activity(ActivityAction.DELETE, instance, "Deactivated battery")
        return Response(
            {"success": True, "message": "Battery deactivated successfully"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def charging_history(self, request, uuid=None):
        """Get charging history for a specific battery."""
        battery = self.get_object()
        sessions = BatteryChargingSession.objects.filter(battery=battery).order_by(
            "-started_at"
        )[:50]
        serializer = BatteryChargingSessionListSerializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def swap_history(self, request, uuid=None):
        """Get swap history for a specific battery."""
        battery = self.get_object()
        swaps = BatterySwapRecord.objects.filter(
            old_battery=battery
        ) | BatterySwapRecord.objects.filter(new_battery=battery)
        swaps = swaps.order_by("-swapped_at")[:50]
        serializer = BatterySwapRecordListSerializer(swaps, many=True)
        return Response(serializer.data)


# =============================================================================
# BatteryChargingSession ViewSet
# =============================================================================


class BatteryChargingSessionFilter(django_filters.FilterSet):
    """Filter for charging sessions."""

    battery = django_filters.NumberFilter(field_name="battery")
    status = django_filters.CharFilter(field_name="status")
    started_after = django_filters.DateTimeFilter(
        field_name="started_at", lookup_expr="gte"
    )
    started_before = django_filters.DateTimeFilter(
        field_name="started_at", lookup_expr="lte"
    )

    class Meta:
        model = BatteryChargingSession
        fields = ["battery", "status", "started_after", "started_before"]


class BatteryChargingSessionViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for battery charging sessions.

    list: Get charging sessions
    create: Record a new charging session
    retrieve: Get a specific charging session

    Charging sessions are append-only (no update/delete).
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = BatteryChargingSessionFilter
    search_fields = ["battery__name", "battery__serial_number", "charger_id"]
    ordering_fields = ["started_at", "status", "start_charge_percent"]
    ordering = ["-started_at"]
    lookup_field = "uuid"
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        """Return charging sessions with battery info."""
        return BatteryChargingSession.objects.select_related(
            "battery", "battery__warehouse"
        ).order_by("-started_at")

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return BatteryChargingSessionListSerializer
        elif self.action == "create":
            return BatteryChargingSessionCreateSerializer
        return BatteryChargingSessionDetailSerializer


# =============================================================================
# BatterySwapRecord ViewSet
# =============================================================================


class BatterySwapRecordFilter(django_filters.FilterSet):
    """Filter for swap records."""

    drone = django_filters.NumberFilter(field_name="drone")
    old_battery = django_filters.NumberFilter(field_name="old_battery")
    new_battery = django_filters.NumberFilter(field_name="new_battery")
    swap_reason = django_filters.CharFilter(field_name="swap_reason")
    swapped_after = django_filters.DateTimeFilter(
        field_name="swapped_at", lookup_expr="gte"
    )
    swapped_before = django_filters.DateTimeFilter(
        field_name="swapped_at", lookup_expr="lte"
    )

    class Meta:
        model = BatterySwapRecord
        fields = [
            "drone",
            "old_battery",
            "new_battery",
            "swap_reason",
            "swapped_after",
            "swapped_before",
        ]


class BatterySwapRecordViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for battery swap records.

    list: Get swap records
    create: Record a new battery swap
    retrieve: Get a specific swap record

    Swap records are append-only (no update/delete).
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = BatterySwapRecordFilter
    search_fields = [
        "drone__name",
        "drone__serial_number",
        "old_battery__serial_number",
        "new_battery__serial_number",
    ]
    ordering_fields = ["swapped_at", "swap_reason"]
    ordering = ["-swapped_at"]
    lookup_field = "uuid"
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        """Return swap records with related data."""
        return BatterySwapRecord.objects.select_related(
            "drone",
            "old_battery",
            "new_battery",
            "performed_by",
        ).order_by("-swapped_at")

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return BatterySwapRecordListSerializer
        elif self.action == "create":
            return BatterySwapRecordCreateSerializer
        return BatterySwapRecordDetailSerializer

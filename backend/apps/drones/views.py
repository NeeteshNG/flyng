"""
Drone Views

API views for drones, telemetry logs, and maintenance records.
"""

from django.db.models import Count
from django_filters import rest_framework as django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdminOrManagerOrReadOnly

from .models import Drone, DroneMaintenanceRecord, DroneTelemetryLog
from .serializers import (
    DroneCreateUpdateSerializer,
    DroneDetailSerializer,
    DroneListSerializer,
    DroneMaintenanceRecordCreateUpdateSerializer,
    DroneMaintenanceRecordDetailSerializer,
    DroneMaintenanceRecordListSerializer,
    DroneTelemetryLogCreateSerializer,
    DroneTelemetryLogDetailSerializer,
    DroneTelemetryLogListSerializer,
)


# =============================================================================
# Drone ViewSet
# =============================================================================


class DroneFilter(django_filters.FilterSet):
    """Filter for drones."""

    work_area = django_filters.NumberFilter(field_name="work_area")
    gcs = django_filters.NumberFilter(field_name="work_area__ground_control_station")
    zone = django_filters.NumberFilter(
        field_name="work_area__ground_control_station__zone"
    )
    warehouse = django_filters.NumberFilter(
        field_name="work_area__ground_control_station__zone__warehouse"
    )
    status = django_filters.CharFilter(field_name="status")
    autonomy_mode = django_filters.NumberFilter(field_name="autonomy_mode")
    is_active = django_filters.BooleanFilter(field_name="is_active")
    manufacturer = django_filters.CharFilter(field_name="manufacturer")

    class Meta:
        model = Drone
        fields = [
            "work_area",
            "gcs",
            "zone",
            "warehouse",
            "status",
            "autonomy_mode",
            "is_active",
            "manufacturer",
        ]


class DroneViewSet(viewsets.ModelViewSet):
    """
    ViewSet for drones.

    list: Get all drones
    create: Register a new drone
    retrieve: Get a drone by UUID
    update: Update a drone
    partial_update: Partially update a drone
    destroy: Deactivate a drone
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = DroneFilter
    search_fields = ["name", "serial_number", "model", "manufacturer", "ip_address"]
    ordering_fields = [
        "name",
        "serial_number",
        "status",
        "total_flight_hours",
        "total_flights",
        "last_heartbeat",
        "created_at",
    ]
    ordering = ["name"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return drones with related data and maintenance count."""
        return (
            Drone.objects.select_related(
                "work_area",
                "work_area__ground_control_station",
                "work_area__ground_control_station__zone",
                "work_area__ground_control_station__zone__warehouse",
                "current_battery",
            )
            .annotate(
                maintenance_count=Count("maintenance_records"),
            )
            .order_by("name")
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return DroneListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return DroneCreateUpdateSerializer
        return DroneDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        return Response(
            {"success": True, "message": "Drone deactivated successfully"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def telemetry(self, request, uuid=None):
        """Get recent telemetry for a specific drone."""
        drone = self.get_object()
        logs = DroneTelemetryLog.objects.filter(drone=drone).order_by("-timestamp")[:50]
        serializer = DroneTelemetryLogListSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def maintenance(self, request, uuid=None):
        """Get maintenance records for a specific drone."""
        drone = self.get_object()
        records = DroneMaintenanceRecord.objects.filter(drone=drone).order_by(
            "-created_at"
        )[:20]
        serializer = DroneMaintenanceRecordListSerializer(records, many=True)
        return Response(serializer.data)


# =============================================================================
# Telemetry Log ViewSet
# =============================================================================


class DroneTelemetryLogFilter(django_filters.FilterSet):
    """Filter for telemetry logs."""

    drone = django_filters.NumberFilter(field_name="drone")
    flight_mode = django_filters.CharFilter(field_name="flight_mode")
    timestamp_after = django_filters.DateTimeFilter(
        field_name="timestamp", lookup_expr="gte"
    )
    timestamp_before = django_filters.DateTimeFilter(
        field_name="timestamp", lookup_expr="lte"
    )

    class Meta:
        model = DroneTelemetryLog
        fields = ["drone", "flight_mode", "timestamp_after", "timestamp_before"]


class DroneTelemetryLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for drone telemetry logs.

    list: Get telemetry logs
    create: Record new telemetry data
    retrieve: Get a specific telemetry record

    Telemetry records are append-only (no update/delete).
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = DroneTelemetryLogFilter
    search_fields = ["drone__name", "drone__serial_number"]
    ordering_fields = ["timestamp", "battery_percentage", "ground_speed"]
    ordering = ["-timestamp"]
    lookup_field = "uuid"
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        """Return telemetry logs with drone info."""
        return DroneTelemetryLog.objects.select_related("drone").order_by("-timestamp")

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return DroneTelemetryLogListSerializer
        elif self.action == "create":
            return DroneTelemetryLogCreateSerializer
        return DroneTelemetryLogDetailSerializer


# =============================================================================
# Maintenance Record ViewSet
# =============================================================================


class DroneMaintenanceRecordFilter(django_filters.FilterSet):
    """Filter for maintenance records."""

    drone = django_filters.NumberFilter(field_name="drone")
    maintenance_type = django_filters.CharFilter(field_name="maintenance_type")
    performed_by = django_filters.NumberFilter(field_name="performed_by")
    is_completed = django_filters.BooleanFilter(
        field_name="completed_at", lookup_expr="isnull", exclude=True
    )

    class Meta:
        model = DroneMaintenanceRecord
        fields = ["drone", "maintenance_type", "performed_by", "is_completed"]


class DroneMaintenanceRecordViewSet(viewsets.ModelViewSet):
    """
    ViewSet for drone maintenance records.

    list: Get maintenance records
    create: Create a new maintenance record
    retrieve: Get a specific maintenance record
    update: Update a maintenance record (only if not completed)
    partial_update: Partially update a maintenance record
    destroy: Not allowed (records are immutable)
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = DroneMaintenanceRecordFilter
    search_fields = [
        "drone__name",
        "drone__serial_number",
        "title",
        "description",
    ]
    ordering_fields = [
        "created_at",
        "scheduled_at",
        "completed_at",
        "maintenance_type",
        "cost",
    ]
    ordering = ["-created_at"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return maintenance records with related data."""
        return DroneMaintenanceRecord.objects.select_related(
            "drone",
            "performed_by",
        ).order_by("-created_at")

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return DroneMaintenanceRecordListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return DroneMaintenanceRecordCreateUpdateSerializer
        return DroneMaintenanceRecordDetailSerializer

    def update(self, request, *args, **kwargs):
        """Only allow updates on incomplete records."""
        instance = self.get_object()
        if instance.completed_at:
            return Response(
                {"error": "Completed maintenance records cannot be modified."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Maintenance records are immutable."""
        return Response(
            {"error": "Maintenance records cannot be deleted."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=["post"])
    def complete(self, request, uuid=None):
        """Mark a maintenance record as completed."""
        from django.utils import timezone

        record = self.get_object()
        if record.completed_at:
            return Response(
                {"error": "Record is already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        record.completed_at = timezone.now()
        if not record.started_at:
            record.started_at = record.completed_at

        # Calculate downtime
        if record.started_at:
            delta = record.completed_at - record.started_at
            record.downtime_minutes = int(delta.total_seconds() / 60)

        # Capture drone stats at maintenance time
        record.flight_hours_at_maintenance = record.drone.total_flight_hours
        record.flights_at_maintenance = record.drone.total_flights

        record.save()

        # Update drone maintenance tracking
        drone = record.drone
        drone.last_maintenance_at = record.completed_at
        drone.save(update_fields=["last_maintenance_at", "updated_at"])

        serializer = DroneMaintenanceRecordDetailSerializer(record)
        return Response(serializer.data)

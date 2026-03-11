"""
Drone Views

API views for drones, telemetry logs, and maintenance records.
"""

from django.db.models import Avg, Count, OuterRef, Q, Subquery
from django_filters import rest_framework as django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.choices import ActivityAction, DroneStatus, JobStatus
from apps.core.mixins import ActivityLoggingMixin
from apps.core.permissions import HasPermission
from apps.jobs.models import DroneJob

from .models import Drone, DroneMaintenanceRecord, DroneTelemetryLog
from .serializers import (
    DroneCreateUpdateSerializer,
    DroneDetailSerializer,
    DroneListSerializer,
    DroneMaintenanceRecordCreateUpdateSerializer,
    DroneMaintenanceRecordDetailSerializer,
    DroneMaintenanceRecordListSerializer,
    DronePositionSerializer,
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


class DroneViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for drones.

    list: Get all drones
    create: Register a new drone
    retrieve: Get a drone by UUID
    update: Update a drone
    partial_update: Partially update a drone
    destroy: Deactivate a drone
    """

    permission_classes = [IsAuthenticated, HasPermission]
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
        self.log_activity(ActivityAction.DELETE, instance, "Deactivated drone")
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


class DroneTelemetryLogViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
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


class DroneMaintenanceRecordViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for drone maintenance records.

    list: Get maintenance records
    create: Create a new maintenance record
    retrieve: Get a specific maintenance record
    update: Update a maintenance record (only if not completed)
    partial_update: Partially update a maintenance record
    destroy: Not allowed (records are immutable)
    """

    permission_classes = [IsAuthenticated, HasPermission]
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

        self.log_activity(ActivityAction.UPDATE, record, "Completed maintenance record")
        serializer = DroneMaintenanceRecordDetailSerializer(record)
        return Response(serializer.data)


# =============================================================================
# Fleet Live Tracking Views
# =============================================================================

ACTIVE_JOB_STATUSES = [
    JobStatus.NEW,
    JobStatus.QUEUED,
    JobStatus.ASSIGNED,
    JobStatus.IN_PROGRESS,
    JobStatus.PAUSED,
]


def _get_fleet_queryset():
    """Build annotated queryset with latest telemetry + active job per drone."""
    # Latest telemetry per drone via correlated subquery
    latest_telemetry = DroneTelemetryLog.objects.filter(
        drone=OuterRef("pk")
    ).order_by("-timestamp")

    # Active job per drone (most recent active job)
    active_job = DroneJob.objects.filter(
        drone=OuterRef("pk"),
        status__in=ACTIVE_JOB_STATUSES,
    ).order_by("-created_at")

    return (
        Drone.objects.filter(is_active=True)
        .select_related(
            "work_area",
            "work_area__ground_control_station",
            "work_area__ground_control_station__zone",
            "work_area__ground_control_station__zone__warehouse",
        )
        .annotate(
            # Latest telemetry fields
            position_x=Subquery(latest_telemetry.values("position_x")[:1]),
            position_y=Subquery(latest_telemetry.values("position_y")[:1]),
            position_z=Subquery(latest_telemetry.values("position_z")[:1]),
            battery_percentage=Subquery(latest_telemetry.values("battery_percentage")[:1]),
            ground_speed=Subquery(latest_telemetry.values("ground_speed")[:1]),
            flight_mode=Subquery(latest_telemetry.values("flight_mode")[:1]),
            rssi=Subquery(latest_telemetry.values("rssi")[:1]),
            last_telemetry_at=Subquery(latest_telemetry.values("timestamp")[:1]),
            # Active job fields
            active_job_id=Subquery(active_job.values("id")[:1]),
            active_job_number=Subquery(active_job.values("job_number")[:1]),
            active_job_type=Subquery(active_job.values("job_type")[:1]),
            active_job_status=Subquery(active_job.values("status")[:1]),
        )
    )


class FleetPositionsView(APIView):
    """
    GET /fleet/positions/

    Returns all active drones with their latest telemetry data and active job.
    No pagination — fleet size is typically small (<100 drones).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _get_fleet_queryset()

        # Filters
        warehouse = request.query_params.get("warehouse")
        if warehouse:
            qs = qs.filter(
                work_area__ground_control_station__zone__warehouse_id=warehouse
            )

        zone = request.query_params.get("zone")
        if zone:
            qs = qs.filter(work_area__ground_control_station__zone_id=zone)

        drone_status = request.query_params.get("status")
        if drone_status:
            qs = qs.filter(status=drone_status)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(serial_number__icontains=search))

        qs = qs.order_by("name")
        serializer = DronePositionSerializer(qs, many=True)
        return Response(serializer.data)


class FleetStatsView(APIView):
    """
    GET /fleet/stats/

    Returns fleet summary statistics.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        drones = Drone.objects.filter(is_active=True)

        # Status counts
        total = drones.count()
        status_counts = {}
        for choice in DroneStatus:
            status_counts[choice.value.lower()] = drones.filter(status=choice.value).count()

        # Average battery from latest telemetry
        latest_telemetry = DroneTelemetryLog.objects.filter(
            drone=OuterRef("pk")
        ).order_by("-timestamp")

        avg_battery = (
            drones.annotate(
                latest_battery=Subquery(latest_telemetry.values("battery_percentage")[:1])
            )
            .aggregate(avg=Avg("latest_battery"))
            .get("avg")
        )

        # Drones with active jobs
        with_active_jobs = drones.filter(
            jobs__status__in=ACTIVE_JOB_STATUSES
        ).distinct().count()

        return Response({
            "total_drones": total,
            **status_counts,
            "avg_battery": round(avg_battery, 1) if avg_battery else None,
            "with_active_jobs": with_active_jobs,
        })

"""
Jobs Views

API views for drone jobs and job events.
"""

from django.db.models import Avg, Count, F, Q
from django.utils import timezone
from django_filters import rest_framework as django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.choices import ActivityAction, JobStatus
from apps.core.mixins import ActivityLoggingMixin
from apps.core.permissions import HasPermission

from .models import DroneJob, DroneJobEvent
from .serializers import (
    DroneJobCreateUpdateSerializer,
    DroneJobDetailSerializer,
    DroneJobEventDetailSerializer,
    DroneJobEventListSerializer,
    DroneJobListSerializer,
)


# =============================================================================
# DroneJob ViewSet
# =============================================================================


class DroneJobFilter(django_filters.FilterSet):
    """Filter for drone jobs."""

    organization = django_filters.NumberFilter(field_name="organization")
    warehouse = django_filters.NumberFilter(field_name="warehouse")
    drone = django_filters.NumberFilter(field_name="drone")
    order = django_filters.NumberFilter(field_name="order")
    status = django_filters.CharFilter(field_name="status")
    job_type = django_filters.CharFilter(field_name="job_type")
    priority = django_filters.CharFilter(field_name="priority")
    is_active = django_filters.BooleanFilter(method="filter_is_active")
    created_after = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="gte"
    )
    created_before = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="lte"
    )

    class Meta:
        model = DroneJob
        fields = [
            "organization",
            "warehouse",
            "drone",
            "order",
            "status",
            "job_type",
            "priority",
        ]

    def filter_is_active(self, queryset, name, value):
        if value:
            return queryset.filter(
                status__in=["NEW", "QUEUED", "ASSIGNED", "IN_PROGRESS", "PAUSED"]
            )
        return queryset.filter(
            status__in=["COMPLETED", "FAILED", "CANCELLED"]
        )


class DroneJobViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for drone jobs.

    list: Get all jobs
    create: Create a new job
    retrieve: Get a job by UUID
    update: Update a job
    partial_update: Partially update a job
    destroy: Cancel a job (soft cancel)
    """

    permission_classes = [IsAuthenticated, HasPermission]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = DroneJobFilter
    search_fields = [
        "job_number",
        "drone__name",
        "drone__serial_number",
        "item__name",
        "item__sku",
        "order__order_number",
    ]
    ordering_fields = [
        "job_number",
        "status",
        "job_type",
        "priority",
        "created_at",
        "started_at",
        "completed_at",
    ]
    ordering = ["-created_at"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return jobs with related data and event counts."""
        return (
            DroneJob.objects.select_related(
                "organization",
                "warehouse",
                "drone",
                "order",
                "order_line",
                "item",
                "source_bin",
                "destination_bin",
            )
            .annotate(
                events_count=Count("events"),
            )
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return DroneJobListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return DroneJobCreateUpdateSerializer
        return DroneJobDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """Cancel a job instead of deleting."""
        instance = self.get_object()
        success = instance.cancel(reason="Cancelled via API")
        if not success:
            return Response(
                {"error": "Job cannot be cancelled in its current state."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.log_activity(ActivityAction.DELETE, instance, "Cancelled job")
        return Response(
            {"success": True, "message": "Job cancelled successfully"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def events(self, request, uuid=None):
        """Get events for a specific job."""
        job = self.get_object()
        events = DroneJobEvent.objects.filter(job=job).select_related(
            "drone"
        ).order_by("-created_at")[:50]
        serializer = DroneJobEventListSerializer(events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def queue(self, request, uuid=None):
        """Queue a new job."""
        job = self.get_object()
        success = job.queue()
        if not success:
            return Response(
                {"error": "Job can only be queued from NEW status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.log_activity(ActivityAction.UPDATE, job, "Queued job")
        serializer = DroneJobDetailSerializer(
            self.get_queryset().get(pk=job.pk)
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def assign(self, request, uuid=None):
        """Assign a job to a drone."""
        job = self.get_object()
        drone_id = request.data.get("drone")
        if not drone_id:
            return Response(
                {"error": "Drone ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from apps.drones.models import Drone

        try:
            drone = Drone.objects.get(pk=drone_id)
        except Drone.DoesNotExist:
            return Response(
                {"error": "Drone not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        success = job.assign(drone)
        if not success:
            return Response(
                {"error": "Job can only be assigned from QUEUED status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.log_activity(ActivityAction.UPDATE, job, f"Assigned job to drone {drone.name}")
        serializer = DroneJobDetailSerializer(
            self.get_queryset().get(pk=job.pk)
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start(self, request, uuid=None):
        """Start job execution."""
        job = self.get_object()
        success = job.start()
        if not success:
            return Response(
                {"error": "Job can only be started from ASSIGNED status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.log_activity(ActivityAction.UPDATE, job, "Started job")
        serializer = DroneJobDetailSerializer(
            self.get_queryset().get(pk=job.pk)
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def complete(self, request, uuid=None):
        """Complete a job."""
        job = self.get_object()
        picked_quantity = request.data.get("picked_quantity")
        success = job.complete(
            picked_quantity=int(picked_quantity) if picked_quantity else None
        )
        if not success:
            return Response(
                {"error": "Job can only be completed from IN_PROGRESS status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.log_activity(ActivityAction.UPDATE, job, "Completed job")
        serializer = DroneJobDetailSerializer(
            self.get_queryset().get(pk=job.pk)
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def fail(self, request, uuid=None):
        """Mark a job as failed."""
        job = self.get_object()
        error_code = request.data.get("error_code", "")
        error_message = request.data.get("error_message", "")
        success = job.fail(error_code=error_code, error_message=error_message)
        if not success:
            return Response(
                {"error": "Job can only fail from ASSIGNED or IN_PROGRESS status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.log_activity(ActivityAction.UPDATE, job, "Job failed")
        serializer = DroneJobDetailSerializer(
            self.get_queryset().get(pk=job.pk)
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def pause(self, request, uuid=None):
        """Pause a job."""
        job = self.get_object()
        success = job.pause()
        if not success:
            return Response(
                {"error": "Job can only be paused from IN_PROGRESS status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.log_activity(ActivityAction.UPDATE, job, "Paused job")
        serializer = DroneJobDetailSerializer(
            self.get_queryset().get(pk=job.pk)
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def resume(self, request, uuid=None):
        """Resume a paused job."""
        job = self.get_object()
        success = job.resume()
        if not success:
            return Response(
                {"error": "Job can only be resumed from PAUSED status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.log_activity(ActivityAction.UPDATE, job, "Resumed job")
        serializer = DroneJobDetailSerializer(
            self.get_queryset().get(pk=job.pk)
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def retry(self, request, uuid=None):
        """Retry a failed job."""
        job = self.get_object()
        success = job.retry()
        if not success:
            return Response(
                {"error": "Job cannot be retried (either not failed or max retries reached)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.log_activity(ActivityAction.UPDATE, job, "Retried job")
        serializer = DroneJobDetailSerializer(
            self.get_queryset().get(pk=job.pk)
        )
        return Response(serializer.data)


# =============================================================================
# DroneJobEvent ViewSet
# =============================================================================


class DroneJobEventFilter(django_filters.FilterSet):
    """Filter for job events."""

    job = django_filters.NumberFilter(field_name="job")
    drone = django_filters.NumberFilter(field_name="drone")
    event_type = django_filters.CharFilter(field_name="event_type")
    created_after = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="gte"
    )
    created_before = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="lte"
    )

    class Meta:
        model = DroneJobEvent
        fields = ["job", "drone", "event_type"]


class DroneJobEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for drone job events.

    list: Get job events
    retrieve: Get a specific job event

    Job events are read-only (created automatically by state transitions).
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = DroneJobEventFilter
    search_fields = [
        "job__job_number",
        "drone__name",
        "description",
    ]
    ordering_fields = ["created_at", "event_type"]
    ordering = ["-created_at"]
    lookup_field = "uuid"
    http_method_names = ["get", "head", "options"]

    def get_queryset(self):
        """Return job events with related data."""
        return DroneJobEvent.objects.select_related(
            "job",
            "drone",
        ).order_by("-created_at")

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return DroneJobEventListSerializer
        return DroneJobEventDetailSerializer


# =============================================================================
# Job Queue Live View
# =============================================================================

ACTIVE_STATUSES = [
    JobStatus.NEW,
    JobStatus.QUEUED,
    JobStatus.ASSIGNED,
    JobStatus.IN_PROGRESS,
    JobStatus.PAUSED,
]


class JobQueueStatsView(APIView):
    """
    GET /jobs/queue-stats/

    Returns job queue statistics for the live monitoring dashboard.
    Includes per-status counts, priority breakdown, recent completions/failures,
    and throughput metrics.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        all_jobs = DroneJob.objects.all()
        now = timezone.now()

        # Status counts
        status_counts = {}
        for choice in JobStatus:
            status_counts[choice.value.lower()] = all_jobs.filter(
                status=choice.value
            ).count()

        # Active jobs total
        active_total = all_jobs.filter(status__in=ACTIVE_STATUSES).count()

        # Priority breakdown for active jobs
        active_jobs = all_jobs.filter(status__in=ACTIVE_STATUSES)
        priority_counts = {
            "urgent": active_jobs.filter(priority="URGENT").count(),
            "high": active_jobs.filter(priority="HIGH").count(),
            "normal": active_jobs.filter(priority="NORMAL").count(),
            "low": active_jobs.filter(priority="LOW").count(),
        }

        # Recent completions (last 1 hour)
        one_hour_ago = now - timezone.timedelta(hours=1)
        completed_last_hour = all_jobs.filter(
            status=JobStatus.COMPLETED,
            completed_at__gte=one_hour_ago,
        ).count()

        # Recent failures (last 1 hour)
        failed_last_hour = all_jobs.filter(
            status=JobStatus.FAILED,
            failed_at__gte=one_hour_ago,
        ).count()

        # Average duration of completed jobs (last 24 hours)
        twenty_four_hours_ago = now - timezone.timedelta(hours=24)
        avg_duration = (
            all_jobs.filter(
                status=JobStatus.COMPLETED,
                completed_at__gte=twenty_four_hours_ago,
                started_at__isnull=False,
            )
            .annotate(
                duration=F("completed_at") - F("started_at"),
            )
            .aggregate(avg=Avg("duration"))
            .get("avg")
        )

        # Jobs needing attention (failed + can retry)
        needs_attention = all_jobs.filter(
            status=JobStatus.FAILED,
            retry_count__lt=F("max_retries"),
        ).count()

        return Response({
            "active_total": active_total,
            **status_counts,
            "priority": priority_counts,
            "completed_last_hour": completed_last_hour,
            "failed_last_hour": failed_last_hour,
            "avg_duration_seconds": (
                avg_duration.total_seconds() if avg_duration else None
            ),
            "needs_attention": needs_attention,
        })

"""
Logs Views

API views for drone flight logs, graph templates, and flight log graphs.
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

from .models import DroneFlightLog, FlightGraphTemplate, FlightLogGraph
from .serializers import (
    DroneFlightLogCreateUpdateSerializer,
    DroneFlightLogDetailSerializer,
    DroneFlightLogListSerializer,
    FlightGraphTemplateCreateUpdateSerializer,
    FlightGraphTemplateDetailSerializer,
    FlightGraphTemplateListSerializer,
    FlightLogGraphCreateSerializer,
    FlightLogGraphDetailSerializer,
    FlightLogGraphListSerializer,
)


# =============================================================================
# DroneFlightLog ViewSet
# =============================================================================


class DroneFlightLogFilter(django_filters.FilterSet):
    """Filter for flight logs."""

    organization = django_filters.NumberFilter(field_name="organization")
    warehouse = django_filters.NumberFilter(field_name="warehouse")
    drone = django_filters.NumberFilter(field_name="drone")
    is_processed = django_filters.BooleanFilter(field_name="is_processed")
    flight_date_after = django_filters.DateFilter(
        field_name="flight_date", lookup_expr="gte"
    )
    flight_date_before = django_filters.DateFilter(
        field_name="flight_date", lookup_expr="lte"
    )

    class Meta:
        model = DroneFlightLog
        fields = [
            "organization",
            "warehouse",
            "drone",
            "is_processed",
        ]


class DroneFlightLogViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for drone flight logs.

    list: Get all flight logs
    create: Upload a new flight log
    retrieve: Get a flight log by UUID
    update: Update flight log metadata
    partial_update: Partially update a flight log
    destroy: Delete a flight log
    """

    permission_classes = [IsAuthenticated, HasPermission]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = DroneFlightLogFilter
    search_fields = [
        "filename",
        "description",
        "drone__name",
        "drone__serial_number",
    ]
    ordering_fields = [
        "filename",
        "flight_date",
        "flight_duration_seconds",
        "flight_distance_meters",
        "file_size_bytes",
        "max_altitude",
        "max_speed",
        "created_at",
    ]
    ordering = ["-flight_date", "-created_at"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return flight logs with related data and graph counts."""
        return (
            DroneFlightLog.objects.select_related(
                "organization",
                "warehouse",
                "drone",
                "uploaded_by",
            )
            .annotate(
                graphs_count=Count("graphs"),
            )
            .order_by("-flight_date", "-created_at")
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return DroneFlightLogListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return DroneFlightLogCreateUpdateSerializer
        return DroneFlightLogDetailSerializer

    def perform_create(self, serializer):
        """Save and process the uploaded flight log."""
        instance = serializer.save()
        from .processors import process_flight_log

        process_flight_log(instance.id)

    @action(detail=True, methods=["get"])
    def graphs(self, request, uuid=None):
        """Get generated graphs for a specific flight log."""
        log = self.get_object()
        graphs = FlightLogGraph.objects.filter(log=log).select_related(
            "template"
        ).order_by("template__display_order")
        serializer = FlightLogGraphListSerializer(graphs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="explorer-data")
    def explorer_data(self, request, uuid=None):
        """Return full extracted data for interactive exploration."""
        log = self.get_object()
        if not log.is_processed or not log.extracted_data:
            return Response(
                {"error": "Log not processed yet. Process the log first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        extracted = log.extracted_data
        topics = extracted.get("topics", {})

        # Seed data stores topics as a list of names — not explorable
        if not isinstance(topics, dict):
            return Response(
                {"error": "Log data is in legacy format. Reprocess the log to enable exploration."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build topic metadata (topic name → column names + point count)
        topic_metadata = {}
        for name, points in topics.items():
            if points and isinstance(points[0], dict):
                topic_metadata[name] = {
                    "columns": list(points[0].keys()),
                    "count": len(points),
                }

        return Response({
            "log_uuid": str(log.uuid),
            "filename": log.filename,
            "is_processed": log.is_processed,
            "topic_metadata": topic_metadata,
            "topics": topics,
            "columns": extracted.get("columns", []),
            "summary": extracted.get("summary", {}),
        })

    @action(detail=True, methods=["post"])
    def process(self, request, uuid=None):
        """Manually trigger (re)processing of a flight log."""
        log = self.get_object()
        from .processors import process_flight_log

        process_flight_log(log.id)
        log.refresh_from_db()
        serializer = DroneFlightLogDetailSerializer(log)
        if not log.is_processed:
            return Response(
                {"success": False, "error": log.processing_error or "Processing failed.", "data": serializer.data},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"success": True, "data": serializer.data})


# =============================================================================
# FlightGraphTemplate ViewSet
# =============================================================================


class FlightGraphTemplateFilter(django_filters.FilterSet):
    """Filter for graph templates."""

    organization = django_filters.NumberFilter(field_name="organization")
    graph_type = django_filters.CharFilter(field_name="graph_type")
    is_active = django_filters.BooleanFilter(field_name="is_active")
    is_system = django_filters.BooleanFilter(
        method="filter_is_system"
    )

    class Meta:
        model = FlightGraphTemplate
        fields = [
            "organization",
            "graph_type",
            "is_active",
        ]

    def filter_is_system(self, queryset, name, value):
        if value:
            return queryset.filter(organization__isnull=True)
        return queryset.filter(organization__isnull=False)


class FlightGraphTemplateViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for flight graph templates.

    list: Get all graph templates
    create: Create a new template
    retrieve: Get a template by UUID
    update: Update a template
    partial_update: Partially update a template
    destroy: Deactivate a template (soft delete)
    """

    permission_classes = [IsAuthenticated, HasPermission]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = FlightGraphTemplateFilter
    search_fields = [
        "name",
        "description",
        "x_axis_field",
        "y_axis_field",
    ]
    ordering_fields = [
        "name",
        "graph_type",
        "display_order",
        "created_at",
    ]
    ordering = ["display_order", "name"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return templates with related data."""
        return FlightGraphTemplate.objects.select_related(
            "organization",
            "created_by",
        ).order_by("display_order", "name")

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return FlightGraphTemplateListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return FlightGraphTemplateCreateUpdateSerializer
        return FlightGraphTemplateDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        self.log_activity(ActivityAction.DELETE, instance, "Deactivated template")
        return Response(
            {"success": True, "message": "Template deactivated successfully"},
            status=status.HTTP_200_OK,
        )


# =============================================================================
# FlightLogGraph ViewSet
# =============================================================================


class FlightLogGraphFilter(django_filters.FilterSet):
    """Filter for flight log graphs."""

    log = django_filters.NumberFilter(field_name="log")
    template = django_filters.NumberFilter(field_name="template")
    is_generated = django_filters.BooleanFilter(field_name="is_generated")

    class Meta:
        model = FlightLogGraph
        fields = ["log", "template", "is_generated"]


class FlightLogGraphViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for flight log graphs.

    list: Get all generated graphs
    create: Request graph generation for a log+template pair
    retrieve: Get a specific graph by UUID
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = FlightLogGraphFilter
    search_fields = [
        "log__filename",
        "template__name",
        "title",
    ]
    ordering_fields = ["created_at", "generated_at"]
    ordering = ["-created_at"]
    lookup_field = "uuid"
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        """Return graphs with related data."""
        return FlightLogGraph.objects.select_related(
            "log",
            "template",
        ).order_by("-created_at")

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return FlightLogGraphListSerializer
        elif self.action == "create":
            return FlightLogGraphCreateSerializer
        return FlightLogGraphDetailSerializer

    def perform_create(self, serializer):
        """Save and generate graph data."""
        instance = serializer.save()
        from .processors import generate_graph_data

        generate_graph_data(instance.id)

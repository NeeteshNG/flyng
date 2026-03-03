"""
Logs Serializers

Serializers for drone flight logs, graph templates, and flight log graphs.
"""

from rest_framework import serializers

from .models import DroneFlightLog, FlightGraphTemplate, FlightLogGraph


# --- DroneFlightLog Serializers ---


class DroneFlightLogListSerializer(serializers.ModelSerializer):
    """Serializer for listing flight logs."""

    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )
    warehouse_name = serializers.CharField(
        source="warehouse.name", read_only=True, default=None
    )
    drone_name = serializers.CharField(
        source="drone.name", read_only=True, default=None
    )
    drone_serial = serializers.CharField(
        source="drone.serial_number", read_only=True, default=None
    )
    uploaded_by_name = serializers.CharField(
        source="uploaded_by.get_full_name", read_only=True, default=None
    )
    file_size_display = serializers.ReadOnlyField()
    duration_display = serializers.ReadOnlyField()
    distance_display = serializers.ReadOnlyField()
    graphs_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DroneFlightLog
        fields = [
            "id",
            "uuid",
            "organization",
            "organization_name",
            "warehouse",
            "warehouse_name",
            "drone",
            "drone_name",
            "drone_serial",
            "filename",
            "file_size_bytes",
            "file_size_display",
            "flight_date",
            "flight_duration_seconds",
            "duration_display",
            "flight_distance_meters",
            "distance_display",
            "max_altitude",
            "max_speed",
            "avg_speed",
            "start_battery_percent",
            "end_battery_percent",
            "battery_used_percent",
            "is_processed",
            "uploaded_by_name",
            "graphs_count",
            "created_at",
        ]


class DroneFlightLogDetailSerializer(serializers.ModelSerializer):
    """Serializer for flight log details."""

    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )
    warehouse_name = serializers.CharField(
        source="warehouse.name", read_only=True, default=None
    )
    drone_name = serializers.CharField(
        source="drone.name", read_only=True, default=None
    )
    drone_serial = serializers.CharField(
        source="drone.serial_number", read_only=True, default=None
    )
    uploaded_by_name = serializers.CharField(
        source="uploaded_by.get_full_name", read_only=True, default=None
    )
    file_size_display = serializers.ReadOnlyField()
    duration_display = serializers.ReadOnlyField()
    distance_display = serializers.ReadOnlyField()
    graphs_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DroneFlightLog
        fields = [
            "id",
            "uuid",
            "organization",
            "organization_name",
            "warehouse",
            "warehouse_name",
            "drone",
            "drone_name",
            "drone_serial",
            "file",
            "filename",
            "file_size_bytes",
            "file_size_display",
            "file_hash",
            "flight_date",
            "flight_duration_seconds",
            "duration_display",
            "flight_distance_meters",
            "distance_display",
            "start_latitude",
            "start_longitude",
            "start_altitude",
            "end_latitude",
            "end_longitude",
            "end_altitude",
            "max_altitude",
            "max_speed",
            "avg_speed",
            "start_battery_percent",
            "end_battery_percent",
            "battery_used_percent",
            "is_processed",
            "processed_at",
            "processing_error",
            "description",
            "notes",
            "uploaded_by",
            "uploaded_by_name",
            "graphs_count",
            "created_at",
            "updated_at",
        ]


class DroneFlightLogCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating flight logs."""

    class Meta:
        model = DroneFlightLog
        fields = [
            "organization",
            "warehouse",
            "drone",
            "file",
            "filename",
            "file_size_bytes",
            "file_hash",
            "flight_date",
            "flight_duration_seconds",
            "flight_distance_meters",
            "start_latitude",
            "start_longitude",
            "start_altitude",
            "end_latitude",
            "end_longitude",
            "end_altitude",
            "max_altitude",
            "max_speed",
            "avg_speed",
            "start_battery_percent",
            "end_battery_percent",
            "battery_used_percent",
            "description",
            "notes",
        ]

    def validate(self, data):
        """Set uploaded_by from request user."""
        request = self.context.get("request")
        if request and request.user and not self.instance:
            data["uploaded_by"] = request.user
        return data


# --- FlightGraphTemplate Serializers ---


class FlightGraphTemplateListSerializer(serializers.ModelSerializer):
    """Serializer for listing graph templates."""

    organization_name = serializers.CharField(
        source="organization.name", read_only=True, default=None
    )
    graph_type_display = serializers.CharField(
        source="get_graph_type_display", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True, default=None
    )

    class Meta:
        model = FlightGraphTemplate
        fields = [
            "id",
            "uuid",
            "organization",
            "organization_name",
            "name",
            "description",
            "graph_type",
            "graph_type_display",
            "x_axis_field",
            "y_axis_field",
            "z_axis_field",
            "display_order",
            "is_active",
            "created_by_name",
            "created_at",
        ]


class FlightGraphTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer for graph template details."""

    organization_name = serializers.CharField(
        source="organization.name", read_only=True, default=None
    )
    graph_type_display = serializers.CharField(
        source="get_graph_type_display", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True, default=None
    )

    class Meta:
        model = FlightGraphTemplate
        fields = [
            "id",
            "uuid",
            "organization",
            "organization_name",
            "name",
            "description",
            "graph_type",
            "graph_type_display",
            "x_axis_field",
            "y_axis_field",
            "z_axis_field",
            "x_axis_label",
            "y_axis_label",
            "z_axis_label",
            "chart_config",
            "display_order",
            "is_active",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]


class FlightGraphTemplateCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating graph templates."""

    class Meta:
        model = FlightGraphTemplate
        fields = [
            "organization",
            "name",
            "description",
            "graph_type",
            "x_axis_field",
            "y_axis_field",
            "z_axis_field",
            "x_axis_label",
            "y_axis_label",
            "z_axis_label",
            "chart_config",
            "display_order",
            "is_active",
        ]

    def validate(self, data):
        """Set created_by from request user."""
        request = self.context.get("request")
        if request and request.user and not self.instance:
            data["created_by"] = request.user
        return data


# --- FlightLogGraph Serializers ---


class FlightLogGraphListSerializer(serializers.ModelSerializer):
    """Serializer for listing flight log graphs."""

    log_filename = serializers.CharField(
        source="log.filename", read_only=True
    )
    template_name = serializers.CharField(
        source="template.name", read_only=True
    )
    template_graph_type = serializers.CharField(
        source="template.graph_type", read_only=True
    )
    display_title = serializers.ReadOnlyField()

    class Meta:
        model = FlightLogGraph
        fields = [
            "id",
            "uuid",
            "log",
            "log_filename",
            "template",
            "template_name",
            "template_graph_type",
            "title",
            "display_title",
            "graph_data",
            "is_generated",
            "generated_at",
            "created_at",
        ]


class FlightLogGraphDetailSerializer(serializers.ModelSerializer):
    """Serializer for flight log graph details."""

    log_filename = serializers.CharField(
        source="log.filename", read_only=True
    )
    template_name = serializers.CharField(
        source="template.name", read_only=True
    )
    template_graph_type = serializers.CharField(
        source="template.graph_type", read_only=True
    )
    display_title = serializers.ReadOnlyField()

    class Meta:
        model = FlightLogGraph
        fields = [
            "id",
            "uuid",
            "log",
            "log_filename",
            "template",
            "template_name",
            "template_graph_type",
            "title",
            "display_title",
            "graph_data",
            "is_generated",
            "generated_at",
            "generation_error",
            "image",
            "created_at",
            "updated_at",
        ]


class FlightLogGraphCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating flight log graphs."""

    class Meta:
        model = FlightLogGraph
        fields = [
            "log",
            "template",
            "title",
        ]

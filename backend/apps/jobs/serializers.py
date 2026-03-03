"""
Jobs Serializers

Serializers for drone jobs and job events.
"""

from rest_framework import serializers

from .models import DroneJob, DroneJobEvent


# --- DroneJob Serializers ---


class DroneJobListSerializer(serializers.ModelSerializer):
    """Serializer for listing drone jobs."""

    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    drone_name = serializers.CharField(
        source="drone.name", read_only=True, default=None
    )
    drone_serial = serializers.CharField(
        source="drone.serial_number", read_only=True, default=None
    )
    order_number = serializers.CharField(
        source="order.order_number", read_only=True, default=None
    )
    item_name = serializers.CharField(
        source="item.name", read_only=True, default=None
    )
    item_sku = serializers.CharField(
        source="item.sku", read_only=True, default=None
    )
    source_bin_code = serializers.CharField(
        source="source_bin.code", read_only=True, default=None
    )
    destination_bin_code = serializers.CharField(
        source="destination_bin.code", read_only=True, default=None
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    job_type_display = serializers.CharField(
        source="get_job_type_display", read_only=True
    )
    priority_display = serializers.CharField(
        source="get_priority_display", read_only=True
    )
    is_active = serializers.ReadOnlyField()
    duration_seconds = serializers.ReadOnlyField()
    can_retry = serializers.ReadOnlyField()
    events_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DroneJob
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
            "order",
            "order_number",
            "job_number",
            "job_type",
            "job_type_display",
            "status",
            "status_display",
            "priority",
            "priority_display",
            "item",
            "item_name",
            "item_sku",
            "source_bin",
            "source_bin_code",
            "destination_bin",
            "destination_bin_code",
            "quantity",
            "picked_quantity",
            "is_active",
            "can_retry",
            "duration_seconds",
            "retry_count",
            "max_retries",
            "started_at",
            "completed_at",
            "failed_at",
            "events_count",
            "created_at",
            "updated_at",
        ]


class DroneJobDetailSerializer(serializers.ModelSerializer):
    """Serializer for drone job details."""

    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    drone_name = serializers.CharField(
        source="drone.name", read_only=True, default=None
    )
    drone_serial = serializers.CharField(
        source="drone.serial_number", read_only=True, default=None
    )
    order_number = serializers.CharField(
        source="order.order_number", read_only=True, default=None
    )
    order_line_id = serializers.IntegerField(
        source="order_line.id", read_only=True, default=None
    )
    item_name = serializers.CharField(
        source="item.name", read_only=True, default=None
    )
    item_sku = serializers.CharField(
        source="item.sku", read_only=True, default=None
    )
    source_bin_code = serializers.CharField(
        source="source_bin.code", read_only=True, default=None
    )
    destination_bin_code = serializers.CharField(
        source="destination_bin.code", read_only=True, default=None
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    job_type_display = serializers.CharField(
        source="get_job_type_display", read_only=True
    )
    priority_display = serializers.CharField(
        source="get_priority_display", read_only=True
    )
    is_active = serializers.ReadOnlyField()
    is_complete = serializers.ReadOnlyField()
    is_failed = serializers.ReadOnlyField()
    is_cancelled = serializers.ReadOnlyField()
    can_retry = serializers.ReadOnlyField()
    duration_seconds = serializers.ReadOnlyField()
    events_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DroneJob
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
            "order",
            "order_number",
            "order_line",
            "order_line_id",
            "job_number",
            "job_type",
            "job_type_display",
            "status",
            "status_display",
            "priority",
            "priority_display",
            "item",
            "item_name",
            "item_sku",
            "source_bin",
            "source_bin_code",
            "destination_bin",
            "destination_bin_code",
            "quantity",
            "picked_quantity",
            "queued_at",
            "assigned_at",
            "started_at",
            "completed_at",
            "failed_at",
            "cancelled_at",
            "error_code",
            "error_message",
            "retry_count",
            "max_retries",
            "notes",
            "internal_notes",
            "is_active",
            "is_complete",
            "is_failed",
            "is_cancelled",
            "can_retry",
            "duration_seconds",
            "events_count",
            "created_at",
            "updated_at",
        ]


class DroneJobCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating drone jobs."""

    class Meta:
        model = DroneJob
        fields = [
            "organization",
            "warehouse",
            "drone",
            "order",
            "order_line",
            "job_number",
            "job_type",
            "status",
            "priority",
            "source_bin",
            "destination_bin",
            "item",
            "quantity",
            "picked_quantity",
            "max_retries",
            "notes",
            "internal_notes",
        ]

    def validate_job_number(self, value):
        """Ensure job number is unique."""
        qs = DroneJob.objects.filter(job_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Job number already exists.")
        return value


# --- DroneJobEvent Serializers ---


class DroneJobEventListSerializer(serializers.ModelSerializer):
    """Serializer for listing job events."""

    job_number = serializers.CharField(source="job.job_number", read_only=True)
    drone_name = serializers.CharField(
        source="drone.name", read_only=True, default=None
    )
    event_type_display = serializers.CharField(
        source="get_event_type_display", read_only=True
    )

    class Meta:
        model = DroneJobEvent
        fields = [
            "id",
            "uuid",
            "job",
            "job_number",
            "drone",
            "drone_name",
            "event_type",
            "event_type_display",
            "description",
            "created_at",
        ]


class DroneJobEventDetailSerializer(serializers.ModelSerializer):
    """Serializer for job event details."""

    job_number = serializers.CharField(source="job.job_number", read_only=True)
    drone_name = serializers.CharField(
        source="drone.name", read_only=True, default=None
    )
    event_type_display = serializers.CharField(
        source="get_event_type_display", read_only=True
    )

    class Meta:
        model = DroneJobEvent
        fields = [
            "id",
            "uuid",
            "job",
            "job_number",
            "drone",
            "drone_name",
            "event_type",
            "event_type_display",
            "description",
            "x_position",
            "y_position",
            "z_position",
            "metadata",
            "created_at",
        ]

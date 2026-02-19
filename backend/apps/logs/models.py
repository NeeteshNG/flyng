"""
Logs Models

Models for managing drone flight logs and graph templates.
"""

import os
import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel

from .managers import (
    DroneFlightLogManager,
    FlightGraphTemplateManager,
    FlightLogGraphManager,
)


def flight_log_upload_path(instance, filename):
    """Generate upload path for flight log files."""
    ext = os.path.splitext(filename)[1]
    new_filename = f"{uuid.uuid4()}{ext}"
    return f"flight_logs/{instance.organization_id}/{new_filename}"


class GraphType(models.TextChoices):
    """Types of graphs for flight data visualization."""

    LINE = "LINE", _("Line Chart")
    SCATTER = "SCATTER", _("Scatter Plot")
    BAR = "BAR", _("Bar Chart")
    AREA = "AREA", _("Area Chart")
    HISTOGRAM = "HISTOGRAM", _("Histogram")
    HEATMAP = "HEATMAP", _("Heatmap")
    BOX = "BOX", _("Box Plot")
    PATH_3D = "PATH_3D", _("3D Flight Path")


class DroneFlightLog(BaseModel):
    """
    Drone flight log file and metadata.

    Stores flight log files (ULog format) and extracted metadata
    for analysis and visualization.
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="flight_logs",
        verbose_name=_("Organization"),
    )
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.CASCADE,
        related_name="flight_logs",
        blank=True,
        null=True,
        verbose_name=_("Warehouse"),
    )
    drone = models.ForeignKey(
        "drones.Drone",
        on_delete=models.SET_NULL,
        related_name="flight_logs",
        blank=True,
        null=True,
        verbose_name=_("Drone"),
    )

    # File information
    file = models.FileField(
        upload_to=flight_log_upload_path,
        verbose_name=_("Log File"),
    )
    filename = models.CharField(
        max_length=255,
        verbose_name=_("Filename"),
        help_text=_("Original filename"),
    )
    file_size_bytes = models.BigIntegerField(
        default=0,
        verbose_name=_("File Size (bytes)"),
    )
    file_hash = models.CharField(
        max_length=64,
        blank=True,
        default="",
        verbose_name=_("File Hash"),
        help_text=_("SHA256 hash for deduplication"),
    )

    # Flight metadata
    flight_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Flight Date"),
    )
    flight_duration_seconds = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("Flight Duration (seconds)"),
    )
    flight_distance_meters = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("Flight Distance (meters)"),
    )

    # Start/End positions
    start_latitude = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("Start Latitude"),
    )
    start_longitude = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("Start Longitude"),
    )
    start_altitude = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("Start Altitude (m)"),
    )
    end_latitude = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("End Latitude"),
    )
    end_longitude = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("End Longitude"),
    )
    end_altitude = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("End Altitude (m)"),
    )

    # Flight statistics
    max_altitude = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("Max Altitude (m)"),
    )
    max_speed = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("Max Speed (m/s)"),
    )
    avg_speed = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("Average Speed (m/s)"),
    )

    # Battery info
    start_battery_percent = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("Start Battery (%)"),
    )
    end_battery_percent = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("End Battery (%)"),
    )
    battery_used_percent = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("Battery Used (%)"),
    )

    # Processing status
    is_processed = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name=_("Is Processed"),
    )
    processed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Processed At"),
    )
    processing_error = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Processing Error"),
    )

    # Raw extracted data (JSON)
    extracted_data = models.JSONField(
        blank=True,
        default=dict,
        verbose_name=_("Extracted Data"),
        help_text=_("Raw data extracted from log file"),
    )

    # Descriptive info
    description = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Description"),
    )
    notes = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Notes"),
    )

    # Upload tracking
    uploaded_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="uploaded_logs",
        blank=True,
        null=True,
        verbose_name=_("Uploaded By"),
    )

    objects = DroneFlightLogManager()

    class Meta:
        verbose_name = _("Drone Flight Log")
        verbose_name_plural = _("Drone Flight Logs")
        ordering = ["-flight_date", "-created_at"]
        indexes = [
            models.Index(fields=["organization", "is_processed"]),
            models.Index(fields=["drone", "flight_date"]),
            models.Index(fields=["file_hash"]),
        ]

    def __str__(self):
        if self.drone and self.flight_date:
            return f"{self.drone.serial_number} - {self.flight_date}"
        return self.filename

    @property
    def file_size_display(self):
        """Get human-readable file size."""
        size = self.file_size_bytes
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"

    @property
    def duration_display(self):
        """Get human-readable flight duration."""
        if not self.flight_duration_seconds:
            return "-"
        seconds = int(self.flight_duration_seconds)
        minutes, secs = divmod(seconds, 60)
        hours, mins = divmod(minutes, 60)
        if hours:
            return f"{hours}h {mins}m {secs}s"
        elif mins:
            return f"{mins}m {secs}s"
        return f"{secs}s"

    @property
    def distance_display(self):
        """Get human-readable flight distance."""
        if not self.flight_distance_meters:
            return "-"
        if self.flight_distance_meters >= 1000:
            return f"{self.flight_distance_meters / 1000:.2f} km"
        return f"{self.flight_distance_meters:.0f} m"


class FlightGraphTemplate(BaseModel):
    """
    Template for visualizing flight log data.

    Defines what data to extract and how to visualize it.
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="graph_templates",
        blank=True,
        null=True,
        verbose_name=_("Organization"),
        help_text=_("Leave blank for system-wide templates"),
    )
    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Description"),
    )
    graph_type = models.CharField(
        max_length=20,
        choices=GraphType.choices,
        default=GraphType.LINE,
        verbose_name=_("Graph Type"),
    )

    # Data source configuration
    x_axis_field = models.CharField(
        max_length=100,
        default="timestamp",
        verbose_name=_("X-Axis Field"),
        help_text=_("Field name for X-axis data"),
    )
    y_axis_field = models.CharField(
        max_length=100,
        verbose_name=_("Y-Axis Field"),
        help_text=_("Field name for Y-axis data"),
    )
    z_axis_field = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("Z-Axis Field"),
        help_text=_("Field name for Z-axis data (3D graphs only)"),
    )

    # Axis labels
    x_axis_label = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("X-Axis Label"),
    )
    y_axis_label = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("Y-Axis Label"),
    )
    z_axis_label = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("Z-Axis Label"),
    )

    # Chart configuration (JSON)
    chart_config = models.JSONField(
        blank=True,
        default=dict,
        verbose_name=_("Chart Configuration"),
        help_text=_("ECharts/visualization library configuration"),
    )

    # Display order
    display_order = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Display Order"),
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Is Active"),
    )

    # Created by
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="created_graph_templates",
        blank=True,
        null=True,
        verbose_name=_("Created By"),
    )

    objects = FlightGraphTemplateManager()

    class Meta:
        verbose_name = _("Flight Graph Template")
        verbose_name_plural = _("Flight Graph Templates")
        ordering = ["display_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="unique_template_name_per_org",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_graph_type_display()})"


class FlightLogGraph(BaseModel):
    """
    Generated graph for a specific flight log.

    Stores the rendered graph data for quick retrieval.
    """

    log = models.ForeignKey(
        DroneFlightLog,
        on_delete=models.CASCADE,
        related_name="graphs",
        verbose_name=_("Flight Log"),
    )
    template = models.ForeignKey(
        FlightGraphTemplate,
        on_delete=models.CASCADE,
        related_name="generated_graphs",
        verbose_name=_("Template"),
    )

    # Graph title (can override template name)
    title = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Title"),
    )

    # Generated graph data
    graph_data = models.JSONField(
        blank=True,
        default=dict,
        verbose_name=_("Graph Data"),
        help_text=_("Processed data ready for visualization"),
    )

    # Generation status
    is_generated = models.BooleanField(
        default=False,
        verbose_name=_("Is Generated"),
    )
    generated_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Generated At"),
    )
    generation_error = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Generation Error"),
    )

    # Image cache (optional rendered image)
    image = models.ImageField(
        upload_to="flight_graphs/",
        blank=True,
        null=True,
        verbose_name=_("Rendered Image"),
    )

    objects = FlightLogGraphManager()

    class Meta:
        verbose_name = _("Flight Log Graph")
        verbose_name_plural = _("Flight Log Graphs")
        ordering = ["template__display_order"]
        constraints = [
            models.UniqueConstraint(
                fields=["log", "template"],
                name="unique_graph_per_log_template",
            ),
        ]

    def __str__(self):
        return f"{self.log} - {self.template.name}"

    @property
    def display_title(self):
        """Get display title (custom or template name)."""
        return self.title or self.template.name

"""
Logs Admin Configuration
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from unfold.admin import ModelAdmin, TabularInline

from .models import DroneFlightLog, FlightGraphTemplate, FlightLogGraph


class FlightLogGraphInline(TabularInline):
    """Inline for log graphs."""

    model = FlightLogGraph
    extra = 0
    fields = [
        "template",
        "title",
        "is_generated",
        "generated_at",
    ]
    readonly_fields = ["is_generated", "generated_at"]
    raw_id_fields = ["template"]


@admin.register(DroneFlightLog)
class DroneFlightLogAdmin(ModelAdmin):
    """Admin for DroneFlightLog model."""

    list_display = [
        "filename",
        "drone",
        "warehouse",
        "flight_date",
        "duration_display",
        "distance_display",
        "file_size_badge",
        "processing_status",
        "uploaded_by",
    ]
    list_filter = [
        "is_processed",
        "organization",
        "warehouse",
        "drone",
        "flight_date",
    ]
    search_fields = [
        "filename",
        "description",
        "drone__serial_number",
        "drone__name",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "file_size_bytes",
        "file_hash",
        "processed_at",
        "file_size_badge",
        "duration_display",
        "distance_display",
    ]
    raw_id_fields = [
        "organization",
        "warehouse",
        "drone",
        "uploaded_by",
    ]
    date_hierarchy = "flight_date"
    inlines = [FlightLogGraphInline]

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "organization",
                    "warehouse",
                    "drone",
                    "file",
                    "filename",
                )
            },
        ),
        (
            _("File Info"),
            {
                "fields": (
                    "file_size_badge",
                    "file_hash",
                )
            },
        ),
        (
            _("Flight Metadata"),
            {
                "fields": (
                    "flight_date",
                    ("flight_duration_seconds", "duration_display"),
                    ("flight_distance_meters", "distance_display"),
                )
            },
        ),
        (
            _("Start Position"),
            {
                "fields": (
                    "start_latitude",
                    "start_longitude",
                    "start_altitude",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("End Position"),
            {
                "fields": (
                    "end_latitude",
                    "end_longitude",
                    "end_altitude",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Statistics"),
            {
                "fields": (
                    "max_altitude",
                    "max_speed",
                    "avg_speed",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Battery"),
            {
                "fields": (
                    "start_battery_percent",
                    "end_battery_percent",
                    "battery_used_percent",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Processing"),
            {
                "fields": (
                    "is_processed",
                    "processed_at",
                    "processing_error",
                )
            },
        ),
        (
            _("Extracted Data"),
            {
                "fields": ("extracted_data",),
                "classes": ("collapse",),
            },
        ),
        (
            _("Notes"),
            {
                "fields": (
                    "description",
                    "notes",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Upload Info"),
            {
                "fields": (
                    "uploaded_by",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def duration_display(self, obj):
        """Display human-readable duration."""
        return obj.duration_display

    duration_display.short_description = _("Duration")

    def distance_display(self, obj):
        """Display human-readable distance."""
        return obj.distance_display

    distance_display.short_description = _("Distance")

    def file_size_badge(self, obj):
        """Display file size with badge."""
        return format_html(
            '<span style="background-color: #6c757d; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            obj.file_size_display,
        )

    file_size_badge.short_description = _("Size")

    def processing_status(self, obj):
        """Display processing status badge."""
        if obj.processing_error:
            return format_html(
                '<span style="background-color: #dc3545; color: white; padding: 3px 8px; '
                'border-radius: 3px; font-size: 11px;">Error</span>'
            )
        if obj.is_processed:
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 3px 8px; '
                'border-radius: 3px; font-size: 11px;">Processed</span>'
            )
        return format_html(
            '<span style="background-color: #ffc107; color: black; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">Pending</span>'
        )

    processing_status.short_description = _("Status")


@admin.register(FlightGraphTemplate)
class FlightGraphTemplateAdmin(ModelAdmin):
    """Admin for FlightGraphTemplate model."""

    list_display = [
        "name",
        "graph_type_display",
        "organization",
        "axis_config",
        "display_order",
        "is_active",
    ]
    list_filter = [
        "graph_type",
        "is_active",
        "organization",
    ]
    search_fields = [
        "name",
        "description",
    ]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["organization", "created_by"]

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "organization",
                    "name",
                    "description",
                    "graph_type",
                )
            },
        ),
        (
            _("Axis Configuration"),
            {
                "fields": (
                    ("x_axis_field", "x_axis_label"),
                    ("y_axis_field", "y_axis_label"),
                    ("z_axis_field", "z_axis_label"),
                )
            },
        ),
        (
            _("Chart Config"),
            {
                "fields": ("chart_config",),
                "classes": ("collapse",),
            },
        ),
        (
            _("Display"),
            {
                "fields": (
                    "display_order",
                    "is_active",
                )
            },
        ),
        (
            _("Metadata"),
            {
                "fields": (
                    "created_by",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def graph_type_display(self, obj):
        """Display graph type with icon."""
        icons = {
            "LINE": "show_chart",
            "SCATTER": "scatter_plot",
            "BAR": "bar_chart",
            "AREA": "area_chart",
            "HISTOGRAM": "equalizer",
            "HEATMAP": "grid_on",
            "BOX": "candlestick_chart",
            "PATH_3D": "view_in_ar",
        }
        icon = icons.get(obj.graph_type, "insert_chart")
        return format_html(
            '<span style="display: inline-flex; align-items: center; gap: 4px;">'
            '<span class="material-symbols-outlined" style="font-size: 16px;">{}</span>'
            "{}</span>",
            icon,
            obj.get_graph_type_display(),
        )

    graph_type_display.short_description = _("Type")

    def axis_config(self, obj):
        """Display axis configuration."""
        config = f"X: {obj.x_axis_field}, Y: {obj.y_axis_field}"
        if obj.z_axis_field:
            config += f", Z: {obj.z_axis_field}"
        return config

    axis_config.short_description = _("Axes")


@admin.register(FlightLogGraph)
class FlightLogGraphAdmin(ModelAdmin):
    """Admin for FlightLogGraph model."""

    list_display = [
        "log",
        "template",
        "title",
        "generation_status",
        "generated_at",
    ]
    list_filter = [
        "is_generated",
        "template",
        "log__organization",
    ]
    search_fields = [
        "log__filename",
        "template__name",
        "title",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "generated_at",
    ]
    raw_id_fields = ["log", "template"]

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "log",
                    "template",
                    "title",
                )
            },
        ),
        (
            _("Generation Status"),
            {
                "fields": (
                    "is_generated",
                    "generated_at",
                    "generation_error",
                )
            },
        ),
        (
            _("Graph Data"),
            {
                "fields": ("graph_data",),
                "classes": ("collapse",),
            },
        ),
        (
            _("Image"),
            {
                "fields": ("image",),
                "classes": ("collapse",),
            },
        ),
        (
            _("Timestamps"),
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def generation_status(self, obj):
        """Display generation status badge."""
        if obj.generation_error:
            return format_html(
                '<span style="background-color: #dc3545; color: white; padding: 3px 8px; '
                'border-radius: 3px; font-size: 11px;">Error</span>'
            )
        if obj.is_generated:
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 3px 8px; '
                'border-radius: 3px; font-size: 11px;">Generated</span>'
            )
        return format_html(
            '<span style="background-color: #ffc107; color: black; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">Pending</span>'
        )

    generation_status.short_description = _("Status")

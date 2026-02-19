"""
Jobs Admin Configuration
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from unfold.admin import ModelAdmin, TabularInline

from apps.core.choices import JobStatus, OrderPriority

from .models import DroneJob, DroneJobEvent


class DroneJobEventInline(TabularInline):
    """Inline for job events."""

    model = DroneJobEvent
    extra = 0
    fields = [
        "created_at",
        "event_type",
        "description",
        "drone",
    ]
    readonly_fields = [
        "created_at",
        "event_type",
        "description",
        "drone",
    ]
    ordering = ["-created_at"]
    can_delete = False
    max_num = 0  # Don't allow adding new events through inline


@admin.register(DroneJob)
class DroneJobAdmin(ModelAdmin):
    """Admin for DroneJob model."""

    list_display = [
        "job_number",
        "job_type_display",
        "status_badge",
        "priority_badge",
        "organization",
        "warehouse",
        "drone",
        "source_bin",
        "quantity_display",
        "duration_display",
    ]
    list_filter = [
        "status",
        "job_type",
        "priority",
        "organization",
        "warehouse",
        "drone",
    ]
    search_fields = [
        "job_number",
        "order__order_number",
        "item__sku",
        "item__name",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "queued_at",
        "assigned_at",
        "started_at",
        "completed_at",
        "failed_at",
        "cancelled_at",
        "duration_display",
    ]
    raw_id_fields = [
        "organization",
        "warehouse",
        "drone",
        "order",
        "order_line",
        "source_bin",
        "destination_bin",
        "item",
    ]
    date_hierarchy = "created_at"
    inlines = [DroneJobEventInline]

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "organization",
                    "warehouse",
                    "job_number",
                    "job_type",
                )
            },
        ),
        (
            _("Status"),
            {
                "fields": (
                    "status",
                    "priority",
                    "drone",
                )
            },
        ),
        (
            _("Order Details"),
            {
                "fields": (
                    "order",
                    "order_line",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Location"),
            {
                "fields": (
                    "source_bin",
                    "destination_bin",
                )
            },
        ),
        (
            _("Item Details"),
            {
                "fields": (
                    "item",
                    "quantity",
                    "picked_quantity",
                )
            },
        ),
        (
            _("Error Tracking"),
            {
                "fields": (
                    "error_code",
                    "error_message",
                    "retry_count",
                    "max_retries",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Notes"),
            {
                "fields": (
                    "notes",
                    "internal_notes",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Timestamps"),
            {
                "fields": (
                    "queued_at",
                    "assigned_at",
                    "started_at",
                    "completed_at",
                    "failed_at",
                    "cancelled_at",
                    "duration_display",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def job_type_display(self, obj):
        """Display job type with icon."""
        icons = {
            "PICK": "inventory_2",
            "SCAN": "qr_code_scanner",
            "COUNT": "calculate",
            "MOVE": "swap_horiz",
            "RETURN_HOME": "home",
        }
        icon = icons.get(obj.job_type, "work")
        return format_html(
            '<span style="display: inline-flex; align-items: center; gap: 4px;">'
            '<span class="material-symbols-outlined" style="font-size: 16px;">{}</span>'
            "{}</span>",
            icon,
            obj.get_job_type_display(),
        )

    job_type_display.short_description = _("Type")

    def status_badge(self, obj):
        """Display status with colored badge."""
        colors = {
            JobStatus.NEW: "#6c757d",
            JobStatus.QUEUED: "#17a2b8",
            JobStatus.ASSIGNED: "#007bff",
            JobStatus.IN_PROGRESS: "#ffc107",
            JobStatus.COMPLETED: "#28a745",
            JobStatus.FAILED: "#dc3545",
            JobStatus.CANCELLED: "#6c757d",
            JobStatus.PAUSED: "#fd7e14",
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = _("Status")

    def priority_badge(self, obj):
        """Display priority with colored badge."""
        colors = {
            OrderPriority.LOW: "#28a745",
            OrderPriority.NORMAL: "#17a2b8",
            OrderPriority.HIGH: "#ffc107",
            OrderPriority.URGENT: "#dc3545",
        }
        color = colors.get(obj.priority, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_priority_display(),
        )

    priority_badge.short_description = _("Priority")

    def quantity_display(self, obj):
        """Display quantity with picked status."""
        if obj.is_complete:
            return format_html(
                '<span style="color: #28a745;">{}/{}</span>',
                obj.picked_quantity,
                obj.quantity,
            )
        if obj.is_failed:
            return format_html(
                '<span style="color: #dc3545;">{}/{}</span>',
                obj.picked_quantity,
                obj.quantity,
            )
        return f"0/{obj.quantity}"

    quantity_display.short_description = _("Qty")

    def duration_display(self, obj):
        """Display job duration."""
        duration = obj.duration_seconds
        if duration is None:
            return "-"

        if duration < 60:
            return f"{duration:.0f}s"
        elif duration < 3600:
            return f"{duration / 60:.1f}m"
        else:
            return f"{duration / 3600:.1f}h"

    duration_display.short_description = _("Duration")


@admin.register(DroneJobEvent)
class DroneJobEventAdmin(ModelAdmin):
    """Admin for DroneJobEvent model."""

    list_display = [
        "job",
        "event_type_badge",
        "drone",
        "description_truncated",
        "created_at",
    ]
    list_filter = [
        "event_type",
        "job__warehouse",
        "drone",
    ]
    search_fields = [
        "job__job_number",
        "description",
    ]
    readonly_fields = [
        "job",
        "drone",
        "event_type",
        "description",
        "x_position",
        "y_position",
        "z_position",
        "metadata",
        "created_at",
    ]
    raw_id_fields = ["job", "drone"]
    date_hierarchy = "created_at"

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "job",
                    "event_type",
                    "description",
                    "drone",
                )
            },
        ),
        (
            _("Position"),
            {
                "fields": (
                    "x_position",
                    "y_position",
                    "z_position",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Metadata"),
            {
                "fields": ("metadata",),
                "classes": ("collapse",),
            },
        ),
        (
            _("Timestamp"),
            {
                "fields": ("created_at",),
            },
        ),
    )

    def event_type_badge(self, obj):
        """Display event type with colored badge."""
        colors = {
            "CREATED": "#6c757d",
            "QUEUED": "#17a2b8",
            "ASSIGNED": "#007bff",
            "STARTED": "#ffc107",
            "NAVIGATING": "#fd7e14",
            "ARRIVED": "#20c997",
            "SCANNED": "#6f42c1",
            "PICKED": "#28a745",
            "COMPLETED": "#28a745",
            "FAILED": "#dc3545",
            "CANCELLED": "#6c757d",
            "PAUSED": "#fd7e14",
            "RESUMED": "#17a2b8",
            "ERROR": "#dc3545",
        }
        color = colors.get(obj.event_type, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_event_type_display(),
        )

    event_type_badge.short_description = _("Event")

    def description_truncated(self, obj):
        """Display truncated description."""
        if len(obj.description) > 50:
            return f"{obj.description[:50]}..."
        return obj.description or "-"

    description_truncated.short_description = _("Description")

    def has_add_permission(self, request):
        """Disable adding events manually."""
        return False

    def has_change_permission(self, request, obj=None):
        """Disable editing events."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Disable deleting events."""
        return False

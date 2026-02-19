"""
Core Admin Configuration
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from unfold.admin import ModelAdmin

from .choices import ImportStatus
from .models import ImportJob


@admin.register(ImportJob)
class ImportJobAdmin(ModelAdmin):
    """Admin for ImportJob model."""

    list_display = [
        "original_filename",
        "import_type_display",
        "status_badge",
        "organization",
        "warehouse",
        "progress_display",
        "stats_display",
        "duration_display",
        "created_by",
        "created_at",
    ]
    list_filter = [
        "status",
        "import_type",
        "organization",
        "warehouse",
    ]
    search_fields = [
        "original_filename",
        "organization__name",
        "created_by__email",
    ]
    readonly_fields = [
        "uuid",
        "created_at",
        "updated_at",
        "started_at",
        "completed_at",
        "total_rows",
        "processed_rows",
        "success_count",
        "error_count",
        "skipped_count",
        "progress_display",
        "duration_display",
    ]
    raw_id_fields = [
        "organization",
        "warehouse",
        "created_by",
    ]
    date_hierarchy = "created_at"

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "organization",
                    "warehouse",
                    "import_type",
                    "status",
                )
            },
        ),
        (
            _("File"),
            {
                "fields": (
                    "file",
                    "original_filename",
                )
            },
        ),
        (
            _("Progress"),
            {
                "fields": (
                    "progress_display",
                    ("total_rows", "processed_rows"),
                    ("success_count", "error_count", "skipped_count"),
                )
            },
        ),
        (
            _("Errors"),
            {
                "fields": (
                    "error_file",
                    "error_message",
                    "error_summary",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Timestamps"),
            {
                "fields": (
                    "started_at",
                    "completed_at",
                    "duration_display",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("User"),
            {
                "fields": (
                    "created_by",
                    "notes",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def import_type_display(self, obj):
        """Display import type with icon."""
        icons = {
            "ITEMS": "inventory_2",
            "LOCATIONS": "location_on",
            "INVENTORY": "warehouse",
            "ORDERS": "shopping_cart",
            "CATEGORIES": "category",
        }
        icon = icons.get(obj.import_type, "upload_file")
        return format_html(
            '<span style="display: inline-flex; align-items: center; gap: 4px;">'
            '<span class="material-symbols-outlined" style="font-size: 16px;">{}</span>'
            "{}</span>",
            icon,
            obj.get_import_type_display(),
        )

    import_type_display.short_description = _("Type")

    def status_badge(self, obj):
        """Display status with colored badge."""
        colors = {
            ImportStatus.PENDING: "#6c757d",
            ImportStatus.VALIDATING: "#17a2b8",
            ImportStatus.PROCESSING: "#ffc107",
            ImportStatus.COMPLETED: "#28a745",
            ImportStatus.COMPLETED_WITH_ERRORS: "#fd7e14",
            ImportStatus.FAILED: "#dc3545",
            ImportStatus.CANCELLED: "#6c757d",
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = _("Status")

    def progress_display(self, obj):
        """Display progress bar."""
        pct = obj.progress_percent
        if obj.total_rows == 0:
            return "-"

        if pct >= 100:
            color = "#28a745"
        elif pct >= 50:
            color = "#ffc107"
        else:
            color = "#17a2b8"

        return format_html(
            '<div style="width: 100px; background: #e9ecef; border-radius: 4px; overflow: hidden;">'
            '<div style="width: {}%; height: 8px; background: {};"></div>'
            "</div>"
            '<span style="font-size: 11px; color: #666;">{:.0f}%</span>',
            min(pct, 100),
            color,
            pct,
        )

    progress_display.short_description = _("Progress")

    def stats_display(self, obj):
        """Display success/error stats."""
        if obj.total_rows == 0:
            return "-"

        return format_html(
            '<span style="color: #28a745;">✓{}</span> / '
            '<span style="color: #dc3545;">✗{}</span> / '
            '<span style="color: #6c757d;">⊘{}</span>',
            obj.success_count,
            obj.error_count,
            obj.skipped_count,
        )

    stats_display.short_description = _("Success/Error/Skip")

    def duration_display(self, obj):
        """Display import duration."""
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

    def has_add_permission(self, request):
        """Disable adding imports manually - use API."""
        return False

    def has_change_permission(self, request, obj=None):
        """Only allow changing notes."""
        return True

    def has_delete_permission(self, request, obj=None):
        """Allow deleting old imports."""
        return True

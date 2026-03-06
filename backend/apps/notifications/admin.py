"""
Notification Admin
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from apps.core.choices import NotificationPriority, NotificationType

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "type_badge",
        "priority_badge",
        "user",
        "is_read",
        "created_at",
    ]
    list_filter = [
        "notification_type",
        "priority",
        "is_read",
        "organization",
        "created_at",
    ]
    search_fields = [
        "title",
        "message",
        "user__email",
        "user__first_name",
        "user__last_name",
    ]
    readonly_fields = ["created_at", "updated_at", "read_at"]
    raw_id_fields = ["organization", "user"]
    date_hierarchy = "created_at"

    fieldsets = (
        (None, {
            "fields": ("organization", "user", "notification_type", "priority"),
        }),
        (_("Content"), {
            "fields": ("title", "message", "link"),
        }),
        (_("Status"), {
            "fields": ("is_read", "read_at"),
        }),
        (_("Source"), {
            "fields": ("source_type", "source_id"),
            "classes": ("collapse",),
        }),
        (_("Timestamps"), {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    def type_badge(self, obj):
        colors = {
            NotificationType.ORDER_STATUS_CHANGED: "#007bff",
            NotificationType.ORDER_OVERDUE: "#dc3545",
            NotificationType.JOB_COMPLETED: "#28a745",
            NotificationType.JOB_FAILED: "#dc3545",
            NotificationType.LOW_STOCK_ALERT: "#ffc107",
            NotificationType.IMPORT_COMPLETED: "#28a745",
            NotificationType.IMPORT_FAILED: "#dc3545",
            NotificationType.DRONE_MAINTENANCE_DUE: "#fd7e14",
            NotificationType.BATTERY_LOW_HEALTH: "#e83e8c",
            NotificationType.NEW_MEMBER_JOINED: "#17a2b8",
            NotificationType.SYSTEM: "#6c757d",
        }
        color = colors.get(obj.notification_type, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_notification_type_display(),
        )

    type_badge.short_description = _("Type")

    def priority_badge(self, obj):
        colors = {
            NotificationPriority.LOW: "#28a745",
            NotificationPriority.NORMAL: "#17a2b8",
            NotificationPriority.HIGH: "#ffc107",
            NotificationPriority.URGENT: "#dc3545",
        }
        color = colors.get(obj.priority, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_priority_display(),
        )

    priority_badge.short_description = _("Priority")

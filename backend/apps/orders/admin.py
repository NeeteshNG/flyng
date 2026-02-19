"""
Orders Admin Configuration
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from unfold.admin import ModelAdmin, TabularInline

from apps.core.choices import OrderPriority, OrderStatus

from .models import PickOrder, PickOrderBatch, PickOrderLine


class PickOrderLineInline(TabularInline):
    """Inline for order lines."""

    model = PickOrderLine
    extra = 0
    fields = [
        "line_number",
        "item",
        "source_bin",
        "quantity",
        "picked_quantity",
        "is_picked",
        "picked_by",
    ]
    readonly_fields = ["picked_quantity", "is_picked", "picked_by"]
    raw_id_fields = ["item", "source_bin", "stock"]
    ordering = ["line_number"]


class PickOrderInline(TabularInline):
    """Inline for orders in a batch."""

    model = PickOrder
    extra = 0
    fields = [
        "order_number",
        "status",
        "priority",
        "customer_name",
        "due_date",
    ]
    readonly_fields = ["order_number", "status", "priority", "customer_name", "due_date"]
    show_change_link = True
    can_delete = False
    max_num = 0  # Don't allow adding new orders through inline


@admin.register(PickOrder)
class PickOrderAdmin(ModelAdmin):
    """Admin for PickOrder model."""

    list_display = [
        "order_number",
        "organization",
        "warehouse",
        "status_badge",
        "priority_badge",
        "customer_name",
        "lines_progress",
        "due_date_display",
        "assigned_to",
    ]
    list_filter = [
        "status",
        "priority",
        "organization",
        "warehouse",
        "batch",
    ]
    search_fields = [
        "order_number",
        "external_reference",
        "customer_name",
        "customer_code",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "confirmed_at",
        "picking_started_at",
        "picking_completed_at",
        "packed_at",
        "shipped_at",
        "delivered_at",
        "cancelled_at",
        "pick_progress_display",
    ]
    raw_id_fields = [
        "organization",
        "warehouse",
        "batch",
        "assigned_to",
        "created_by",
    ]
    date_hierarchy = "order_date"
    inlines = [PickOrderLineInline]

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "organization",
                    "warehouse",
                    "order_number",
                    "external_reference",
                    "batch",
                )
            },
        ),
        (
            _("Status"),
            {
                "fields": (
                    "status",
                    "priority",
                    "pick_progress_display",
                )
            },
        ),
        (
            _("Customer"),
            {
                "fields": (
                    "customer_name",
                    "customer_code",
                )
            },
        ),
        (
            _("Shipping Address"),
            {
                "fields": (
                    "shipping_address_line1",
                    "shipping_address_line2",
                    "shipping_city",
                    "shipping_state",
                    "shipping_postal_code",
                    "shipping_country",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Dates"),
            {
                "fields": (
                    "order_date",
                    "due_date",
                )
            },
        ),
        (
            _("Assignment"),
            {
                "fields": (
                    "assigned_to",
                    "created_by",
                )
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
            _("Cancellation"),
            {
                "fields": ("cancellation_reason",),
                "classes": ("collapse",),
            },
        ),
        (
            _("Timestamps"),
            {
                "fields": (
                    "confirmed_at",
                    "picking_started_at",
                    "picking_completed_at",
                    "packed_at",
                    "shipped_at",
                    "delivered_at",
                    "cancelled_at",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def status_badge(self, obj):
        """Display status with colored badge."""
        colors = {
            OrderStatus.PENDING: "#6c757d",
            OrderStatus.CONFIRMED: "#17a2b8",
            OrderStatus.PICKING: "#ffc107",
            OrderStatus.PICKED: "#28a745",
            OrderStatus.PACKING: "#fd7e14",
            OrderStatus.PACKED: "#6f42c1",
            OrderStatus.SHIPPED: "#007bff",
            OrderStatus.DELIVERED: "#20c997",
            OrderStatus.CANCELLED: "#dc3545",
            OrderStatus.ON_HOLD: "#e83e8c",
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

    def lines_progress(self, obj):
        """Display picking progress."""
        total = obj.total_lines
        picked = obj.picked_lines
        if total == 0:
            return "-"

        pct = obj.pick_progress_percent
        if pct >= 100:
            color = "#28a745"
        elif pct >= 50:
            color = "#ffc107"
        else:
            color = "#6c757d"

        return format_html(
            '<span style="color: {};">{}/{} ({:.0f}%)</span>',
            color,
            picked,
            total,
            pct,
        )

    lines_progress.short_description = _("Lines")

    def due_date_display(self, obj):
        """Display due date with overdue indicator."""
        if not obj.due_date:
            return "-"
        if obj.is_overdue:
            return format_html(
                '<span style="color: #dc3545; font-weight: bold;">{} (Overdue)</span>',
                obj.due_date,
            )
        return obj.due_date

    due_date_display.short_description = _("Due Date")

    def pick_progress_display(self, obj):
        """Display detailed picking progress."""
        return f"{obj.picked_quantity}/{obj.total_quantity} items ({obj.pick_progress_percent}%)"

    pick_progress_display.short_description = _("Pick Progress")


@admin.register(PickOrderLine)
class PickOrderLineAdmin(ModelAdmin):
    """Admin for PickOrderLine model."""

    list_display = [
        "order",
        "line_number",
        "item",
        "source_bin",
        "quantity_display",
        "pick_status",
        "picked_by",
        "picked_at",
    ]
    list_filter = [
        "is_picked",
        "order__status",
        "order__warehouse",
    ]
    search_fields = [
        "order__order_number",
        "item__sku",
        "item__name",
        "source_bin__code",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "picked_at",
    ]
    raw_id_fields = [
        "order",
        "item",
        "source_bin",
        "stock",
        "picked_by",
    ]

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "order",
                    "line_number",
                    "item",
                    "source_bin",
                    "stock",
                )
            },
        ),
        (
            _("Quantity"),
            {
                "fields": (
                    "quantity",
                    "picked_quantity",
                )
            },
        ),
        (
            _("Pick Status"),
            {
                "fields": (
                    "is_picked",
                    "picked_at",
                    "picked_by",
                )
            },
        ),
        (
            _("Tracking"),
            {
                "fields": ("lot_number",),
                "classes": ("collapse",),
            },
        ),
        (
            _("Notes"),
            {
                "fields": (
                    "notes",
                    "pick_notes",
                ),
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

    def quantity_display(self, obj):
        """Display quantity with picked status."""
        if obj.is_picked:
            if obj.has_shortage:
                return format_html(
                    '<span style="color: #ffc107;">{}/{} (short {})</span>',
                    obj.picked_quantity,
                    obj.quantity,
                    obj.shortage_quantity,
                )
            return format_html(
                '<span style="color: #28a745;">{}/{}</span>',
                obj.picked_quantity,
                obj.quantity,
            )
        return f"0/{obj.quantity}"

    quantity_display.short_description = _("Picked/Qty")

    def pick_status(self, obj):
        """Display pick status badge."""
        if obj.is_picked:
            if obj.is_fully_picked:
                return format_html(
                    '<span style="background-color: #28a745; color: white; padding: 3px 8px; '
                    'border-radius: 3px; font-size: 11px;">Complete</span>'
                )
            return format_html(
                '<span style="background-color: #ffc107; color: black; padding: 3px 8px; '
                'border-radius: 3px; font-size: 11px;">Partial</span>'
            )
        return format_html(
            '<span style="background-color: #6c757d; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">Pending</span>'
        )

    pick_status.short_description = _("Status")


@admin.register(PickOrderBatch)
class PickOrderBatchAdmin(ModelAdmin):
    """Admin for PickOrderBatch model."""

    list_display = [
        "batch_number",
        "name",
        "organization",
        "warehouse",
        "order_count_display",
        "progress_display",
        "completion_status",
        "assigned_to",
    ]
    list_filter = [
        "is_completed",
        "organization",
        "warehouse",
    ]
    search_fields = [
        "batch_number",
        "name",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "completed_at",
        "order_count_display",
        "progress_display",
    ]
    raw_id_fields = [
        "organization",
        "warehouse",
        "assigned_to",
        "created_by",
    ]
    inlines = [PickOrderInline]

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "organization",
                    "warehouse",
                    "batch_number",
                    "name",
                    "description",
                )
            },
        ),
        (
            _("Status"),
            {
                "fields": (
                    "is_completed",
                    "completed_at",
                    "order_count_display",
                    "progress_display",
                )
            },
        ),
        (
            _("Assignment"),
            {
                "fields": (
                    "assigned_to",
                    "created_by",
                )
            },
        ),
        (
            _("Notes"),
            {
                "fields": ("notes",),
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

    def order_count_display(self, obj):
        """Display order count."""
        return obj.order_count

    order_count_display.short_description = _("Orders")

    def progress_display(self, obj):
        """Display batch progress."""
        total = obj.total_lines
        picked = obj.picked_lines
        if total == 0:
            return "-"

        pct = obj.progress_percent
        if pct >= 100:
            color = "#28a745"
        elif pct >= 50:
            color = "#ffc107"
        else:
            color = "#6c757d"

        return format_html(
            '<span style="color: {};">{}/{} lines ({:.0f}%)</span>',
            color,
            picked,
            total,
            pct,
        )

    progress_display.short_description = _("Progress")

    def completion_status(self, obj):
        """Display completion status badge."""
        if obj.is_completed:
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 3px 8px; '
                'border-radius: 3px; font-size: 11px;">Completed</span>'
            )
        return format_html(
            '<span style="background-color: #17a2b8; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">In Progress</span>'
        )

    completion_status.short_description = _("Status")

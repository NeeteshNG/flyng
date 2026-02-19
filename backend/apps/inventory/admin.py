"""
Inventory Admin Configuration
"""

from django.contrib import admin
from django.db.models import Sum
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from unfold.admin import ModelAdmin, TabularInline

from .models import (
    BinLabelType,
    InventoryItem,
    InventoryStock,
    ItemCategory,
    StorageBin,
    StorageBinTemplate,
    StorageLocation,
)


class StorageBinInline(TabularInline):
    """Inline for storage bins at a location."""

    model = StorageBin
    extra = 0
    fields = [
        "code",
        "template",
        "label_value",
        "position_index",
        "item_count",
        "is_full",
        "is_active",
    ]
    readonly_fields = ["item_count"]
    raw_id_fields = ["template"]


class InventoryStockInline(TabularInline):
    """Inline for stock in a bin."""

    model = InventoryStock
    extra = 0
    fields = [
        "item",
        "quantity",
        "reserved_quantity",
        "lot_number",
        "expiry_date",
    ]
    raw_id_fields = ["item"]
    readonly_fields = ["reserved_quantity"]


class ChildCategoryInline(TabularInline):
    """Inline for child categories."""

    model = ItemCategory
    fk_name = "parent"
    extra = 0
    fields = ["name", "code", "display_order", "is_active"]
    verbose_name = _("Child Category")
    verbose_name_plural = _("Child Categories")


@admin.register(StorageLocation)
class StorageLocationAdmin(ModelAdmin):
    """Admin for StorageLocation model."""

    list_display = [
        "code",
        "zone",
        "full_address_display",
        "location_type",
        "bin_count",
        "is_full",
        "is_accessible",
        "is_active",
    ]
    list_filter = [
        "location_type",
        "is_full",
        "is_accessible",
        "is_active",
        "zone__warehouse",
    ]
    search_fields = [
        "code",
        "aisle",
        "rack",
        "level",
        "zone__name",
    ]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["zone"]
    inlines = [StorageBinInline]

    fieldsets = (
        (None, {"fields": ("zone", "code", "location_type")}),
        (_("Position"), {"fields": ("aisle", "rack", "level", "position")}),
        (
            _("3D Coordinates"),
            {
                "fields": ("x_coordinate", "y_coordinate", "z_coordinate"),
                "classes": ("collapse",),
            },
        ),
        (_("Capacity"), {"fields": ("max_bins", "is_full")}),
        (_("Status"), {"fields": ("is_accessible", "is_active")}),
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

    def full_address_display(self, obj):
        """Display full location address."""
        return obj.full_address

    full_address_display.short_description = _("Address")

    def bin_count(self, obj):
        """Display number of bins at location."""
        count = obj.bins.filter(is_active=True).count()
        return f"{count} / {obj.max_bins}"

    bin_count.short_description = _("Bins")


@admin.register(BinLabelType)
class BinLabelTypeAdmin(ModelAdmin):
    """Admin for BinLabelType model."""

    list_display = [
        "name",
        "organization",
        "label_type_display",
        "marker_size_mm",
        "is_active",
    ]
    list_filter = ["label_type", "is_active", "organization"]
    search_fields = ["name", "organization__name"]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["organization"]

    fieldsets = (
        (None, {"fields": ("organization", "name", "label_type", "is_active")}),
        (
            _("ArUco Settings"),
            {
                "fields": ("dictionary_size", "marker_size_mm"),
                "classes": ("collapse",),
            },
        ),
        (
            _("Configuration"),
            {
                "fields": ("config",),
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

    def label_type_display(self, obj):
        """Display label type with badge."""
        colors = {
            0: "#6366f1",  # ArUco - indigo
            1: "#10b981",  # QR - green
        }
        color = colors.get(obj.label_type, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_label_type_display(),
        )

    label_type_display.short_description = _("Type")


@admin.register(StorageBinTemplate)
class StorageBinTemplateAdmin(ModelAdmin):
    """Admin for StorageBinTemplate model."""

    list_display = [
        "name",
        "organization",
        "label_type",
        "dimensions_display",
        "max_weight_kg",
        "is_active",
    ]
    list_filter = ["is_active", "organization", "label_type"]
    search_fields = ["name", "organization__name"]
    readonly_fields = ["created_at", "updated_at", "volume_display"]
    raw_id_fields = ["organization", "label_type"]

    fieldsets = (
        (None, {"fields": ("organization", "name", "description", "label_type", "is_active")}),
        (_("Dimensions"), {"fields": ("width", "height", "depth", "volume_display")}),
        (_("Capacity"), {"fields": ("max_weight_kg", "coordinate_type")}),
        (
            _("Configuration"),
            {
                "fields": ("config",),
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

    def dimensions_display(self, obj):
        """Display formatted dimensions."""
        return f"{obj.width} × {obj.height} × {obj.depth} cm"

    dimensions_display.short_description = _("Dimensions")

    def volume_display(self, obj):
        """Display calculated volume."""
        return f"{obj.volume_cm3:,.0f} cm³"

    volume_display.short_description = _("Volume")


@admin.register(StorageBin)
class StorageBinAdmin(ModelAdmin):
    """Admin for StorageBin model."""

    list_display = [
        "code",
        "location",
        "template",
        "label_value",
        "stock_count",
        "weight_status",
        "is_full",
        "is_active",
    ]
    list_filter = [
        "is_full",
        "is_active",
        "template",
        "location__zone__warehouse",
    ]
    search_fields = [
        "code",
        "label_value",
        "location__code",
    ]
    readonly_fields = ["created_at", "updated_at", "item_count"]
    raw_id_fields = ["location", "template"]
    inlines = [InventoryStockInline]

    fieldsets = (
        (None, {"fields": ("location", "template", "code", "label_value")}),
        (_("Position"), {"fields": ("position_index",)}),
        (_("Status"), {"fields": ("current_weight_kg", "item_count", "is_full", "is_active")}),
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

    def stock_count(self, obj):
        """Display number of stock records."""
        return obj.stocks.filter(quantity__gt=0).count()

    stock_count.short_description = _("Items")

    def weight_status(self, obj):
        """Display weight utilization."""
        pct = obj.weight_utilization_percent
        if pct >= 90:
            color = "#dc3545"
        elif pct >= 70:
            color = "#ffc107"
        else:
            color = "#28a745"

        return format_html('<span style="color: {};">{:.1f}% ({:.1f} kg)</span>', color, pct, obj.current_weight_kg)

    weight_status.short_description = _("Weight")


@admin.register(ItemCategory)
class ItemCategoryAdmin(ModelAdmin):
    """Admin for ItemCategory model."""

    list_display = [
        "name",
        "code",
        "organization",
        "parent",
        "level",
        "item_count",
        "is_active",
    ]
    list_filter = ["level", "is_active", "organization"]
    search_fields = ["name", "code", "organization__name"]
    readonly_fields = ["created_at", "updated_at", "level", "full_path_display"]
    raw_id_fields = ["organization", "parent"]
    inlines = [ChildCategoryInline]

    fieldsets = (
        (None, {"fields": ("organization", "name", "code", "description")}),
        (_("Hierarchy"), {"fields": ("parent", "level", "full_path_display")}),
        (_("Display"), {"fields": ("display_order", "is_active")}),
        (
            _("Timestamps"),
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def item_count(self, obj):
        """Display number of items in category."""
        return obj.items.filter(is_active=True).count()

    item_count.short_description = _("Items")

    def full_path_display(self, obj):
        """Display full category path."""
        return obj.full_path

    full_path_display.short_description = _("Full Path")


@admin.register(InventoryItem)
class InventoryItemAdmin(ModelAdmin):
    """Admin for InventoryItem model."""

    list_display = [
        "sku",
        "name",
        "category",
        "organization",
        "total_stock",
        "stock_status",
        "unit_of_measure",
        "is_active",
    ]
    list_filter = [
        "unit_of_measure",
        "is_active",
        "category",
        "organization",
    ]
    search_fields = [
        "sku",
        "name",
        "barcode",
        "description",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "volume_display",
    ]
    raw_id_fields = ["organization", "category"]

    fieldsets = (
        (None, {"fields": ("organization", "sku", "name", "category", "is_active")}),
        (
            _("Description"),
            {
                "fields": ("description", "barcode", "image"),
            },
        ),
        (
            _("Physical Attributes"),
            {
                "fields": (
                    "weight_kg",
                    ("length_cm", "width_cm", "height_cm"),
                    "volume_display",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Units & Pricing"),
            {
                "fields": ("unit_of_measure", "unit_price"),
            },
        ),
        (
            _("Stock Management"),
            {
                "fields": ("min_stock_level", "reorder_point", "reorder_quantity"),
            },
        ),
        (
            _("Audit"),
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def total_stock(self, obj):
        """Display total stock quantity."""
        total = obj.stocks.aggregate(total=Sum("quantity"))["total"] or 0
        return total

    total_stock.short_description = _("Total Stock")

    def stock_status(self, obj):
        """Display stock status with color."""
        total = obj.stocks.aggregate(total=Sum("quantity"))["total"] or 0

        if total <= 0:
            return format_html('<span style="color: #dc3545;">Out of Stock</span>')
        elif total < obj.min_stock_level:
            return format_html('<span style="color: #ffc107;">Low Stock</span>')
        else:
            return format_html('<span style="color: #28a745;">In Stock</span>')

    stock_status.short_description = _("Status")

    def volume_display(self, obj):
        """Display calculated volume."""
        vol = obj.volume_cm3
        if vol:
            return f"{vol:,.1f} cm³"
        return "-"

    volume_display.short_description = _("Volume")


@admin.register(InventoryStock)
class InventoryStockAdmin(ModelAdmin):
    """Admin for InventoryStock model."""

    list_display = [
        "item",
        "bin",
        "quantity",
        "reserved_quantity",
        "available_display",
        "lot_number",
        "expiry_status",
    ]
    list_filter = [
        "bin__location__zone__warehouse",
        "item__category",
    ]
    search_fields = [
        "item__sku",
        "item__name",
        "bin__code",
        "lot_number",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "available_display",
        "total_weight_display",
    ]
    raw_id_fields = ["bin", "item"]
    date_hierarchy = "created_at"

    fieldsets = (
        (None, {"fields": ("bin", "item")}),
        (
            _("Quantity"),
            {
                "fields": (
                    "quantity",
                    "reserved_quantity",
                    "available_display",
                )
            },
        ),
        (
            _("Lot & Expiry"),
            {
                "fields": (
                    "lot_number",
                    "manufacture_date",
                    "expiry_date",
                ),
            },
        ),
        (
            _("Tracking"),
            {
                "fields": ("received_at", "last_counted_at"),
            },
        ),
        (
            _("Weight"),
            {
                "fields": ("total_weight_display",),
                "classes": ("collapse",),
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
            _("Audit"),
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def available_display(self, obj):
        """Display available quantity."""
        return obj.available_quantity

    available_display.short_description = _("Available")

    def total_weight_display(self, obj):
        """Display total weight."""
        weight = obj.total_weight_kg
        if weight:
            return f"{weight:,.2f} kg"
        return "-"

    total_weight_display.short_description = _("Total Weight")

    def expiry_status(self, obj):
        """Display expiry status with color."""
        if not obj.expiry_date:
            return "-"

        if obj.is_expired:
            return format_html('<span style="color: #dc3545;">Expired</span>')

        from django.utils import timezone

        days_left = (obj.expiry_date - timezone.now().date()).days

        if days_left <= 30:
            return format_html('<span style="color: #ffc107;">{} days</span>', days_left)

        return format_html('<span style="color: #28a745;">{}</span>', obj.expiry_date)

    expiry_status.short_description = _("Expiry")

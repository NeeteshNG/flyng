"""
Inventory Managers

Custom managers for inventory-related models with optimized queries.
"""
from django.db import models


class StorageLocationManager(models.Manager):
    """Manager for StorageLocation with optimized queries."""

    def get_queryset(self):
        """Return queryset with related objects pre-fetched."""
        return super().get_queryset().select_related(
            'zone',
            'zone__warehouse',
        )

    def active(self):
        """Return active storage locations."""
        return self.get_queryset().filter(is_active=True)

    def for_zone(self, zone):
        """Return locations in a specific zone."""
        return self.get_queryset().filter(zone=zone)

    def for_warehouse(self, warehouse):
        """Return locations in a specific warehouse."""
        return self.get_queryset().filter(zone__warehouse=warehouse)

    def by_type(self, location_type):
        """Return locations of a specific type."""
        return self.get_queryset().filter(location_type=location_type)

    def available(self):
        """Return locations that have available capacity."""
        return self.active().filter(is_full=False)


class BinLabelTypeManager(models.Manager):
    """Manager for BinLabelType with optimized queries."""

    def get_queryset(self):
        """Return queryset with related objects pre-fetched."""
        return super().get_queryset().select_related('organization')

    def active(self):
        """Return active label types."""
        return self.get_queryset().filter(is_active=True)

    def for_organization(self, organization):
        """Return label types for a specific organization."""
        return self.get_queryset().filter(organization=organization)


class StorageBinTemplateManager(models.Manager):
    """Manager for StorageBinTemplate with optimized queries."""

    def get_queryset(self):
        """Return queryset with related objects pre-fetched."""
        return super().get_queryset().select_related(
            'organization',
            'label_type',
        )

    def active(self):
        """Return active templates."""
        return self.get_queryset().filter(is_active=True)

    def for_organization(self, organization):
        """Return templates for a specific organization."""
        return self.get_queryset().filter(organization=organization)

    def for_label_type(self, label_type):
        """Return templates using a specific label type."""
        return self.get_queryset().filter(label_type=label_type)


class StorageBinManager(models.Manager):
    """Manager for StorageBin with optimized queries."""

    def get_queryset(self):
        """Return queryset with related objects pre-fetched."""
        return super().get_queryset().select_related(
            'location',
            'location__zone',
            'template',
        )

    def active(self):
        """Return active bins."""
        return self.get_queryset().filter(is_active=True)

    def for_location(self, location):
        """Return bins at a specific location."""
        return self.get_queryset().filter(location=location)

    def for_zone(self, zone):
        """Return bins in a specific zone."""
        return self.get_queryset().filter(location__zone=zone)

    def available(self):
        """Return bins that are not full."""
        return self.active().filter(is_full=False)

    def empty(self):
        """Return empty bins."""
        return self.active().filter(item_count=0)

    def with_stock(self):
        """Return bins with inventory."""
        return self.active().filter(item_count__gt=0)


class ItemCategoryManager(models.Manager):
    """Manager for ItemCategory with optimized queries."""

    def get_queryset(self):
        """Return queryset with related objects pre-fetched."""
        return super().get_queryset().select_related(
            'organization',
            'parent',
        )

    def active(self):
        """Return active categories."""
        return self.get_queryset().filter(is_active=True)

    def for_organization(self, organization):
        """Return categories for a specific organization."""
        return self.get_queryset().filter(organization=organization)

    def root_categories(self):
        """Return top-level categories (no parent)."""
        return self.active().filter(parent__isnull=True)

    def children_of(self, parent):
        """Return direct children of a category."""
        return self.active().filter(parent=parent)


class InventoryItemManager(models.Manager):
    """Manager for InventoryItem with optimized queries."""

    def get_queryset(self):
        """Return queryset with related objects pre-fetched."""
        return super().get_queryset().select_related(
            'organization',
            'category',
            'created_by',
            'updated_by',
        )

    def active(self):
        """Return active items."""
        return self.get_queryset().filter(is_active=True)

    def for_organization(self, organization):
        """Return items for a specific organization."""
        return self.get_queryset().filter(organization=organization)

    def for_category(self, category):
        """Return items in a specific category."""
        return self.get_queryset().filter(category=category)

    def by_sku(self, sku):
        """Return item by SKU."""
        return self.get_queryset().filter(sku=sku).first()

    def low_stock(self):
        """Return items below minimum stock level."""
        from django.db.models import Sum
        return self.active().annotate(
            total_stock=Sum('stocks__quantity')
        ).filter(
            total_stock__lt=models.F('min_stock_level')
        )

    def searchable(self, query):
        """Search items by SKU, name, or barcode."""
        return self.active().filter(
            models.Q(sku__icontains=query) |
            models.Q(name__icontains=query) |
            models.Q(barcode__icontains=query)
        )


class InventoryStockManager(models.Manager):
    """Manager for InventoryStock with optimized queries."""

    def get_queryset(self):
        """Return queryset with related objects pre-fetched."""
        return super().get_queryset().select_related(
            'bin',
            'bin__location',
            'item',
            'created_by',
            'updated_by',
        )

    def for_item(self, item):
        """Return stock records for a specific item."""
        return self.get_queryset().filter(item=item)

    def for_bin(self, bin):
        """Return stock records in a specific bin."""
        return self.get_queryset().filter(bin=bin)

    def for_location(self, location):
        """Return stock in a specific location."""
        return self.get_queryset().filter(bin__location=location)

    def for_zone(self, zone):
        """Return stock in a specific zone."""
        return self.get_queryset().filter(bin__location__zone=zone)

    def with_quantity(self):
        """Return records with positive quantity."""
        return self.get_queryset().filter(quantity__gt=0)

    def expiring_soon(self, days=30):
        """Return stock expiring within N days."""
        from django.utils import timezone
        cutoff = timezone.now().date() + timezone.timedelta(days=days)
        return self.get_queryset().filter(
            expiry_date__isnull=False,
            expiry_date__lte=cutoff,
        )

    def expired(self):
        """Return expired stock."""
        from django.utils import timezone
        return self.get_queryset().filter(
            expiry_date__isnull=False,
            expiry_date__lt=timezone.now().date(),
        )

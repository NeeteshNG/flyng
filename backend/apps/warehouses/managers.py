"""
Custom Managers for Warehouse Models
"""
from django.db import models


class WarehouseManager(models.Manager):
    """Custom manager for Warehouse model."""

    def get_queryset(self):
        """Return queryset with related objects prefetched."""
        return super().get_queryset().select_related(
            'organization',
            'profile',
        )

    def active(self):
        """Return only active warehouses."""
        return self.get_queryset().filter(is_active=True)

    def for_organization(self, organization):
        """Return warehouses for a specific organization."""
        return self.active().filter(organization=organization)

    def with_contacts(self):
        """Return warehouses with contacts prefetched."""
        return self.get_queryset().prefetch_related('contacts')


class WarehouseContactManager(models.Manager):
    """Custom manager for WarehouseContact model."""

    def get_queryset(self):
        """Return queryset with related warehouse."""
        return super().get_queryset().select_related('warehouse')

    def primary(self):
        """Return only primary contacts."""
        return self.get_queryset().filter(is_primary=True)

    def for_warehouse(self, warehouse):
        """Return contacts for a specific warehouse."""
        return self.get_queryset().filter(warehouse=warehouse)

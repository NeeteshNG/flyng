"""
Custom Managers for Warehouse Models
"""

from django.db import models


class WarehouseManager(models.Manager):
    """Custom manager for Warehouse model."""

    def get_queryset(self):
        """Return queryset with related objects prefetched."""
        return (
            super()
            .get_queryset()
            .select_related(
                "organization",
                "profile",
            )
        )

    def active(self):
        """Return only active warehouses."""
        return self.get_queryset().filter(is_active=True)

    def for_organization(self, organization):
        """Return warehouses for a specific organization."""
        return self.active().filter(organization=organization)

    def with_contacts(self):
        """Return warehouses with contacts prefetched."""
        return self.get_queryset().prefetch_related("contacts")


class WarehouseContactManager(models.Manager):
    """Custom manager for WarehouseContact model."""

    def get_queryset(self):
        """Return queryset with related warehouse."""
        return super().get_queryset().select_related("warehouse")

    def primary(self):
        """Return only primary contacts."""
        return self.get_queryset().filter(is_primary=True)

    def for_warehouse(self, warehouse):
        """Return contacts for a specific warehouse."""
        return self.get_queryset().filter(warehouse=warehouse)


class WarehouseZoneManager(models.Manager):
    """Custom manager for WarehouseZone model."""

    def get_queryset(self):
        """Return queryset with related warehouse prefetched."""
        return super().get_queryset().select_related("warehouse")

    def active(self):
        """Return only active zones."""
        return self.get_queryset().filter(is_active=True)

    def for_warehouse(self, warehouse):
        """Return zones for a specific warehouse."""
        return self.active().filter(warehouse=warehouse)

    def by_type(self, zone_type):
        """Return zones of a specific type."""
        return self.active().filter(zone_type=zone_type)

    def flyable(self):
        """Return zones where drones can fly (not no-fly zones)."""
        return self.active().filter(is_no_fly_zone=False)


class GroundControlStationManager(models.Manager):
    """Custom manager for GroundControlStation model."""

    def get_queryset(self):
        """Return queryset with related zone and warehouse prefetched."""
        return (
            super()
            .get_queryset()
            .select_related(
                "zone",
                "zone__warehouse",
            )
        )

    def active(self):
        """Return only active GCS stations."""
        return self.get_queryset().filter(is_active=True)

    def online(self):
        """Return only online GCS stations."""
        from apps.core.choices import GCSStatus

        return self.active().filter(status=GCSStatus.ONLINE)

    def for_zone(self, zone):
        """Return GCS stations for a specific zone."""
        return self.active().filter(zone=zone)

    def for_warehouse(self, warehouse):
        """Return GCS stations for a specific warehouse."""
        return self.active().filter(zone__warehouse=warehouse)

    def with_work_areas(self):
        """Return GCS stations with work areas prefetched."""
        return self.get_queryset().prefetch_related("work_areas")


class DroneWorkAreaManager(models.Manager):
    """Custom manager for DroneWorkArea model."""

    def get_queryset(self):
        """Return queryset with related GCS, zone, and warehouse prefetched."""
        return (
            super()
            .get_queryset()
            .select_related(
                "ground_control_station",
                "ground_control_station__zone",
                "ground_control_station__zone__warehouse",
            )
        )

    def active(self):
        """Return only active work areas."""
        return self.get_queryset().filter(is_active=True)

    def tethered(self):
        """Return only tethered work areas."""
        from apps.core.choices import DroneWorkAreaType

        return self.active().filter(area_type=DroneWorkAreaType.TETHERED)

    def untethered(self):
        """Return only untethered work areas."""
        from apps.core.choices import DroneWorkAreaType

        return self.active().filter(area_type=DroneWorkAreaType.UNTETHERED)

    def for_gcs(self, gcs):
        """Return work areas for a specific GCS."""
        return self.active().filter(ground_control_station=gcs)

    def for_zone(self, zone):
        """Return work areas for a specific zone."""
        return self.active().filter(ground_control_station__zone=zone)

    def for_warehouse(self, warehouse):
        """Return work areas for a specific warehouse."""
        return self.active().filter(ground_control_station__zone__warehouse=warehouse)

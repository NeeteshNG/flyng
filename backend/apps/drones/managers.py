"""
Custom Managers for Drone Models
"""

from django.db import models


class DroneManager(models.Manager):
    """Custom manager for Drone model."""

    def get_queryset(self):
        """Return queryset with related objects prefetched."""
        return (
            super()
            .get_queryset()
            .select_related(
                "work_area",
                "work_area__ground_control_station",
                "work_area__ground_control_station__zone",
                "work_area__ground_control_station__zone__warehouse",
                "current_battery",
            )
        )

    def active(self):
        """Return only active drones."""
        return self.get_queryset().filter(is_active=True)

    def available(self):
        """Return drones available for jobs."""
        from apps.core.choices import DroneStatus

        return self.active().filter(status=DroneStatus.AVAILABLE)

    def in_flight(self):
        """Return drones currently in flight."""
        from apps.core.choices import DroneStatus

        return self.active().filter(status=DroneStatus.IN_FLIGHT)

    def for_work_area(self, work_area):
        """Return drones for a specific work area."""
        return self.active().filter(work_area=work_area)

    def for_zone(self, zone):
        """Return drones for a specific zone."""
        return self.active().filter(work_area__ground_control_station__zone=zone)

    def for_warehouse(self, warehouse):
        """Return drones for a specific warehouse."""
        return self.active().filter(work_area__ground_control_station__zone__warehouse=warehouse)

    def by_status(self, status):
        """Return drones with a specific status."""
        return self.active().filter(status=status)

    def needing_maintenance(self):
        """Return drones that need maintenance."""
        from django.utils import timezone

        return self.active().filter(next_maintenance_due__lte=timezone.now())


class DroneTelemetryLogManager(models.Manager):
    """Custom manager for DroneTelemetryLog model."""

    def get_queryset(self):
        """Return queryset with drone prefetched."""
        return super().get_queryset().select_related("drone")

    def for_drone(self, drone):
        """Return telemetry for a specific drone."""
        return self.get_queryset().filter(drone=drone)

    def recent(self, hours=24):
        """Return telemetry from the last N hours."""
        from datetime import timedelta

        from django.utils import timezone

        cutoff = timezone.now() - timedelta(hours=hours)
        return self.get_queryset().filter(timestamp__gte=cutoff)

    def latest_for_drone(self, drone):
        """Return the most recent telemetry for a drone."""
        return self.for_drone(drone).order_by("-timestamp").first()


class DroneMaintenanceRecordManager(models.Manager):
    """Custom manager for DroneMaintenanceRecord model."""

    def get_queryset(self):
        """Return queryset with related objects prefetched."""
        return (
            super()
            .get_queryset()
            .select_related(
                "drone",
                "performed_by",
            )
        )

    def for_drone(self, drone):
        """Return maintenance records for a specific drone."""
        return self.get_queryset().filter(drone=drone)

    def completed(self):
        """Return completed maintenance records."""
        return self.get_queryset().filter(completed_at__isnull=False)

    def pending(self):
        """Return pending maintenance records."""
        return self.get_queryset().filter(completed_at__isnull=True)

    def by_type(self, maintenance_type):
        """Return records of a specific maintenance type."""
        return self.get_queryset().filter(maintenance_type=maintenance_type)

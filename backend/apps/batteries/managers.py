"""
Battery Managers

Custom managers for battery-related models with optimized queries.
"""

from django.db import models
from django.utils import timezone


class DroneBatteryManager(models.Manager):
    """Manager for DroneBattery with optimized queries."""

    def get_queryset(self):
        """Return queryset with related objects pre-fetched."""
        return (
            super()
            .get_queryset()
            .select_related(
                "warehouse",
                "created_by",
                "updated_by",
            )
        )

    def available(self):
        """Return batteries available for use."""
        return self.get_queryset().filter(
            status="AVAILABLE",
            is_active=True,
        )

    def in_use(self):
        """Return batteries currently in use (attached to drones)."""
        return self.get_queryset().filter(status="IN_USE")

    def charging(self):
        """Return batteries currently charging."""
        return self.get_queryset().filter(status="CHARGING")

    def for_warehouse(self, warehouse):
        """Return batteries belonging to a specific warehouse."""
        return self.get_queryset().filter(warehouse=warehouse)

    def needing_replacement(self):
        """Return batteries that need replacement."""
        return self.get_queryset().filter(
            models.Q(health_status="REPLACE") | models.Q(health_status="POOR") | models.Q(status="FAULTY")
        )

    def low_charge(self, threshold=20):
        """Return batteries with charge below threshold."""
        return self.get_queryset().filter(
            current_charge_percent__lt=threshold,
            status__in=["AVAILABLE", "IN_USE"],
        )

    def healthy(self):
        """Return batteries in good or excellent condition."""
        return self.get_queryset().filter(
            health_status__in=["EXCELLENT", "GOOD"],
            is_active=True,
        )


class BatteryChargingSessionManager(models.Manager):
    """Manager for BatteryChargingSession with optimized queries."""

    def get_queryset(self):
        """Return queryset with related objects pre-fetched."""
        return (
            super()
            .get_queryset()
            .select_related(
                "battery",
                "battery__warehouse",
            )
        )

    def for_battery(self, battery):
        """Return charging sessions for a specific battery."""
        return self.get_queryset().filter(battery=battery)

    def active(self):
        """Return currently active charging sessions."""
        return self.get_queryset().filter(
            status__in=["STARTED", "CHARGING"],
        )

    def completed(self):
        """Return completed charging sessions."""
        return self.get_queryset().filter(status="COMPLETED")

    def recent(self, days=7):
        """Return sessions from the last N days."""
        cutoff = timezone.now() - timezone.timedelta(days=days)
        return self.get_queryset().filter(started_at__gte=cutoff)

    def failed(self):
        """Return failed or interrupted charging sessions."""
        return self.get_queryset().filter(
            status__in=["FAILED", "INTERRUPTED"],
        )


class BatterySwapRecordManager(models.Manager):
    """Manager for BatterySwapRecord with optimized queries."""

    def get_queryset(self):
        """Return queryset with related objects pre-fetched."""
        return (
            super()
            .get_queryset()
            .select_related(
                "drone",
                "old_battery",
                "new_battery",
                "performed_by",
            )
        )

    def for_drone(self, drone):
        """Return swap records for a specific drone."""
        return self.get_queryset().filter(drone=drone)

    def for_battery(self, battery):
        """Return swap records involving a specific battery."""
        return self.get_queryset().filter(models.Q(old_battery=battery) | models.Q(new_battery=battery))

    def recent(self, days=7):
        """Return records from the last N days."""
        cutoff = timezone.now() - timezone.timedelta(days=days)
        return self.get_queryset().filter(swapped_at__gte=cutoff)

    def by_reason(self, reason):
        """Return swap records filtered by reason."""
        return self.get_queryset().filter(swap_reason=reason)

    def emergency_swaps(self):
        """Return emergency swap records."""
        return self.get_queryset().filter(
            swap_reason__in=["EMERGENCY", "MALFUNCTION"],
        )

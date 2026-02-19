"""
Battery Models

Models for managing drone batteries, charging sessions, and swap records.

Models:
- DroneBattery: Individual battery asset with health tracking
- BatteryChargingSession: Immutable record of charging events
- BatterySwapRecord: Immutable record of battery swaps on drones
"""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.choices import (
    BatteryChemistry,
    BatteryHealthStatus,
    BatteryStatus,
    ChargingStatus,
    SwapReason,
)
from apps.core.models import AuditedModel, ReadOnlyModel

from .managers import (
    BatteryChargingSessionManager,
    BatterySwapRecordManager,
    DroneBatteryManager,
)


class DroneBattery(AuditedModel):
    """
    Drone battery asset with health and usage tracking.

    Tracks individual batteries throughout their lifecycle, including
    charge cycles, health status, and maintenance history.

    Attributes:
        serial_number: Unique battery identifier
        name: Display name for the battery
        warehouse: The warehouse this battery belongs to
        chemistry: Battery chemistry type (LiPo, Li-Ion, etc.)
        status: Current operational status
        health_status: Current health condition
        current_charge_percent: Current charge level (0-100)
        capacity_mah: Nominal capacity in milliamp-hours
        current_capacity_mah: Current capacity (may degrade over time)
        voltage_nominal: Nominal voltage in volts
        cell_count: Number of cells (S rating for LiPo)
        cycle_count: Total charge cycles
        max_cycles: Maximum recommended cycles before replacement
        purchase_date: When the battery was purchased
        warranty_expires_at: Warranty expiration date
        last_charged_at: Timestamp of last charge completion
        last_health_check_at: Last health assessment date
        notes: Additional notes about the battery
    """

    serial_number = models.CharField(
        _("serial number"),
        max_length=100,
        unique=True,
        db_index=True,
        help_text=_("Unique battery serial number"),
    )

    name = models.CharField(
        _("name"),
        max_length=100,
        help_text=_("Display name for the battery"),
    )

    warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.PROTECT,
        related_name="batteries",
        verbose_name=_("warehouse"),
        help_text=_("The warehouse this battery belongs to"),
    )

    # Battery specifications
    chemistry = models.CharField(
        _("chemistry"),
        max_length=20,
        choices=BatteryChemistry.choices,
        default=BatteryChemistry.LIPO,
        help_text=_("Battery chemistry type"),
    )

    capacity_mah = models.PositiveIntegerField(
        _("nominal capacity (mAh)"),
        validators=[MinValueValidator(1000), MaxValueValidator(50000)],
        help_text=_("Nominal capacity in milliamp-hours"),
    )

    current_capacity_mah = models.PositiveIntegerField(
        _("current capacity (mAh)"),
        validators=[MinValueValidator(0), MaxValueValidator(50000)],
        null=True,
        blank=True,
        help_text=_("Current capacity - may be less than nominal due to degradation"),
    )

    voltage_nominal = models.DecimalField(
        _("nominal voltage"),
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(3.0), MaxValueValidator(100.0)],
        help_text=_("Nominal voltage in volts"),
    )

    cell_count = models.PositiveSmallIntegerField(
        _("cell count"),
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        default=4,
        help_text=_("Number of cells (e.g., 4S = 4 cells)"),
    )

    # Status and health
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=BatteryStatus.choices,
        default=BatteryStatus.AVAILABLE,
        db_index=True,
        help_text=_("Current operational status"),
    )

    health_status = models.CharField(
        _("health status"),
        max_length=20,
        choices=BatteryHealthStatus.choices,
        default=BatteryHealthStatus.EXCELLENT,
        help_text=_("Current health condition"),
    )

    current_charge_percent = models.PositiveSmallIntegerField(
        _("current charge (%)"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=100,
        help_text=_("Current charge level percentage"),
    )

    # Cycle tracking
    cycle_count = models.PositiveIntegerField(
        _("cycle count"),
        default=0,
        help_text=_("Total number of charge cycles"),
    )

    max_cycles = models.PositiveIntegerField(
        _("max recommended cycles"),
        default=500,
        help_text=_("Maximum recommended cycles before replacement"),
    )

    # Purchase and warranty
    purchase_date = models.DateField(
        _("purchase date"),
        null=True,
        blank=True,
        help_text=_("Date the battery was purchased"),
    )

    warranty_expires_at = models.DateField(
        _("warranty expiry"),
        null=True,
        blank=True,
        help_text=_("Warranty expiration date"),
    )

    # Timestamps
    last_charged_at = models.DateTimeField(
        _("last charged at"),
        null=True,
        blank=True,
        help_text=_("Timestamp of last charge completion"),
    )

    last_health_check_at = models.DateTimeField(
        _("last health check"),
        null=True,
        blank=True,
        help_text=_("Date of last health assessment"),
    )

    # Additional info
    manufacturer = models.CharField(
        _("manufacturer"),
        max_length=100,
        blank=True,
        help_text=_("Battery manufacturer"),
    )

    model_number = models.CharField(
        _("model number"),
        max_length=100,
        blank=True,
        help_text=_("Battery model number"),
    )

    notes = models.TextField(
        _("notes"),
        blank=True,
        help_text=_("Additional notes about the battery"),
    )

    is_active = models.BooleanField(
        _("is active"),
        default=True,
        db_index=True,
        help_text=_("Whether this battery is in active service"),
    )

    objects = DroneBatteryManager()

    class Meta:
        verbose_name = _("drone battery")
        verbose_name_plural = _("drone batteries")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "health_status"]),
            models.Index(fields=["warehouse", "status"]),
            models.Index(fields=["cycle_count"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(current_charge_percent__lte=100),
                name="battery_charge_max_100",
            ),
            models.CheckConstraint(
                condition=models.Q(cycle_count__lte=models.F("max_cycles") + 100),
                name="battery_cycles_reasonable",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.serial_number})"

    @property
    def health_percentage(self):
        """Calculate health as percentage of original capacity."""
        if self.current_capacity_mah and self.capacity_mah:
            return round((self.current_capacity_mah / self.capacity_mah) * 100, 1)
        return 100.0

    @property
    def cycles_remaining(self):
        """Calculate remaining cycles before replacement."""
        return max(0, self.max_cycles - self.cycle_count)

    @property
    def is_low_charge(self):
        """Check if battery has low charge (below 20%)."""
        return self.current_charge_percent < 20

    @property
    def needs_replacement(self):
        """Check if battery needs replacement."""
        return (
            self.health_status in ["POOR", "REPLACE"] or self.status == "FAULTY" or self.cycle_count >= self.max_cycles
        )


class BatteryChargingSession(ReadOnlyModel):
    """
    Immutable record of a battery charging session.

    Tracks each charging event from start to completion/failure,
    including energy metrics and charging station information.

    Attributes:
        battery: The battery being charged
        charger_id: Identifier of the charging station
        started_at: When charging started
        ended_at: When charging ended
        status: Charging session status
        start_charge_percent: Charge level at start
        end_charge_percent: Charge level at end
        start_voltage: Voltage at start
        end_voltage: Voltage at end
        energy_consumed_wh: Energy consumed during charging
        peak_charging_rate_amps: Peak charging current
        temperature_start_c: Temperature at start
        temperature_max_c: Maximum temperature during charging
        notes: Additional notes
    """

    battery = models.ForeignKey(
        DroneBattery,
        on_delete=models.PROTECT,
        related_name="charging_sessions",
        verbose_name=_("battery"),
        help_text=_("The battery that was charged"),
    )

    charger_id = models.CharField(
        _("charger ID"),
        max_length=50,
        blank=True,
        help_text=_("Identifier of the charging station"),
    )

    charger_location = models.CharField(
        _("charger location"),
        max_length=100,
        blank=True,
        help_text=_("Location of the charging station"),
    )

    # Timing
    started_at = models.DateTimeField(
        _("started at"),
        db_index=True,
        help_text=_("When the charging session started"),
    )

    ended_at = models.DateTimeField(
        _("ended at"),
        null=True,
        blank=True,
        help_text=_("When the charging session ended"),
    )

    # Status
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=ChargingStatus.choices,
        default=ChargingStatus.STARTED,
        db_index=True,
        help_text=_("Current status of the charging session"),
    )

    # Charge levels
    start_charge_percent = models.PositiveSmallIntegerField(
        _("start charge (%)"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_("Charge level at start of session"),
    )

    end_charge_percent = models.PositiveSmallIntegerField(
        _("end charge (%)"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
        help_text=_("Charge level at end of session"),
    )

    # Voltage readings
    start_voltage = models.DecimalField(
        _("start voltage"),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Voltage at start of charging"),
    )

    end_voltage = models.DecimalField(
        _("end voltage"),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Voltage at end of charging"),
    )

    # Energy metrics
    energy_consumed_wh = models.DecimalField(
        _("energy consumed (Wh)"),
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Total energy consumed during charging"),
    )

    peak_charging_rate_amps = models.DecimalField(
        _("peak charging rate (A)"),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Peak charging current in amperes"),
    )

    # Temperature
    temperature_start_c = models.DecimalField(
        _("start temperature (°C)"),
        max_digits=5,
        decimal_places=1,
        null=True,
        blank=True,
        help_text=_("Battery temperature at start"),
    )

    temperature_max_c = models.DecimalField(
        _("max temperature (°C)"),
        max_digits=5,
        decimal_places=1,
        null=True,
        blank=True,
        help_text=_("Maximum temperature during charging"),
    )

    # Error handling
    error_code = models.CharField(
        _("error code"),
        max_length=50,
        blank=True,
        help_text=_("Error code if charging failed"),
    )

    error_message = models.TextField(
        _("error message"),
        blank=True,
        help_text=_("Error details if charging failed"),
    )

    notes = models.TextField(
        _("notes"),
        blank=True,
        help_text=_("Additional notes about the charging session"),
    )

    objects = BatteryChargingSessionManager()

    class Meta:
        verbose_name = _("charging session")
        verbose_name_plural = _("charging sessions")
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["battery", "-started_at"]),
            models.Index(fields=["status", "-started_at"]),
        ]

    def __str__(self):
        return f"Charging: {self.battery.serial_number} @ {self.started_at}"

    @property
    def duration_minutes(self):
        """Calculate charging duration in minutes."""
        if self.ended_at and self.started_at:
            delta = self.ended_at - self.started_at
            return round(delta.total_seconds() / 60, 1)
        return None

    @property
    def charge_gained(self):
        """Calculate percentage of charge gained."""
        if self.end_charge_percent is not None:
            return self.end_charge_percent - self.start_charge_percent
        return None


class BatterySwapRecord(ReadOnlyModel):
    """
    Immutable record of a battery swap on a drone.

    Tracks when batteries are swapped between drones, including
    the reason for the swap and who performed it.

    Attributes:
        drone: The drone involved in the swap
        old_battery: The battery removed from the drone
        new_battery: The battery installed on the drone
        swapped_at: When the swap occurred
        swap_reason: Reason for the swap
        performed_by: User who performed the swap
        old_battery_charge: Charge level of old battery at removal
        new_battery_charge: Charge level of new battery at installation
        location: Where the swap occurred
        notes: Additional notes
    """

    drone = models.ForeignKey(
        "drones.Drone",
        on_delete=models.PROTECT,
        related_name="battery_swaps",
        verbose_name=_("drone"),
        help_text=_("The drone that had its battery swapped"),
    )

    old_battery = models.ForeignKey(
        DroneBattery,
        on_delete=models.PROTECT,
        related_name="swaps_removed",
        verbose_name=_("old battery"),
        null=True,
        blank=True,
        help_text=_("The battery removed from the drone (null if first installation)"),
    )

    new_battery = models.ForeignKey(
        DroneBattery,
        on_delete=models.PROTECT,
        related_name="swaps_installed",
        verbose_name=_("new battery"),
        help_text=_("The battery installed on the drone"),
    )

    swapped_at = models.DateTimeField(
        _("swapped at"),
        db_index=True,
        help_text=_("When the battery swap occurred"),
    )

    swap_reason = models.CharField(
        _("swap reason"),
        max_length=20,
        choices=SwapReason.choices,
        default=SwapReason.LOW_BATTERY,
        help_text=_("Reason for the battery swap"),
    )

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="battery_swaps_performed",
        verbose_name=_("performed by"),
        null=True,
        blank=True,
        help_text=_("User who performed the swap"),
    )

    # Charge levels at swap time
    old_battery_charge = models.PositiveSmallIntegerField(
        _("old battery charge (%)"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
        help_text=_("Charge level of the removed battery"),
    )

    new_battery_charge = models.PositiveSmallIntegerField(
        _("new battery charge (%)"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_("Charge level of the installed battery"),
    )

    # Location
    location = models.CharField(
        _("location"),
        max_length=200,
        blank=True,
        help_text=_("Where the swap was performed"),
    )

    # Duration tracking
    swap_duration_seconds = models.PositiveIntegerField(
        _("swap duration (seconds)"),
        null=True,
        blank=True,
        help_text=_("Time taken to complete the swap"),
    )

    notes = models.TextField(
        _("notes"),
        blank=True,
        help_text=_("Additional notes about the swap"),
    )

    objects = BatterySwapRecordManager()

    class Meta:
        verbose_name = _("battery swap record")
        verbose_name_plural = _("battery swap records")
        ordering = ["-swapped_at"]
        indexes = [
            models.Index(fields=["drone", "-swapped_at"]),
            models.Index(fields=["old_battery", "-swapped_at"]),
            models.Index(fields=["new_battery", "-swapped_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(old_battery=models.F("new_battery")),
                name="different_batteries_swap",
            ),
        ]

    def __str__(self):
        old = self.old_battery.serial_number if self.old_battery else "None"
        return f"Swap on {self.drone}: {old} → {self.new_battery.serial_number}"

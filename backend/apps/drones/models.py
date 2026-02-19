"""
Drone Models for FlyNG

Models:
- Drone: Physical drone asset operating in a work area
- DroneTelemetryLog: Time-series telemetry data from drones
- DroneMaintenanceRecord: Maintenance and repair history
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.choices import (
    DroneAutonomyStatus,
    DroneStatus,
    FlightMode,
    MaintenanceType,
)
from apps.core.models import AuditedModel, ReadOnlyModel
from apps.drones.managers import (
    DroneMaintenanceRecordManager,
    DroneManager,
    DroneTelemetryLogManager,
)


class Drone(AuditedModel):
    """
    Physical drone asset.

    A drone operates within a work area and is controlled by a
    Ground Control Station. Each drone can have one battery attached
    at a time.
    """

    # Relationships
    work_area = models.ForeignKey(
        "warehouses.DroneWorkArea",
        on_delete=models.PROTECT,
        related_name="drones",
        verbose_name=_("Work Area"),
        help_text=_("Work area where this drone operates"),
    )
    current_battery = models.ForeignKey(
        "batteries.DroneBattery",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_drone",
        verbose_name=_("Current Battery"),
        help_text=_("Battery currently attached to this drone"),
    )

    # Identification
    serial_number = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Serial Number"),
        help_text=_("Unique manufacturer serial number"),
    )
    name = models.CharField(
        max_length=255,
        verbose_name=_("Drone Name"),
        help_text=_("Display name for the drone"),
    )
    model = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Model"),
        help_text=_("Drone model/type"),
    )
    manufacturer = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Manufacturer"),
        help_text=_("Drone manufacturer"),
    )

    # Firmware & Software
    firmware_version = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Firmware Version"),
        help_text=_("Current firmware version"),
    )
    hardware_version = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Hardware Version"),
        help_text=_("Hardware revision"),
    )

    # Home Position
    home_x = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Home X"),
        help_text=_("Home position X coordinate"),
    )
    home_y = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Home Y"),
        help_text=_("Home position Y coordinate"),
    )
    home_z = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Home Z"),
        help_text=_("Home position Z coordinate (altitude)"),
    )

    # Operational Status
    status = models.CharField(
        max_length=20,
        choices=DroneStatus.choices,
        default=DroneStatus.OFFLINE,
        verbose_name=_("Status"),
        help_text=_("Current operational status"),
    )
    autonomy_mode = models.IntegerField(
        choices=DroneAutonomyStatus.choices,
        default=DroneAutonomyStatus.MANUAL,
        verbose_name=_("Autonomy Mode"),
        help_text=_("Current autonomy level"),
    )

    # Maintenance Tracking
    last_maintenance_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Last Maintenance"),
        help_text=_("Date of last maintenance"),
    )
    next_maintenance_due = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Next Maintenance Due"),
        help_text=_("Date when next maintenance is due"),
    )

    # Flight Statistics
    total_flight_hours = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name=_("Total Flight Hours"),
        help_text=_("Total hours of flight time"),
    )
    total_flights = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Total Flights"),
        help_text=_("Total number of completed flights"),
    )
    total_distance_km = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Total Distance (km)"),
        help_text=_("Total distance flown in kilometers"),
    )

    # Connectivity
    last_heartbeat = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Last Heartbeat"),
        help_text=_("Last time drone sent a heartbeat"),
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("IP Address"),
        help_text=_("Network IP address of the drone"),
    )

    # Configuration
    max_payload_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Max Payload (kg)"),
        help_text=_("Maximum payload capacity in kilograms"),
    )
    max_flight_time_min = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Max Flight Time (min)"),
        help_text=_("Maximum flight time in minutes"),
    )

    # Status flags
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Is Active"),
        help_text=_("Whether the drone is active in the system"),
    )

    # Manager
    objects = DroneManager()

    class Meta:
        verbose_name = _("Drone")
        verbose_name_plural = _("Drones")
        ordering = ["work_area", "name"]
        indexes = [
            models.Index(fields=["work_area", "is_active"]),
            models.Index(fields=["status"]),
            models.Index(fields=["serial_number"]),
            models.Index(fields=["last_heartbeat"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.serial_number})"

    @property
    def home_position(self):
        """Return home position as tuple if available."""
        if all([self.home_x is not None, self.home_y is not None]):
            return (
                float(self.home_x),
                float(self.home_y),
                float(self.home_z or 0),
            )
        return None

    @property
    def zone(self):
        """Return the zone this drone belongs to."""
        return self.work_area.ground_control_station.zone

    @property
    def warehouse(self):
        """Return the warehouse this drone belongs to."""
        return self.work_area.ground_control_station.zone.warehouse

    @property
    def ground_control_station(self):
        """Return the GCS controlling this drone."""
        return self.work_area.ground_control_station

    @property
    def is_online(self):
        """Check if drone is online (has recent heartbeat)."""
        from datetime import timedelta

        from django.utils import timezone

        if not self.last_heartbeat:
            return False
        return (timezone.now() - self.last_heartbeat) < timedelta(minutes=5)


class DroneTelemetryLog(ReadOnlyModel):
    """
    Time-series telemetry data from drones.

    This model stores real-time sensor data and position information.
    Uses TimescaleDB hypertable for efficient time-series queries.
    Immutable - records are never updated, only inserted.
    """

    # Relationships
    drone = models.ForeignKey(
        Drone,
        on_delete=models.CASCADE,
        related_name="telemetry_logs",
        verbose_name=_("Drone"),
        help_text=_("Drone that generated this telemetry"),
    )

    # Timestamp (primary time field for TimescaleDB)
    timestamp = models.DateTimeField(
        verbose_name=_("Timestamp"),
        help_text=_("Time when telemetry was recorded"),
        db_index=True,
    )

    # Position
    position_x = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_("Position X"),
        help_text=_("X coordinate position"),
    )
    position_y = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_("Position Y"),
        help_text=_("Y coordinate position"),
    )
    position_z = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_("Position Z"),
        help_text=_("Z coordinate (altitude)"),
    )

    # Velocity
    velocity_x = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_("Velocity X"),
        help_text=_("X velocity in m/s"),
    )
    velocity_y = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_("Velocity Y"),
        help_text=_("Y velocity in m/s"),
    )
    velocity_z = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_("Velocity Z"),
        help_text=_("Z velocity in m/s"),
    )

    # Attitude (orientation)
    roll = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_("Roll"),
        help_text=_("Roll angle in degrees"),
    )
    pitch = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_("Pitch"),
        help_text=_("Pitch angle in degrees"),
    )
    yaw = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_("Yaw"),
        help_text=_("Yaw angle in degrees"),
    )

    # Battery
    battery_voltage = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Battery Voltage"),
        help_text=_("Battery voltage in volts"),
    )
    battery_percentage = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Battery Percentage"),
        help_text=_("Battery charge percentage"),
    )
    battery_current = models.DecimalField(
        max_digits=7,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Battery Current"),
        help_text=_("Battery current draw in amps"),
    )

    # Flight Mode
    flight_mode = models.CharField(
        max_length=20,
        choices=FlightMode.choices,
        default=FlightMode.GROUNDED,
        verbose_name=_("Flight Mode"),
        help_text=_("Current flight mode"),
    )

    # Speed
    ground_speed = models.DecimalField(
        max_digits=7,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Ground Speed"),
        help_text=_("Ground speed in m/s"),
    )
    air_speed = models.DecimalField(
        max_digits=7,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Air Speed"),
        help_text=_("Air speed in m/s"),
    )

    # Environmental
    temperature = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Temperature"),
        help_text=_("Internal temperature in Celsius"),
    )

    # Signal Strength
    rssi = models.SmallIntegerField(
        null=True,
        blank=True,
        verbose_name=_("RSSI"),
        help_text=_("Received signal strength indicator"),
    )

    # Extended sensor data (JSON for flexibility)
    sensor_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name=_("Sensor Data"),
        help_text=_("Additional sensor readings as JSON"),
    )

    # Manager
    objects = DroneTelemetryLogManager()

    class Meta:
        verbose_name = _("Drone Telemetry Log")
        verbose_name_plural = _("Drone Telemetry Logs")
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["drone", "timestamp"]),
            models.Index(fields=["timestamp"]),
            models.Index(fields=["flight_mode"]),
        ]
        # Note: TimescaleDB hypertable will be created via migration
        # using CREATE_HYPERTABLE on the 'timestamp' column

    def __str__(self):
        return f"Telemetry: {self.drone.name} @ {self.timestamp}"

    @property
    def position(self):
        """Return position as tuple if available."""
        if all([self.position_x is not None, self.position_y is not None]):
            return (
                float(self.position_x),
                float(self.position_y),
                float(self.position_z or 0),
            )
        return None

    @property
    def velocity(self):
        """Return velocity as tuple if available."""
        if all([self.velocity_x is not None, self.velocity_y is not None]):
            return (
                float(self.velocity_x),
                float(self.velocity_y),
                float(self.velocity_z or 0),
            )
        return None

    @property
    def attitude(self):
        """Return attitude as tuple if available."""
        if all([self.roll is not None, self.pitch is not None, self.yaw is not None]):
            return (
                float(self.roll),
                float(self.pitch),
                float(self.yaw),
            )
        return None


class DroneMaintenanceRecord(ReadOnlyModel):
    """
    Maintenance and repair history for drones.

    Immutable records tracking all maintenance activities.
    Once a record is created, it should not be modified.
    """

    # Relationships
    drone = models.ForeignKey(
        Drone,
        on_delete=models.CASCADE,
        related_name="maintenance_records",
        verbose_name=_("Drone"),
        help_text=_("Drone that was maintained"),
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="maintenance_performed",
        verbose_name=_("Performed By"),
        help_text=_("User who performed the maintenance"),
    )

    # Maintenance Details
    maintenance_type = models.CharField(
        max_length=30,
        choices=MaintenanceType.choices,
        default=MaintenanceType.SCHEDULED,
        verbose_name=_("Maintenance Type"),
        help_text=_("Type of maintenance performed"),
    )
    title = models.CharField(
        max_length=255,
        verbose_name=_("Title"),
        help_text=_("Short description of maintenance"),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description"),
        help_text=_("Detailed description of work performed"),
    )

    # Parts & Materials
    parts_replaced = models.TextField(
        blank=True,
        verbose_name=_("Parts Replaced"),
        help_text=_("List of parts that were replaced"),
    )
    cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Cost"),
        help_text=_("Total cost of maintenance"),
    )

    # Scheduling
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Scheduled At"),
        help_text=_("When maintenance was scheduled for"),
    )
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Started At"),
        help_text=_("When maintenance started"),
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Completed At"),
        help_text=_("When maintenance was completed"),
    )
    downtime_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Downtime (minutes)"),
        help_text=_("Total drone downtime in minutes"),
    )

    # Status before/after
    flight_hours_at_maintenance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Flight Hours at Maintenance"),
        help_text=_("Total flight hours when maintenance was performed"),
    )
    flights_at_maintenance = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Flights at Maintenance"),
        help_text=_("Total flights when maintenance was performed"),
    )

    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes"),
        help_text=_("Additional notes or observations"),
    )

    # Manager
    objects = DroneMaintenanceRecordManager()

    class Meta:
        verbose_name = _("Drone Maintenance Record")
        verbose_name_plural = _("Drone Maintenance Records")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["drone", "created_at"]),
            models.Index(fields=["maintenance_type"]),
            models.Index(fields=["completed_at"]),
        ]

    def __str__(self):
        status = "Completed" if self.completed_at else "Pending"
        return f"{self.drone.name} - {self.title} ({status})"

    @property
    def is_completed(self):
        """Check if maintenance is completed."""
        return self.completed_at is not None

    @property
    def duration_minutes(self):
        """Calculate duration in minutes if completed."""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            return int(delta.total_seconds() / 60)
        return None

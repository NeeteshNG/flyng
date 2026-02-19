"""
Warehouse Models for FlyNG

Models:
- Warehouse: Physical warehouse facility belonging to an organization
- WarehouseProfile: Extended settings and configuration for a warehouse
- WarehouseContact: Contact persons associated with a warehouse
"""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.choices import (
    CurrencyChoices,
    DateFormatChoices,
    DroneWorkAreaType,
    GCSStatus,
    LanguageChoices,
    MeasurementStandard,
    TimezoneChoices,
    WarehouseZoneType,
)
from apps.core.models import AuditedModel, BaseModel
from apps.warehouses.managers import (
    DroneWorkAreaManager,
    GroundControlStationManager,
    WarehouseContactManager,
    WarehouseManager,
    WarehouseZoneManager,
)


class Warehouse(AuditedModel):
    """
    Physical warehouse facility.

    A warehouse belongs to an organization and contains zones,
    ground control stations, and work areas for drone operations.
    """

    # Relationships
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="warehouses",
        verbose_name=_("Organization"),
        help_text=_("Organization that owns this warehouse"),
    )

    # Basic Information
    name = models.CharField(
        max_length=255,
        verbose_name=_("Warehouse Name"),
        help_text=_("Display name for the warehouse"),
    )
    code = models.CharField(
        max_length=50,
        verbose_name=_("Warehouse Code"),
        help_text=_("Unique identifier code for the warehouse (e.g., WH-MUM-01)"),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description"),
        help_text=_("Detailed description of the warehouse"),
    )

    # Location / Address
    address_line_1 = models.CharField(
        max_length=255,
        verbose_name=_("Address Line 1"),
        help_text=_("Street address, building name"),
    )
    address_line_2 = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Address Line 2"),
        help_text=_("Additional address details"),
    )
    city = models.CharField(
        max_length=100,
        verbose_name=_("City"),
        help_text=_("City name"),
    )
    state = models.CharField(
        max_length=100,
        verbose_name=_("State"),
        help_text=_("State or province"),
    )
    postal_code = models.CharField(
        max_length=20,
        verbose_name=_("Postal Code"),
        help_text=_("PIN code / Postal code"),
    )
    country = models.CharField(
        max_length=100,
        default="India",
        verbose_name=_("Country"),
        help_text=_("Country name"),
    )

    # Coordinates (for mapping/navigation)
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        verbose_name=_("Latitude"),
        help_text=_("GPS latitude coordinate"),
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        verbose_name=_("Longitude"),
        help_text=_("GPS longitude coordinate"),
    )

    # Timezone
    timezone = models.CharField(
        max_length=50,
        choices=TimezoneChoices.choices,
        default=TimezoneChoices.IST,
        verbose_name=_("Timezone"),
        help_text=_("Warehouse timezone for scheduling"),
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Is Active"),
        help_text=_("Whether the warehouse is operational"),
    )

    # Manager
    objects = WarehouseManager()

    class Meta:
        verbose_name = _("Warehouse")
        verbose_name_plural = _("Warehouses")
        ordering = ["organization", "name"]
        indexes = [
            models.Index(fields=["organization", "is_active"]),
            models.Index(fields=["code"]),
            models.Index(fields=["city", "state"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "code"],
                name="unique_warehouse_code_per_org",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def full_address(self):
        """Return formatted full address."""
        parts = [self.address_line_1]
        if self.address_line_2:
            parts.append(self.address_line_2)
        parts.extend(
            [
                self.city,
                f"{self.state} - {self.postal_code}",
                self.country,
            ]
        )
        return ", ".join(parts)

    @property
    def coordinates(self):
        """Return coordinates as tuple if available."""
        if self.latitude and self.longitude:
            return (float(self.latitude), float(self.longitude))
        return None


class WarehouseProfile(BaseModel):
    """
    Extended settings and configuration for a warehouse.

    One-to-one relationship with Warehouse for additional
    operational settings and preferences.
    """

    warehouse = models.OneToOneField(
        Warehouse,
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name=_("Warehouse"),
        help_text=_("Associated warehouse"),
    )

    # Operational Settings
    operating_hours_start = models.TimeField(
        null=True,
        blank=True,
        verbose_name=_("Operating Hours Start"),
        help_text=_("Start time of daily operations"),
    )
    operating_hours_end = models.TimeField(
        null=True,
        blank=True,
        verbose_name=_("Operating Hours End"),
        help_text=_("End time of daily operations"),
    )
    operates_24x7 = models.BooleanField(
        default=False,
        verbose_name=_("Operates 24x7"),
        help_text=_("Whether the warehouse operates round the clock"),
    )

    # Capacity & Dimensions
    total_area_sqft = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Total Area (sq ft)"),
        help_text=_("Total warehouse floor area in square feet"),
    )
    ceiling_height_ft = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Ceiling Height (ft)"),
        help_text=_("Average ceiling height in feet"),
    )
    max_drone_capacity = models.PositiveIntegerField(
        default=10,
        verbose_name=_("Max Drone Capacity"),
        help_text=_("Maximum number of drones that can operate"),
    )

    # Regional Settings (override organization defaults)
    measurement_standard = models.CharField(
        max_length=20,
        choices=MeasurementStandard.choices,
        default=MeasurementStandard.METRIC,
        verbose_name=_("Measurement Standard"),
        help_text=_("Unit system for measurements"),
    )
    currency = models.CharField(
        max_length=3,
        choices=CurrencyChoices.choices,
        default=CurrencyChoices.INR,
        verbose_name=_("Currency"),
        help_text=_("Default currency for warehouse operations"),
    )
    date_format = models.CharField(
        max_length=20,
        choices=DateFormatChoices.choices,
        default=DateFormatChoices.DMY,
        verbose_name=_("Date Format"),
        help_text=_("Preferred date format"),
    )
    language = models.CharField(
        max_length=5,
        choices=LanguageChoices.choices,
        default=LanguageChoices.ENGLISH,
        verbose_name=_("Language"),
        help_text=_("Default language for warehouse interface"),
    )

    # Safety & Compliance
    emergency_contact_number = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_("Emergency Contact"),
        help_text=_("Emergency contact phone number"),
    )
    safety_clearance_height_ft = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=3.0,
        verbose_name=_("Safety Clearance Height (ft)"),
        help_text=_("Minimum clearance height for drone operations"),
    )
    max_flight_speed_mps = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=2.0,
        verbose_name=_("Max Flight Speed (m/s)"),
        help_text=_("Maximum allowed drone flight speed"),
    )

    # Feature Flags
    enable_autonomous_ops = models.BooleanField(
        default=False,
        verbose_name=_("Enable Autonomous Operations"),
        help_text=_("Allow drones to operate autonomously"),
    )
    enable_night_ops = models.BooleanField(
        default=False,
        verbose_name=_("Enable Night Operations"),
        help_text=_("Allow drone operations during night hours"),
    )

    class Meta:
        verbose_name = _("Warehouse Profile")
        verbose_name_plural = _("Warehouse Profiles")

    def __str__(self):
        return f"Profile: {self.warehouse.name}"


class WarehouseContact(BaseModel):
    """
    Contact person for a warehouse.

    Each warehouse can have multiple contacts with different
    roles (manager, supervisor, emergency contact, etc.).
    """

    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name="contacts",
        verbose_name=_("Warehouse"),
        help_text=_("Associated warehouse"),
    )

    # Contact Information
    name = models.CharField(
        max_length=255,
        verbose_name=_("Full Name"),
        help_text=_("Contact person full name"),
    )
    designation = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Designation"),
        help_text=_("Job title or designation"),
    )
    email = models.EmailField(
        verbose_name=_("Email"),
        help_text=_("Contact email address"),
    )
    phone_primary = models.CharField(
        max_length=20,
        verbose_name=_("Primary Phone"),
        help_text=_("Primary contact number"),
    )
    phone_secondary = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_("Secondary Phone"),
        help_text=_("Secondary contact number"),
    )

    # Contact Type
    is_primary = models.BooleanField(
        default=False,
        verbose_name=_("Is Primary Contact"),
        help_text=_("Whether this is the primary contact for the warehouse"),
    )
    is_emergency = models.BooleanField(
        default=False,
        verbose_name=_("Is Emergency Contact"),
        help_text=_("Whether to contact in case of emergency"),
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Is Active"),
        help_text=_("Whether this contact is currently active"),
    )

    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes"),
        help_text=_("Additional notes about this contact"),
    )

    # Manager
    objects = WarehouseContactManager()

    class Meta:
        verbose_name = _("Warehouse Contact")
        verbose_name_plural = _("Warehouse Contacts")
        ordering = ["-is_primary", "name"]
        indexes = [
            models.Index(fields=["warehouse", "is_primary"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        primary_tag = " (Primary)" if self.is_primary else ""
        return f"{self.name}{primary_tag} - {self.warehouse.name}"


class WarehouseZone(AuditedModel):
    """
    A zone within a warehouse.

    Zones divide a warehouse into logical areas for organization
    and drone routing (e.g., Storage, Picking, Staging, Shipping).
    """

    # Relationships
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name="zones",
        verbose_name=_("Warehouse"),
        help_text=_("Warehouse this zone belongs to"),
    )

    # Basic Information
    name = models.CharField(
        max_length=255,
        verbose_name=_("Zone Name"),
        help_text=_("Display name for the zone"),
    )
    code = models.CharField(
        max_length=50,
        verbose_name=_("Zone Code"),
        help_text=_("Unique identifier code for the zone (e.g., ZONE-A1)"),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description"),
        help_text=_("Detailed description of the zone"),
    )
    zone_type = models.CharField(
        max_length=20,
        choices=WarehouseZoneType.choices,
        default=WarehouseZoneType.STORAGE,
        verbose_name=_("Zone Type"),
        help_text=_("Type/purpose of this zone"),
    )

    # Physical Properties
    floor_level = models.IntegerField(
        default=0,
        verbose_name=_("Floor Level"),
        help_text=_("Floor number (0 = ground floor)"),
    )
    area_sqft = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Area (sq ft)"),
        help_text=_("Zone floor area in square feet"),
    )

    # Boundaries (for mapping/navigation)
    min_x = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Min X Coordinate"),
        help_text=_("Minimum X boundary coordinate"),
    )
    max_x = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Max X Coordinate"),
        help_text=_("Maximum X boundary coordinate"),
    )
    min_y = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Min Y Coordinate"),
        help_text=_("Minimum Y boundary coordinate"),
    )
    max_y = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Max Y Coordinate"),
        help_text=_("Maximum Y boundary coordinate"),
    )

    # Operational Settings
    max_drones_allowed = models.PositiveIntegerField(
        default=5,
        verbose_name=_("Max Drones Allowed"),
        help_text=_("Maximum number of drones that can operate in this zone"),
    )
    priority = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Priority"),
        help_text=_("Zone priority for job scheduling (higher = more priority)"),
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Is Active"),
        help_text=_("Whether the zone is operational"),
    )
    is_no_fly_zone = models.BooleanField(
        default=False,
        verbose_name=_("Is No-Fly Zone"),
        help_text=_("If true, drones cannot enter this zone"),
    )

    # Manager
    objects = WarehouseZoneManager()

    class Meta:
        verbose_name = _("Warehouse Zone")
        verbose_name_plural = _("Warehouse Zones")
        ordering = ["warehouse", "floor_level", "name"]
        indexes = [
            models.Index(fields=["warehouse", "is_active"]),
            models.Index(fields=["zone_type"]),
            models.Index(fields=["code"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["warehouse", "code"],
                name="unique_zone_code_per_warehouse",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.code}) - {self.warehouse.name}"

    @property
    def bounds(self):
        """Return zone boundaries as tuple if available."""
        if all([self.min_x, self.max_x, self.min_y, self.max_y]):
            return (
                float(self.min_x),
                float(self.max_x),
                float(self.min_y),
                float(self.max_y),
            )
        return None


class GroundControlStation(AuditedModel):
    """
    Ground Control Station (GCS) for drone operations.

    A GCS is a physical station within a warehouse zone that
    controls and monitors drones. Each GCS can manage multiple
    work areas.
    """

    # Relationships
    zone = models.ForeignKey(
        WarehouseZone,
        on_delete=models.CASCADE,
        related_name="ground_control_stations",
        verbose_name=_("Zone"),
        help_text=_("Warehouse zone where this GCS is located"),
    )

    # Basic Information
    name = models.CharField(
        max_length=255,
        verbose_name=_("GCS Name"),
        help_text=_("Display name for the Ground Control Station"),
    )
    code = models.CharField(
        max_length=50,
        verbose_name=_("GCS Code"),
        help_text=_("Unique identifier code for the GCS (e.g., GCS-001)"),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description"),
        help_text=_("Detailed description of the GCS"),
    )

    # Location within zone
    x_position = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("X Position"),
        help_text=_("X coordinate position within the zone"),
    )
    y_position = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Y Position"),
        help_text=_("Y coordinate position within the zone"),
    )
    z_position = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=0,
        verbose_name=_("Z Position"),
        help_text=_("Height/altitude of the GCS"),
    )

    # Hardware Information
    hardware_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Hardware ID"),
        help_text=_("Unique hardware/serial identifier"),
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("IP Address"),
        help_text=_("Network IP address of the GCS"),
    )
    firmware_version = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Firmware Version"),
        help_text=_("Current firmware version"),
    )

    # Capacity
    max_drones = models.PositiveIntegerField(
        default=4,
        verbose_name=_("Max Drones"),
        help_text=_("Maximum number of drones this GCS can control"),
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=GCSStatus.choices,
        default=GCSStatus.OFFLINE,
        verbose_name=_("Status"),
        help_text=_("Current operational status"),
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Is Active"),
        help_text=_("Whether the GCS is available for operations"),
    )
    last_heartbeat = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Last Heartbeat"),
        help_text=_("Last time GCS sent a heartbeat signal"),
    )

    # Manager
    objects = GroundControlStationManager()

    class Meta:
        verbose_name = _("Ground Control Station")
        verbose_name_plural = _("Ground Control Stations")
        ordering = ["zone", "name"]
        indexes = [
            models.Index(fields=["zone", "is_active"]),
            models.Index(fields=["status"]),
            models.Index(fields=["code"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["zone", "code"],
                name="unique_gcs_code_per_zone",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.code}) - {self.zone.name}"

    @property
    def position(self):
        """Return position as tuple if available."""
        if self.x_position is not None and self.y_position is not None:
            return (
                float(self.x_position),
                float(self.y_position),
                float(self.z_position or 0),
            )
        return None

    @property
    def warehouse(self):
        """Return the warehouse this GCS belongs to."""
        return self.zone.warehouse


class DroneWorkArea(AuditedModel):
    """
    A work area managed by a Ground Control Station.

    Work areas define the physical space where drones operate.
    They can be tethered (drone connected by cable) or untethered
    (free-flying).
    """

    # Relationships
    ground_control_station = models.ForeignKey(
        GroundControlStation,
        on_delete=models.CASCADE,
        related_name="work_areas",
        verbose_name=_("Ground Control Station"),
        help_text=_("GCS that manages this work area"),
    )

    # Basic Information
    name = models.CharField(
        max_length=255,
        verbose_name=_("Work Area Name"),
        help_text=_("Display name for the work area"),
    )
    code = models.CharField(
        max_length=50,
        verbose_name=_("Work Area Code"),
        help_text=_("Unique identifier code (e.g., WA-001)"),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description"),
        help_text=_("Detailed description of the work area"),
    )
    area_type = models.CharField(
        max_length=20,
        choices=DroneWorkAreaType.choices,
        default=DroneWorkAreaType.TETHERED,
        verbose_name=_("Area Type"),
        help_text=_("Type of drone operation in this area"),
    )

    # Boundaries
    min_x = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Min X"),
        help_text=_("Minimum X boundary"),
    )
    max_x = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Max X"),
        help_text=_("Maximum X boundary"),
    )
    min_y = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Min Y"),
        help_text=_("Minimum Y boundary"),
    )
    max_y = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Max Y"),
        help_text=_("Maximum Y boundary"),
    )
    min_z = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=0,
        verbose_name=_("Min Z"),
        help_text=_("Minimum flight altitude"),
    )
    max_z = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=10,
        verbose_name=_("Max Z"),
        help_text=_("Maximum flight altitude"),
    )

    # Tethered Configuration
    tether_length_m = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Tether Length (m)"),
        help_text=_("Length of tether cable in meters (for tethered areas)"),
    )
    tether_anchor_x = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Tether Anchor X"),
        help_text=_("X position of tether anchor point"),
    )
    tether_anchor_y = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Tether Anchor Y"),
        help_text=_("Y position of tether anchor point"),
    )
    tether_anchor_z = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name=_("Tether Anchor Z"),
        help_text=_("Z position of tether anchor point"),
    )

    # Operational Limits
    max_flight_speed_mps = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=2.0,
        verbose_name=_("Max Flight Speed (m/s)"),
        help_text=_("Maximum allowed flight speed in this area"),
    )
    max_drones = models.PositiveIntegerField(
        default=1,
        verbose_name=_("Max Drones"),
        help_text=_("Maximum drones allowed in this work area simultaneously"),
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Is Active"),
        help_text=_("Whether the work area is operational"),
    )

    # Manager
    objects = DroneWorkAreaManager()

    class Meta:
        verbose_name = _("Drone Work Area")
        verbose_name_plural = _("Drone Work Areas")
        ordering = ["ground_control_station", "name"]
        indexes = [
            models.Index(fields=["ground_control_station", "is_active"]),
            models.Index(fields=["area_type"]),
            models.Index(fields=["code"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["ground_control_station", "code"],
                name="unique_work_area_code_per_gcs",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.code}) - {self.ground_control_station.name}"

    @property
    def bounds(self):
        """Return work area boundaries as tuple if available."""
        if all([self.min_x, self.max_x, self.min_y, self.max_y]):
            return (
                float(self.min_x),
                float(self.max_x),
                float(self.min_y),
                float(self.max_y),
                float(self.min_z),
                float(self.max_z),
            )
        return None

    @property
    def tether_anchor(self):
        """Return tether anchor position as tuple if available."""
        if all([self.tether_anchor_x, self.tether_anchor_y, self.tether_anchor_z]):
            return (
                float(self.tether_anchor_x),
                float(self.tether_anchor_y),
                float(self.tether_anchor_z),
            )
        return None

    @property
    def zone(self):
        """Return the zone this work area belongs to."""
        return self.ground_control_station.zone

    @property
    def warehouse(self):
        """Return the warehouse this work area belongs to."""
        return self.ground_control_station.zone.warehouse

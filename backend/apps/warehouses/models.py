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
    LanguageChoices,
    MeasurementStandard,
    TimezoneChoices,
)
from apps.core.models import AuditedModel, BaseModel
from apps.warehouses.managers import WarehouseContactManager, WarehouseManager

class Warehouse(AuditedModel):
    """
    Physical warehouse facility.

    A warehouse belongs to an organization and contains zones,
    ground control stations, and work areas for drone operations.
    """

    # Relationships
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='warehouses',
        verbose_name=_('Organization'),
        help_text=_('Organization that owns this warehouse'),
    )

    # Basic Information
    name = models.CharField(
        max_length=255,
        verbose_name=_('Warehouse Name'),
        help_text=_('Display name for the warehouse'),
    )
    code = models.CharField(
        max_length=50,
        verbose_name=_('Warehouse Code'),
        help_text=_('Unique identifier code for the warehouse (e.g., WH-MUM-01)'),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_('Description'),
        help_text=_('Detailed description of the warehouse'),
    )

    # Location / Address
    address_line_1 = models.CharField(
        max_length=255,
        verbose_name=_('Address Line 1'),
        help_text=_('Street address, building name'),
    )
    address_line_2 = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_('Address Line 2'),
        help_text=_('Additional address details'),
    )
    city = models.CharField(
        max_length=100,
        verbose_name=_('City'),
        help_text=_('City name'),
    )
    state = models.CharField(
        max_length=100,
        verbose_name=_('State'),
        help_text=_('State or province'),
    )
    postal_code = models.CharField(
        max_length=20,
        verbose_name=_('Postal Code'),
        help_text=_('PIN code / Postal code'),
    )
    country = models.CharField(
        max_length=100,
        default='India',
        verbose_name=_('Country'),
        help_text=_('Country name'),
    )

    # Coordinates (for mapping/navigation)
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        verbose_name=_('Latitude'),
        help_text=_('GPS latitude coordinate'),
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        verbose_name=_('Longitude'),
        help_text=_('GPS longitude coordinate'),
    )

    # Timezone
    timezone = models.CharField(
        max_length=50,
        choices=TimezoneChoices.choices,
        default=TimezoneChoices.IST,
        verbose_name=_('Timezone'),
        help_text=_('Warehouse timezone for scheduling'),
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Is Active'),
        help_text=_('Whether the warehouse is operational'),
    )

    # Manager
    objects = WarehouseManager()

    class Meta:
        verbose_name = _('Warehouse')
        verbose_name_plural = _('Warehouses')
        ordering = ['organization', 'name']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
            models.Index(fields=['code']),
            models.Index(fields=['city', 'state']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'code'],
                name='unique_warehouse_code_per_org',
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
        parts.extend([
            self.city,
            f"{self.state} - {self.postal_code}",
            self.country,
        ])
        return ', '.join(parts)

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
        related_name='profile',
        verbose_name=_('Warehouse'),
        help_text=_('Associated warehouse'),
    )

    # Operational Settings
    operating_hours_start = models.TimeField(
        null=True,
        blank=True,
        verbose_name=_('Operating Hours Start'),
        help_text=_('Start time of daily operations'),
    )
    operating_hours_end = models.TimeField(
        null=True,
        blank=True,
        verbose_name=_('Operating Hours End'),
        help_text=_('End time of daily operations'),
    )
    operates_24x7 = models.BooleanField(
        default=False,
        verbose_name=_('Operates 24x7'),
        help_text=_('Whether the warehouse operates round the clock'),
    )

    # Capacity & Dimensions
    total_area_sqft = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_('Total Area (sq ft)'),
        help_text=_('Total warehouse floor area in square feet'),
    )
    ceiling_height_ft = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_('Ceiling Height (ft)'),
        help_text=_('Average ceiling height in feet'),
    )
    max_drone_capacity = models.PositiveIntegerField(
        default=10,
        verbose_name=_('Max Drone Capacity'),
        help_text=_('Maximum number of drones that can operate'),
    )

    # Regional Settings (override organization defaults)
    measurement_standard = models.CharField(
        max_length=20,
        choices=MeasurementStandard.choices,
        default=MeasurementStandard.METRIC,
        verbose_name=_('Measurement Standard'),
        help_text=_('Unit system for measurements'),
    )
    currency = models.CharField(
        max_length=3,
        choices=CurrencyChoices.choices,
        default=CurrencyChoices.INR,
        verbose_name=_('Currency'),
        help_text=_('Default currency for warehouse operations'),
    )
    date_format = models.CharField(
        max_length=20,
        choices=DateFormatChoices.choices,
        default=DateFormatChoices.DMY,
        verbose_name=_('Date Format'),
        help_text=_('Preferred date format'),
    )
    language = models.CharField(
        max_length=5,
        choices=LanguageChoices.choices,
        default=LanguageChoices.ENGLISH,
        verbose_name=_('Language'),
        help_text=_('Default language for warehouse interface'),
    )

    # Safety & Compliance
    emergency_contact_number = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_('Emergency Contact'),
        help_text=_('Emergency contact phone number'),
    )
    safety_clearance_height_ft = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=3.0,
        verbose_name=_('Safety Clearance Height (ft)'),
        help_text=_('Minimum clearance height for drone operations'),
    )
    max_flight_speed_mps = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=2.0,
        verbose_name=_('Max Flight Speed (m/s)'),
        help_text=_('Maximum allowed drone flight speed'),
    )

    # Feature Flags
    enable_autonomous_ops = models.BooleanField(
        default=False,
        verbose_name=_('Enable Autonomous Operations'),
        help_text=_('Allow drones to operate autonomously'),
    )
    enable_night_ops = models.BooleanField(
        default=False,
        verbose_name=_('Enable Night Operations'),
        help_text=_('Allow drone operations during night hours'),
    )

    class Meta:
        verbose_name = _('Warehouse Profile')
        verbose_name_plural = _('Warehouse Profiles')

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
        related_name='contacts',
        verbose_name=_('Warehouse'),
        help_text=_('Associated warehouse'),
    )

    # Contact Information
    name = models.CharField(
        max_length=255,
        verbose_name=_('Full Name'),
        help_text=_('Contact person full name'),
    )
    designation = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_('Designation'),
        help_text=_('Job title or designation'),
    )
    email = models.EmailField(
        verbose_name=_('Email'),
        help_text=_('Contact email address'),
    )
    phone_primary = models.CharField(
        max_length=20,
        verbose_name=_('Primary Phone'),
        help_text=_('Primary contact number'),
    )
    phone_secondary = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_('Secondary Phone'),
        help_text=_('Secondary contact number'),
    )

    # Contact Type
    is_primary = models.BooleanField(
        default=False,
        verbose_name=_('Is Primary Contact'),
        help_text=_('Whether this is the primary contact for the warehouse'),
    )
    is_emergency = models.BooleanField(
        default=False,
        verbose_name=_('Is Emergency Contact'),
        help_text=_('Whether to contact in case of emergency'),
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Is Active'),
        help_text=_('Whether this contact is currently active'),
    )

    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name=_('Notes'),
        help_text=_('Additional notes about this contact'),
    )

    # Manager
    objects = WarehouseContactManager()

    class Meta:
        verbose_name = _('Warehouse Contact')
        verbose_name_plural = _('Warehouse Contacts')
        ordering = ['-is_primary', 'name']
        indexes = [
            models.Index(fields=['warehouse', 'is_primary']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        primary_tag = " (Primary)" if self.is_primary else ""
        return f"{self.name}{primary_tag} - {self.warehouse.name}"

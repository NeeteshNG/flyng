"""
Warehouses Admin Configuration

Admin classes for warehouse management models with Unfold UI.
"""
from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from .models import (
    DroneWorkArea,
    GroundControlStation,
    Warehouse,
    WarehouseContact,
    WarehouseProfile,
    WarehouseZone,
)


# =============================================================================
# Inline Admin Classes
# =============================================================================

class WarehouseProfileInline(admin.StackedInline):
    """Inline for Warehouse Profile (one-to-one)."""
    model = WarehouseProfile
    can_delete = False
    verbose_name_plural = 'Profile'

    fieldsets = (
        ('Operating Hours', {
            'fields': (
                'operating_hours_start',
                'operating_hours_end',
                'operates_24x7',
            )
        }),
        ('Capacity & Dimensions', {
            'fields': (
                'total_area_sqft',
                'ceiling_height_ft',
                'max_drone_capacity',
            ),
            'classes': ('collapse',),
        }),
        ('Regional Settings', {
            'fields': (
                'measurement_standard',
                'currency',
                'date_format',
                'language',
            ),
            'classes': ('collapse',),
        }),
        ('Safety & Compliance', {
            'fields': (
                'emergency_contact_number',
                'safety_clearance_height_ft',
                'max_flight_speed_mps',
            ),
            'classes': ('collapse',),
        }),
        ('Feature Flags', {
            'fields': (
                'enable_autonomous_ops',
                'enable_night_ops',
            ),
            'classes': ('collapse',),
        }),
    )


class WarehouseContactInline(TabularInline):
    """Inline for Warehouse Contacts."""
    model = WarehouseContact
    extra = 0
    fields = [
        'name',
        'designation',
        'email',
        'phone_primary',
        'is_primary',
        'is_emergency',
        'is_active',
    ]


class WarehouseZoneInline(TabularInline):
    """Inline for Warehouse Zones."""
    model = WarehouseZone
    extra = 0
    fields = [
        'name',
        'code',
        'zone_type',
        'floor_level',
        'max_drones_allowed',
        'is_active',
        'is_no_fly_zone',
    ]
    show_change_link = True


class GroundControlStationInline(TabularInline):
    """Inline for Ground Control Stations."""
    model = GroundControlStation
    extra = 0
    fields = [
        'name',
        'code',
        'status',
        'max_drones',
        'is_active',
    ]
    show_change_link = True


class DroneWorkAreaInline(TabularInline):
    """Inline for Drone Work Areas."""
    model = DroneWorkArea
    extra = 0
    fields = [
        'name',
        'code',
        'area_type',
        'max_drones',
        'is_active',
    ]
    show_change_link = True


# =============================================================================
# Model Admin Classes
# =============================================================================

@admin.register(Warehouse)
class WarehouseAdmin(ModelAdmin):
    """Admin for Warehouse model."""
    list_display = [
        'name',
        'code',
        'organization',
        'city',
        'state',
        'timezone',
        'is_active',
    ]
    list_filter = [
        'is_active',
        'organization',
        'state',
        'timezone',
    ]
    search_fields = [
        'name',
        'code',
        'city',
        'state',
        'organization__name',
    ]
    date_hierarchy = 'created_at'
    raw_id_fields = ['organization']
    inlines = [
        WarehouseProfileInline,
        WarehouseContactInline,
        WarehouseZoneInline,
    ]

    fieldsets = (
        (None, {
            'fields': ('organization', 'name', 'code', 'description')
        }),
        ('Location', {
            'fields': (
                'address_line_1',
                'address_line_2',
                'city',
                'state',
                'postal_code',
                'country',
            )
        }),
        ('Coordinates', {
            'fields': ('latitude', 'longitude'),
            'classes': ('collapse',),
        }),
        ('Settings', {
            'fields': ('timezone', 'is_active')
        }),
    )


@admin.register(WarehouseProfile)
class WarehouseProfileAdmin(ModelAdmin):
    """Admin for WarehouseProfile model."""
    list_display = [
        'warehouse',
        'operates_24x7',
        'max_drone_capacity',
        'measurement_standard',
        'currency',
    ]
    list_filter = [
        'operates_24x7',
        'measurement_standard',
        'currency',
        'enable_autonomous_ops',
        'enable_night_ops',
    ]
    search_fields = ['warehouse__name', 'warehouse__code']
    raw_id_fields = ['warehouse']


@admin.register(WarehouseContact)
class WarehouseContactAdmin(ModelAdmin):
    """Admin for WarehouseContact model."""
    list_display = [
        'name',
        'warehouse',
        'designation',
        'email',
        'phone_primary',
        'is_primary',
        'is_emergency',
        'is_active',
    ]
    list_filter = [
        'is_primary',
        'is_emergency',
        'is_active',
        'warehouse',
    ]
    search_fields = [
        'name',
        'email',
        'phone_primary',
        'warehouse__name',
    ]
    raw_id_fields = ['warehouse']

    fieldsets = (
        (None, {
            'fields': ('warehouse', 'name', 'designation')
        }),
        ('Contact Information', {
            'fields': ('email', 'phone_primary', 'phone_secondary')
        }),
        ('Contact Type', {
            'fields': ('is_primary', 'is_emergency', 'is_active')
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',),
        }),
    )


@admin.register(WarehouseZone)
class WarehouseZoneAdmin(ModelAdmin):
    """Admin for WarehouseZone model."""
    list_display = [
        'name',
        'code',
        'warehouse',
        'zone_type',
        'floor_level',
        'max_drones_allowed',
        'is_active',
        'is_no_fly_zone',
    ]
    list_filter = [
        'zone_type',
        'is_active',
        'is_no_fly_zone',
        'warehouse',
        'floor_level',
    ]
    search_fields = [
        'name',
        'code',
        'warehouse__name',
        'warehouse__code',
    ]
    raw_id_fields = ['warehouse']
    inlines = [GroundControlStationInline]

    fieldsets = (
        (None, {
            'fields': ('warehouse', 'name', 'code', 'description', 'zone_type')
        }),
        ('Physical Properties', {
            'fields': ('floor_level', 'area_sqft')
        }),
        ('Boundaries', {
            'fields': ('min_x', 'max_x', 'min_y', 'max_y'),
            'classes': ('collapse',),
        }),
        ('Operational Settings', {
            'fields': ('max_drones_allowed', 'priority')
        }),
        ('Status', {
            'fields': ('is_active', 'is_no_fly_zone')
        }),
    )


@admin.register(GroundControlStation)
class GroundControlStationAdmin(ModelAdmin):
    """Admin for GroundControlStation model."""
    list_display = [
        'name',
        'code',
        'zone',
        'status',
        'max_drones',
        'is_active',
        'last_heartbeat',
    ]
    list_filter = [
        'status',
        'is_active',
        'zone__warehouse',
        'zone',
    ]
    search_fields = [
        'name',
        'code',
        'hardware_id',
        'ip_address',
        'zone__name',
        'zone__warehouse__name',
    ]
    raw_id_fields = ['zone']
    inlines = [DroneWorkAreaInline]

    fieldsets = (
        (None, {
            'fields': ('zone', 'name', 'code', 'description')
        }),
        ('Position', {
            'fields': ('x_position', 'y_position', 'z_position'),
            'classes': ('collapse',),
        }),
        ('Hardware', {
            'fields': (
                'hardware_id',
                'ip_address',
                'firmware_version',
            ),
            'classes': ('collapse',),
        }),
        ('Capacity', {
            'fields': ('max_drones',)
        }),
        ('Status', {
            'fields': ('status', 'is_active', 'last_heartbeat')
        }),
    )

    readonly_fields = ['last_heartbeat']


@admin.register(DroneWorkArea)
class DroneWorkAreaAdmin(ModelAdmin):
    """Admin for DroneWorkArea model."""
    list_display = [
        'name',
        'code',
        'ground_control_station',
        'area_type',
        'max_drones',
        'max_flight_speed_mps',
        'is_active',
    ]
    list_filter = [
        'area_type',
        'is_active',
        'ground_control_station__zone__warehouse',
        'ground_control_station__zone',
        'ground_control_station',
    ]
    search_fields = [
        'name',
        'code',
        'ground_control_station__name',
        'ground_control_station__zone__name',
    ]
    raw_id_fields = ['ground_control_station']

    fieldsets = (
        (None, {
            'fields': (
                'ground_control_station',
                'name',
                'code',
                'description',
                'area_type',
            )
        }),
        ('Boundaries', {
            'fields': (
                ('min_x', 'max_x'),
                ('min_y', 'max_y'),
                ('min_z', 'max_z'),
            )
        }),
        ('Tethered Configuration', {
            'fields': (
                'tether_length_m',
                ('tether_anchor_x', 'tether_anchor_y', 'tether_anchor_z'),
            ),
            'classes': ('collapse',),
        }),
        ('Operational Limits', {
            'fields': ('max_flight_speed_mps', 'max_drones')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

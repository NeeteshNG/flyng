"""
Drones Admin Configuration

Admin classes for drone management models with Unfold UI.
"""

from django.contrib import admin

from unfold.admin import ModelAdmin, TabularInline

from .models import Drone, DroneMaintenanceRecord, DroneTelemetryLog

# =============================================================================
# Inline Admin Classes
# =============================================================================


class DroneMaintenanceInline(TabularInline):
    """Inline for recent maintenance records."""

    model = DroneMaintenanceRecord
    extra = 0
    max_num = 5
    fields = [
        "maintenance_type",
        "title",
        "performed_by",
        "scheduled_at",
        "completed_at",
    ]
    readonly_fields = ["maintenance_type", "title", "performed_by", "scheduled_at", "completed_at"]
    show_change_link = True
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


# =============================================================================
# Model Admin Classes
# =============================================================================


@admin.register(Drone)
class DroneAdmin(ModelAdmin):
    """Admin for Drone model."""

    list_display = [
        "name",
        "serial_number",
        "work_area",
        "status",
        "autonomy_mode",
        "total_flight_hours",
        "total_flights",
        "is_active",
        "last_heartbeat",
    ]
    list_filter = [
        "status",
        "autonomy_mode",
        "is_active",
        "work_area__ground_control_station__zone__warehouse",
        "work_area__ground_control_station__zone",
        "work_area",
        "manufacturer",
    ]
    search_fields = [
        "name",
        "serial_number",
        "model",
        "manufacturer",
    ]
    date_hierarchy = "created_at"
    raw_id_fields = ["work_area", "current_battery"]
    inlines = [DroneMaintenanceInline]

    fieldsets = (
        (None, {"fields": ("work_area", "name", "serial_number")}),
        (
            "Hardware",
            {
                "fields": (
                    "model",
                    "manufacturer",
                    "firmware_version",
                    "hardware_version",
                )
            },
        ),
        (
            "Home Position",
            {
                "fields": ("home_x", "home_y", "home_z"),
                "classes": ("collapse",),
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "status",
                    "autonomy_mode",
                    "is_active",
                )
            },
        ),
        (
            "Battery",
            {
                "fields": ("current_battery",),
            },
        ),
        (
            "Maintenance",
            {
                "fields": (
                    "last_maintenance_at",
                    "next_maintenance_due",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Statistics",
            {
                "fields": (
                    "total_flight_hours",
                    "total_flights",
                    "total_distance_km",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Connectivity",
            {
                "fields": (
                    "ip_address",
                    "last_heartbeat",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Configuration",
            {
                "fields": (
                    "max_payload_kg",
                    "max_flight_time_min",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    readonly_fields = [
        "last_heartbeat",
        "total_flight_hours",
        "total_flights",
        "total_distance_km",
    ]


@admin.register(DroneTelemetryLog)
class DroneTelemetryLogAdmin(ModelAdmin):
    """Admin for DroneTelemetryLog model (read-only)."""

    list_display = [
        "drone",
        "timestamp",
        "flight_mode",
        "position_display",
        "battery_percentage",
        "ground_speed",
        "rssi",
    ]
    list_filter = [
        "flight_mode",
        "drone",
        "timestamp",
    ]
    search_fields = [
        "drone__name",
        "drone__serial_number",
    ]
    date_hierarchy = "timestamp"
    raw_id_fields = ["drone"]

    fieldsets = (
        (None, {"fields": ("drone", "timestamp", "flight_mode")}),
        ("Position", {"fields": ("position_x", "position_y", "position_z")}),
        (
            "Velocity",
            {
                "fields": ("velocity_x", "velocity_y", "velocity_z"),
                "classes": ("collapse",),
            },
        ),
        (
            "Attitude",
            {
                "fields": ("roll", "pitch", "yaw"),
                "classes": ("collapse",),
            },
        ),
        (
            "Battery",
            {
                "fields": (
                    "battery_voltage",
                    "battery_percentage",
                    "battery_current",
                )
            },
        ),
        (
            "Speed",
            {
                "fields": ("ground_speed", "air_speed"),
                "classes": ("collapse",),
            },
        ),
        (
            "Environment & Signal",
            {
                "fields": ("temperature", "rssi"),
                "classes": ("collapse",),
            },
        ),
        (
            "Sensor Data",
            {
                "fields": ("sensor_data",),
                "classes": ("collapse",),
            },
        ),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Position")
    def position_display(self, obj):
        if obj.position:
            return f"({obj.position_x:.2f}, {obj.position_y:.2f}, {obj.position_z:.2f})"
        return "-"


@admin.register(DroneMaintenanceRecord)
class DroneMaintenanceRecordAdmin(ModelAdmin):
    """Admin for DroneMaintenanceRecord model (read-only after creation)."""

    list_display = [
        "drone",
        "title",
        "maintenance_type",
        "performed_by",
        "scheduled_at",
        "completed_at",
        "downtime_minutes",
        "cost",
    ]
    list_filter = [
        "maintenance_type",
        "drone",
        "completed_at",
        "performed_by",
    ]
    search_fields = [
        "drone__name",
        "drone__serial_number",
        "title",
        "description",
    ]
    date_hierarchy = "created_at"
    raw_id_fields = ["drone", "performed_by"]

    fieldsets = (
        (None, {"fields": ("drone", "performed_by")}),
        (
            "Maintenance Details",
            {
                "fields": (
                    "maintenance_type",
                    "title",
                    "description",
                )
            },
        ),
        (
            "Parts & Cost",
            {
                "fields": (
                    "parts_replaced",
                    "cost",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Schedule",
            {
                "fields": (
                    "scheduled_at",
                    "started_at",
                    "completed_at",
                    "downtime_minutes",
                )
            },
        ),
        (
            "Drone Status at Maintenance",
            {
                "fields": (
                    "flight_hours_at_maintenance",
                    "flights_at_maintenance",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Notes",
            {
                "fields": ("notes",),
                "classes": ("collapse",),
            },
        ),
    )

    def has_change_permission(self, request, obj=None):
        # Allow editing only if not completed
        if obj and obj.completed_at:
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return False

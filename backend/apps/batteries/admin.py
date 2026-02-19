"""
Battery Admin Configuration
"""
from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin, TabularInline

from .models import BatteryChargingSession, BatterySwapRecord, DroneBattery


class BatteryChargingSessionInline(TabularInline):
    """Inline for viewing recent charging sessions."""
    model = BatteryChargingSession
    extra = 0
    max_num = 10
    can_delete = False
    readonly_fields = [
        'started_at',
        'ended_at',
        'status',
        'start_charge_percent',
        'end_charge_percent',
        'duration_display',
    ]
    fields = [
        'started_at',
        'status',
        'start_charge_percent',
        'end_charge_percent',
        'duration_display',
    ]
    ordering = ['-started_at']

    def duration_display(self, obj):
        """Display charging duration."""
        duration = obj.duration_minutes
        if duration is not None:
            return f"{duration} min"
        return "-"
    duration_display.short_description = _('Duration')

    def has_add_permission(self, request, obj=None):
        return False


class SwapsRemovedInline(TabularInline):
    """Inline for viewing swaps where this battery was removed."""
    model = BatterySwapRecord
    fk_name = 'old_battery'
    extra = 0
    max_num = 10
    can_delete = False
    readonly_fields = [
        'swapped_at',
        'drone',
        'new_battery',
        'old_battery_charge',
        'swap_reason',
    ]
    fields = [
        'swapped_at',
        'drone',
        'new_battery',
        'old_battery_charge',
        'swap_reason',
    ]
    verbose_name = _('Swap (Removed)')
    verbose_name_plural = _('Swaps (Removed)')
    ordering = ['-swapped_at']

    def has_add_permission(self, request, obj=None):
        return False


class SwapsInstalledInline(TabularInline):
    """Inline for viewing swaps where this battery was installed."""
    model = BatterySwapRecord
    fk_name = 'new_battery'
    extra = 0
    max_num = 10
    can_delete = False
    readonly_fields = [
        'swapped_at',
        'drone',
        'old_battery',
        'new_battery_charge',
        'swap_reason',
    ]
    fields = [
        'swapped_at',
        'drone',
        'old_battery',
        'new_battery_charge',
        'swap_reason',
    ]
    verbose_name = _('Swap (Installed)')
    verbose_name_plural = _('Swaps (Installed)')
    ordering = ['-swapped_at']

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(DroneBattery)
class DroneBatteryAdmin(ModelAdmin):
    """Admin for DroneBattery model."""

    list_display = [
        'serial_number',
        'name',
        'warehouse',
        'status_badge',
        'health_badge',
        'charge_display',
        'cycle_progress',
        'chemistry',
        'is_active',
    ]
    list_filter = [
        'status',
        'health_status',
        'chemistry',
        'warehouse',
        'is_active',
    ]
    search_fields = [
        'serial_number',
        'name',
        'manufacturer',
        'model_number',
    ]
    readonly_fields = [
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'health_percentage',
        'cycles_remaining',
    ]
    raw_id_fields = ['warehouse']
    date_hierarchy = 'created_at'
    inlines = [BatteryChargingSessionInline, SwapsRemovedInline, SwapsInstalledInline]

    fieldsets = (
        (None, {
            'fields': ('serial_number', 'name', 'warehouse', 'is_active')
        }),
        (_('Specifications'), {
            'fields': (
                'chemistry',
                'capacity_mah',
                'current_capacity_mah',
                'voltage_nominal',
                'cell_count',
            )
        }),
        (_('Status & Health'), {
            'fields': (
                'status',
                'health_status',
                'current_charge_percent',
                'health_percentage',
            )
        }),
        (_('Cycle Tracking'), {
            'fields': (
                'cycle_count',
                'max_cycles',
                'cycles_remaining',
            )
        }),
        (_('Purchase & Warranty'), {
            'fields': (
                'manufacturer',
                'model_number',
                'purchase_date',
                'warranty_expires_at',
            ),
            'classes': ('collapse',),
        }),
        (_('Timestamps'), {
            'fields': (
                'last_charged_at',
                'last_health_check_at',
            ),
            'classes': ('collapse',),
        }),
        (_('Notes'), {
            'fields': ('notes',),
            'classes': ('collapse',),
        }),
        (_('Audit'), {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',),
        }),
    )

    def status_badge(self, obj):
        """Display status with color badge."""
        colors = {
            'AVAILABLE': '#28a745',
            'IN_USE': '#007bff',
            'CHARGING': '#ffc107',
            'LOW': '#fd7e14',
            'FAULTY': '#dc3545',
            'RETIRED': '#6c757d',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = _('Status')
    status_badge.admin_order_field = 'status'

    def health_badge(self, obj):
        """Display health status with color badge."""
        colors = {
            'EXCELLENT': '#28a745',
            'GOOD': '#20c997',
            'FAIR': '#ffc107',
            'POOR': '#fd7e14',
            'REPLACE': '#dc3545',
        }
        color = colors.get(obj.health_status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_health_status_display()
        )
    health_badge.short_description = _('Health')
    health_badge.admin_order_field = 'health_status'

    def charge_display(self, obj):
        """Display charge level with progress bar."""
        charge = obj.current_charge_percent
        if charge >= 60:
            color = '#28a745'
        elif charge >= 30:
            color = '#ffc107'
        else:
            color = '#dc3545'

        return format_html(
            '<div style="width: 80px; background-color: #e9ecef; border-radius: 3px;">'
            '<div style="width: {}%; background-color: {}; height: 18px; '
            'border-radius: 3px; text-align: center; color: white; font-size: 11px; '
            'line-height: 18px;">{:.0f}%</div></div>',
            charge, color, charge
        )
    charge_display.short_description = _('Charge')
    charge_display.admin_order_field = 'current_charge_percent'

    def cycle_progress(self, obj):
        """Display cycle count as progress toward max cycles."""
        percentage = (obj.cycle_count / obj.max_cycles) * 100 if obj.max_cycles else 0
        if percentage >= 90:
            color = '#dc3545'
        elif percentage >= 70:
            color = '#ffc107'
        else:
            color = '#28a745'

        return format_html(
            '<span style="color: {};">{} / {}</span>',
            color, obj.cycle_count, obj.max_cycles
        )
    cycle_progress.short_description = _('Cycles')
    cycle_progress.admin_order_field = 'cycle_count'

    def health_percentage(self, obj):
        """Display calculated health percentage."""
        return f"{obj.health_percentage}%"
    health_percentage.short_description = _('Health %')

    def cycles_remaining(self, obj):
        """Display remaining cycles."""
        return obj.cycles_remaining
    cycles_remaining.short_description = _('Remaining Cycles')


@admin.register(BatteryChargingSession)
class BatteryChargingSessionAdmin(ModelAdmin):
    """Admin for BatteryChargingSession model (read-only)."""

    list_display = [
        'battery',
        'started_at',
        'status_badge',
        'charge_gained_display',
        'duration_display',
        'charger_id',
    ]
    list_filter = [
        'status',
        'battery__warehouse',
        'started_at',
    ]
    search_fields = [
        'battery__serial_number',
        'battery__name',
        'charger_id',
    ]
    readonly_fields = [
        'battery',
        'charger_id',
        'charger_location',
        'started_at',
        'ended_at',
        'status',
        'start_charge_percent',
        'end_charge_percent',
        'start_voltage',
        'end_voltage',
        'energy_consumed_wh',
        'peak_charging_rate_amps',
        'temperature_start_c',
        'temperature_max_c',
        'error_code',
        'error_message',
        'notes',
        'created_at',
    ]
    date_hierarchy = 'started_at'

    fieldsets = (
        (None, {
            'fields': ('battery', 'status', 'charger_id', 'charger_location')
        }),
        (_('Timing'), {
            'fields': ('started_at', 'ended_at')
        }),
        (_('Charge Levels'), {
            'fields': ('start_charge_percent', 'end_charge_percent')
        }),
        (_('Voltage'), {
            'fields': ('start_voltage', 'end_voltage'),
            'classes': ('collapse',),
        }),
        (_('Energy Metrics'), {
            'fields': ('energy_consumed_wh', 'peak_charging_rate_amps'),
            'classes': ('collapse',),
        }),
        (_('Temperature'), {
            'fields': ('temperature_start_c', 'temperature_max_c'),
            'classes': ('collapse',),
        }),
        (_('Errors'), {
            'fields': ('error_code', 'error_message'),
            'classes': ('collapse',),
        }),
        (_('Notes'), {
            'fields': ('notes',),
            'classes': ('collapse',),
        }),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def status_badge(self, obj):
        """Display status with color badge."""
        colors = {
            'STARTED': '#17a2b8',
            'CHARGING': '#ffc107',
            'COMPLETED': '#28a745',
            'INTERRUPTED': '#fd7e14',
            'FAILED': '#dc3545',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = _('Status')
    status_badge.admin_order_field = 'status'

    def charge_gained_display(self, obj):
        """Display charge gained during session."""
        gained = obj.charge_gained
        if gained is not None:
            color = '#28a745' if gained > 0 else '#6c757d'
            return format_html(
                '<span style="color: {};">{}% → {}% (+{}%)</span>',
                color,
                obj.start_charge_percent,
                obj.end_charge_percent,
                gained
            )
        return f"{obj.start_charge_percent}% → ..."
    charge_gained_display.short_description = _('Charge')

    def duration_display(self, obj):
        """Display charging duration."""
        duration = obj.duration_minutes
        if duration is not None:
            if duration >= 60:
                hours = int(duration // 60)
                minutes = int(duration % 60)
                return f"{hours}h {minutes}m"
            return f"{duration:.0f} min"
        return "-"
    duration_display.short_description = _('Duration')


@admin.register(BatterySwapRecord)
class BatterySwapRecordAdmin(ModelAdmin):
    """Admin for BatterySwapRecord model (read-only)."""

    list_display = [
        'drone',
        'swapped_at',
        'old_battery',
        'new_battery',
        'swap_reason_badge',
        'performed_by',
        'charge_comparison',
    ]
    list_filter = [
        'swap_reason',
        'drone__work_area__gcs__zone__warehouse',
        'swapped_at',
    ]
    search_fields = [
        'drone__serial_number',
        'drone__name',
        'old_battery__serial_number',
        'new_battery__serial_number',
        'performed_by__email',
    ]
    readonly_fields = [
        'drone',
        'old_battery',
        'new_battery',
        'swapped_at',
        'swap_reason',
        'performed_by',
        'old_battery_charge',
        'new_battery_charge',
        'location',
        'swap_duration_seconds',
        'notes',
        'created_at',
    ]
    raw_id_fields = ['drone', 'old_battery', 'new_battery', 'performed_by']
    date_hierarchy = 'swapped_at'

    fieldsets = (
        (None, {
            'fields': ('drone', 'swap_reason', 'swapped_at')
        }),
        (_('Batteries'), {
            'fields': (
                'old_battery',
                'old_battery_charge',
                'new_battery',
                'new_battery_charge',
            )
        }),
        (_('Details'), {
            'fields': ('performed_by', 'location', 'swap_duration_seconds'),
            'classes': ('collapse',),
        }),
        (_('Notes'), {
            'fields': ('notes',),
            'classes': ('collapse',),
        }),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def swap_reason_badge(self, obj):
        """Display swap reason with color badge."""
        colors = {
            'LOW_BATTERY': '#ffc107',
            'SCHEDULED': '#17a2b8',
            'MALFUNCTION': '#dc3545',
            'PREVENTIVE': '#28a745',
            'DEGRADATION': '#fd7e14',
            'EMERGENCY': '#dc3545',
        }
        color = colors.get(obj.swap_reason, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_swap_reason_display()
        )
    swap_reason_badge.short_description = _('Reason')
    swap_reason_badge.admin_order_field = 'swap_reason'

    def charge_comparison(self, obj):
        """Display charge levels comparison."""
        old_charge = obj.old_battery_charge if obj.old_battery_charge is not None else "N/A"
        new_charge = obj.new_battery_charge
        return format_html(
            '<span style="color: #dc3545;">{}</span> → '
            '<span style="color: #28a745;">{}</span>',
            f"{old_charge}%" if isinstance(old_charge, int) else old_charge,
            f"{new_charge}%"
        )
    charge_comparison.short_description = _('Charge')

"""
Organization Admin Configuration
"""
from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Organization, OrganizationSettings, Plan


@admin.register(Plan)
class PlanAdmin(ModelAdmin):
    list_display = [
        'name',
        'plan_type',
        'monthly_price',
        'annual_price',
        'max_users',
        'max_warehouses',
        'max_drones',
        'is_active',
        'display_order',
    ]
    list_filter = ['plan_type', 'is_active', 'analytics_enabled', 'api_access_enabled']
    search_fields = ['name', 'description']
    ordering = ['display_order', 'monthly_price']

    fieldsets = (
        (None, {
            'fields': ('name', 'plan_type', 'description', 'is_active', 'display_order')
        }),
        ('Pricing', {
            'fields': ('monthly_price', 'annual_price')
        }),
        ('Resource Limits', {
            'fields': (
                'max_users',
                'max_warehouses',
                'max_drones',
                'max_storage_locations',
                'max_orders_per_month',
            )
        }),
        ('Features', {
            'fields': (
                'analytics_enabled',
                'api_access_enabled',
                'priority_support',
                'custom_branding',
                'audit_logs_enabled',
                'export_enabled',
            )
        }),
        ('API & Data', {
            'fields': ('api_rate_limit_per_minute', 'data_retention_days')
        }),
    )


class OrganizationSettingsInline(admin.StackedInline):
    model = OrganizationSettings
    can_delete = False
    verbose_name_plural = 'Settings'

    fieldsets = (
        ('Regional', {
            'fields': ('timezone', 'date_format', 'currency', 'language')
        }),
        ('Inventory', {
            'fields': (
                'min_stock_threshold',
                'enable_low_stock_alerts',
                'auto_reorder_enabled',
            ),
            'classes': ('collapse',),
        }),
        ('Notifications', {
            'fields': (
                'email_notifications_enabled',
                'daily_summary_enabled',
                'daily_summary_time',
            ),
            'classes': ('collapse',),
        }),
        ('Drone Operations', {
            'fields': (
                'drone_idle_timeout_minutes',
                'battery_low_threshold_percent',
                'battery_critical_threshold_percent',
                'auto_assign_jobs',
                'order_priority_enabled',
            ),
            'classes': ('collapse',),
        }),
        ('Security', {
            'fields': (
                'session_timeout_minutes',
                'require_2fa_for_admins',
                'password_expiry_days',
            ),
            'classes': ('collapse',),
        }),
        ('Webhooks', {
            'fields': ('webhook_url', 'webhook_secret'),
            'classes': ('collapse',),
        }),
    )


@admin.register(Organization)
class OrganizationAdmin(ModelAdmin):
    list_display = [
        'name',
        'slug',
        'owner',
        'plan',
        'is_active',
        'is_verified',
        'created_at',
    ]
    list_filter = ['is_active', 'is_verified', 'plan', 'created_at']
    search_fields = ['name', 'slug', 'email', 'gst_number']
    prepopulated_fields = {'slug': ('name',)}
    raw_id_fields = ['owner']
    date_hierarchy = 'created_at'
    inlines = [OrganizationSettingsInline]

    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'description', 'logo')
        }),
        ('Contact', {
            'fields': ('email', 'phone', 'website')
        }),
        ('Address', {
            'fields': (
                'address_line1',
                'address_line2',
                'city',
                'state',
                'postal_code',
                'country',
            ),
            'classes': ('collapse',),
        }),
        ('India Compliance', {
            'fields': ('gst_number', 'pan_number'),
            'classes': ('collapse',),
        }),
        ('Subscription', {
            'fields': ('plan', 'trial_ends_at')
        }),
        ('Ownership', {
            'fields': ('owner',)
        }),
        ('Status', {
            'fields': ('is_active', 'is_verified', 'verified_at')
        }),
    )

    readonly_fields = ['verified_at']

    def save_model(self, request, obj, form, change):
        if not change:  # Creating new organization
            if not obj.owner_id:
                obj.owner = request.user
        super().save_model(request, obj, form, change)


@admin.register(OrganizationSettings)
class OrganizationSettingsAdmin(ModelAdmin):
    list_display = [
        'organization',
        'timezone',
        'currency',
        'email_notifications_enabled',
    ]
    list_filter = ['timezone', 'currency', 'email_notifications_enabled']
    search_fields = ['organization__name']
    raw_id_fields = ['organization']

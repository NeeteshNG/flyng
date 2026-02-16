"""
User Admin Configuration with Unfold
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html

from unfold.admin import ModelAdmin
from unfold.decorators import display

from .models import User, OTP


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    """
    Enhanced User Admin with Unfold styling and features.
    """
    # List display configuration
    list_display = [
        'email',
        'first_name',
        'last_name',
        'role',
        'is_verified',
        'is_active',
        'last_login',
    ]
    list_display_links = ['email']
    list_filter = [
        'role',
        'is_verified',
        'is_active',
        'is_staff',
    ]
    list_per_page = 25
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering = ['-created_at']

    # Fieldsets for edit form
    fieldsets = (
        (None, {
            'fields': ('email', 'password'),
        }),
        (_('Personal Information'), {
            'fields': ('first_name', 'last_name', 'phone', 'profile_picture'),
        }),
        (_('Role & Verification'), {
            'fields': ('role', 'is_verified'),
        }),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important Dates'), {
            'fields': ('last_login', 'date_joined', 'created_at', 'updated_at'),
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'phone', 'password1', 'password2', 'role'),
        }),
    )

    readonly_fields = ['last_login', 'date_joined', 'created_at', 'updated_at']

    actions = ['activate_users', 'deactivate_users', 'mark_verified']

    @admin.action(description=_('Activate selected users'))
    def activate_users(self, request, queryset):
        """Bulk activate users."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} user(s) activated successfully.')

    @admin.action(description=_('Deactivate selected users'))
    def deactivate_users(self, request, queryset):
        """Bulk deactivate users."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} user(s) deactivated successfully.')

    @admin.action(description=_('Mark as verified'))
    def mark_verified(self, request, queryset):
        """Bulk mark users as verified."""
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} user(s) marked as verified.')


@admin.register(OTP)
class OTPAdmin(ModelAdmin):
    """
    OTP Admin with Unfold styling.
    """
    list_display = [
        'email',
        'otp',
        'is_used',
        'expires_at',
        'created_at',
    ]
    list_filter = [
        'is_used',
    ]
    search_fields = ['email']
    ordering = ['-created_at']
    readonly_fields = ['otp', 'created_at']
    list_per_page = 50

    # Disable add/edit for OTPs (they should only be generated programmatically)
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

"""
User Admin Configuration with Unfold
Production-level admin with:
- Two-Factor Authentication management
- Session management
- Password history tracking
- Email change requests
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from unfold.admin import ModelAdmin

from .models import (
    OTP,
    EmailChangeRequest,
    LoginAttempt,
    PasswordHistory,
    TwoFactorAuth,
    User,
    UserPreferences,
    UserSession,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    """
    Enhanced User Admin with Unfold styling and features.
    """

    # List display configuration
    list_display = [
        "email",
        "first_name",
        "last_name",
        "role",
        "is_verified",
        "is_active",
        "is_locked_display",
        "last_login",
    ]
    list_display_links = ["email"]
    list_filter = [
        "role",
        "is_verified",
        "is_active",
        "is_staff",
    ]
    list_per_page = 25
    search_fields = ["email", "first_name", "last_name", "phone"]
    ordering = ["-created_at"]

    # Fieldsets for edit form
    fieldsets = (
        (
            None,
            {
                "fields": ("email", "password"),
            },
        ),
        (
            _("Personal Information"),
            {
                "fields": ("first_name", "last_name", "phone", "profile_picture"),
            },
        ),
        (
            _("Role & Verification"),
            {
                "fields": ("role", "is_verified"),
            },
        ),
        (
            _("Two-Factor Authentication"),
            {
                "fields": ("two_factor_enabled",),
            },
        ),
        (
            _("Password Management"),
            {
                "fields": ("password_changed_at", "force_password_change"),
            },
        ),
        (
            _("Security"),
            {
                "fields": ("failed_login_attempts", "lockout_until", "last_login_ip"),
                "classes": ("collapse",),
            },
        ),
        (
            _("Permissions"),
            {
                "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
            },
        ),
        (
            _("Important Dates"),
            {
                "fields": ("last_login", "date_joined", "created_at", "updated_at"),
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "phone", "password1", "password2", "role"),
            },
        ),
    )

    readonly_fields = [
        "uuid",
        "last_login",
        "date_joined",
        "created_at",
        "updated_at",
        "failed_login_attempts",
        "lockout_until",
        "last_login_ip",
        "password_changed_at",
        "two_factor_enabled",
    ]

    actions = [
        "activate_users",
        "deactivate_users",
        "mark_verified",
        "unlock_users",
        "disable_2fa",
        "force_password_change",
    ]

    @admin.display(description=_("Locked"), boolean=True)
    def is_locked_display(self, obj):
        """Display if user account is locked."""
        return obj.is_locked()

    @admin.action(description=_("Activate selected users"))
    def activate_users(self, request, queryset):
        """Bulk activate users."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} user(s) activated successfully.")

    @admin.action(description=_("Deactivate selected users"))
    def deactivate_users(self, request, queryset):
        """Bulk deactivate users."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} user(s) deactivated successfully.")

    @admin.action(description=_("Mark as verified"))
    def mark_verified(self, request, queryset):
        """Bulk mark users as verified."""
        updated = queryset.update(is_verified=True)
        self.message_user(request, f"{updated} user(s) marked as verified.")

    @admin.action(description=_("Unlock selected users"))
    def unlock_users(self, request, queryset):
        """Unlock users with failed login attempts."""
        updated = queryset.update(failed_login_attempts=0, lockout_until=None)
        self.message_user(request, f"{updated} user(s) unlocked successfully.")

    @admin.action(description=_("Disable 2FA for selected users"))
    def disable_2fa(self, request, queryset):
        """Disable 2FA for selected users."""
        count = 0
        for user in queryset.filter(two_factor_enabled=True):
            TwoFactorAuth.objects.filter(user=user).update(is_active=False)
            user.two_factor_enabled = False
            user.save(update_fields=["two_factor_enabled"])
            count += 1
        self.message_user(request, f"2FA disabled for {count} user(s).")

    @admin.action(description=_("Force password change for selected users"))
    def force_password_change(self, request, queryset):
        """Force selected users to change password on next login."""
        updated = queryset.update(force_password_change=True)
        self.message_user(request, f"{updated} user(s) will be required to change password.")


@admin.register(OTP)
class OTPAdmin(ModelAdmin):
    """
    OTP Admin with Unfold styling.
    """

    list_display = [
        "email",
        "otp_type",
        "otp",
        "is_used",
        "attempts",
        "expires_at",
        "created_at",
    ]
    list_filter = [
        "otp_type",
        "is_used",
    ]
    search_fields = ["email"]
    ordering = ["-created_at"]
    readonly_fields = ["otp", "created_at", "updated_at", "attempts"]
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(LoginAttempt)
class LoginAttemptAdmin(ModelAdmin):
    """
    Login Attempt Admin for security auditing.
    """

    list_display = [
        "email",
        "ip_address",
        "success",
        "failure_reason",
        "created_at",
    ]
    list_filter = [
        "success",
        "created_at",
    ]
    search_fields = ["email", "ip_address"]
    ordering = ["-created_at"]
    readonly_fields = ["email", "ip_address", "user_agent", "success", "failure_reason", "created_at"]
    list_per_page = 100
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        # Only superusers can delete login attempts
        return request.user.is_superuser


@admin.register(TwoFactorAuth)
class TwoFactorAuthAdmin(ModelAdmin):
    """
    Two-Factor Authentication Admin for security management.
    """

    list_display = [
        "user",
        "is_active",
        "backup_codes_remaining",
        "verified_at",
        "created_at",
    ]
    list_filter = [
        "is_active",
        "created_at",
    ]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
    ordering = ["-created_at"]
    readonly_fields = [
        "user",
        "secret_key",
        "is_active",
        "backup_codes_remaining",
        "verified_at",
        "backup_codes_generated_at",
        "created_at",
        "updated_at",
    ]
    list_per_page = 50

    @admin.display(description=_("Backup Codes"))
    def backup_codes_remaining(self, obj):
        """Display remaining backup codes count."""
        remaining = obj.get_remaining_backup_codes_count()
        if remaining == 0:
            return format_html('<span style="color: red;">0</span>')
        elif remaining <= 3:
            return format_html('<span style="color: orange;">{}</span>', remaining)
        return remaining

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(UserSession)
class UserSessionAdmin(ModelAdmin):
    """
    User Session Admin for session management and security.
    """

    list_display = [
        "user",
        "device_type",
        "browser",
        "os",
        "ip_address",
        "is_active",
        "is_expired_display",
        "last_activity",
        "created_at",
    ]
    list_filter = [
        "is_active",
        "device_type",
        "created_at",
    ]
    search_fields = ["user__email", "ip_address", "session_key"]
    ordering = ["-last_activity"]
    readonly_fields = [
        "user",
        "session_key",
        "ip_address",
        "user_agent",
        "device_type",
        "browser",
        "os",
        "location",
        "last_activity",
        "created_at",
        "expires_at",
    ]
    list_per_page = 50
    date_hierarchy = "created_at"
    actions = ["terminate_sessions"]

    @admin.display(description=_("Expired"), boolean=True)
    def is_expired_display(self, obj):
        """Display if session is expired."""
        return obj.is_expired()

    @admin.action(description=_("Terminate selected sessions"))
    def terminate_sessions(self, request, queryset):
        """Terminate selected sessions."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} session(s) terminated.")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PasswordHistory)
class PasswordHistoryAdmin(ModelAdmin):
    """
    Password History Admin for auditing.
    """

    list_display = [
        "user",
        "created_at",
    ]
    list_filter = [
        "created_at",
    ]
    search_fields = ["user__email"]
    ordering = ["-created_at"]
    readonly_fields = ["user", "password_hash", "created_at"]
    list_per_page = 50
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(EmailChangeRequest)
class EmailChangeRequestAdmin(ModelAdmin):
    """
    Email Change Request Admin for auditing.
    """

    list_display = [
        "user",
        "old_email",
        "new_email",
        "is_verified",
        "expires_at",
        "created_at",
    ]
    list_filter = [
        "is_verified",
        "created_at",
    ]
    search_fields = ["user__email", "old_email", "new_email"]
    ordering = ["-created_at"]
    readonly_fields = [
        "user",
        "old_email",
        "new_email",
        "is_verified",
        "verified_at",
        "expires_at",
        "created_at",
        "updated_at",
    ]
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(UserPreferences)
class UserPreferencesAdmin(ModelAdmin):
    """
    User Preferences Admin.
    """

    list_display = [
        "user",
        "theme",
        "timezone",
        "language",
        "created_at",
    ]
    list_filter = [
        "theme",
        "language",
    ]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
    ordering = ["-created_at"]
    list_per_page = 50
    raw_id_fields = ["user"]

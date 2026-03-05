"""
User Models for FlyNG
Production-level user management with:
- Email-based authentication
- Two-Factor Authentication (TOTP)
- Password history tracking
- Session management
- Account lockout protection
- Login attempt auditing
"""

import base64
import hashlib
import secrets
import uuid
from datetime import timedelta
from io import BytesIO

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

import pyotp
import qrcode
from django_cryptography.fields import encrypt
from phonenumber_field.modelfields import PhoneNumberField

from apps.core.choices import (
    ActivityAction,
    DateFormatChoices,
    LanguageChoices,
    OTPType,
    ThemeChoices,
    UserRole,
    validate_timezone,
)
from apps.core.models import ReadOnlyModel, TimeStampedModel
from apps.core.utils import get_client_ip, parse_user_agent


class UserManager(BaseUserManager):
    """
    Custom user manager where email is the unique identifier.
    """

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        # Record initial password in history
        if password:
            PasswordHistory.record(user, password)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", UserRole.ADMIN)
        extra_fields.setdefault("is_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)

    def active(self):
        """Return only active users."""
        return self.filter(is_active=True)

    def verified(self):
        """Return only verified users."""
        return self.filter(is_verified=True, is_active=True)


class User(AbstractUser, TimeStampedModel):
    """
    Custom User model for FlyNG.
    Uses email as the unique identifier instead of username.
    """

    # UUID for external references (prevents ID enumeration)
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
    )

    # Remove username field, use email instead
    username = None
    email = models.EmailField(
        verbose_name=_("Email Address"),
        unique=True,
        db_index=True,
    )

    # Profile fields
    phone = PhoneNumberField(
        verbose_name=_("Phone Number"),
        blank=True,
        null=True,
        region="IN",
        help_text=_("Phone number with country code (e.g., +91 9876543210)"),
    )
    role = models.CharField(
        verbose_name=_("Role"),
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.VIEWER,
        db_index=True,
    )
    is_verified = models.BooleanField(
        verbose_name=_("Email Verified"),
        default=False,
        db_index=True,
    )
    profile_picture = models.ImageField(
        verbose_name=_("Profile Picture"),
        upload_to="profile_pictures/%Y/%m/",
        blank=True,
        null=True,
    )

    # Security fields
    last_login_ip = models.GenericIPAddressField(
        verbose_name=_("Last Login IP"),
        blank=True,
        null=True,
    )
    failed_login_attempts = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Failed Login Attempts"),
    )
    lockout_until = models.DateTimeField(
        verbose_name=_("Locked Until"),
        blank=True,
        null=True,
        help_text=_("Account is locked until this time due to failed login attempts"),
    )

    # Two-Factor Authentication
    two_factor_enabled = models.BooleanField(
        verbose_name=_("Two-Factor Enabled"),
        default=False,
        help_text=_("Whether 2FA is enabled for this account"),
    )

    # Password management
    password_changed_at = models.DateTimeField(
        verbose_name=_("Password Changed At"),
        blank=True,
        null=True,
        help_text=_("Last time the password was changed"),
    )
    force_password_change = models.BooleanField(
        verbose_name=_("Force Password Change"),
        default=False,
        help_text=_("Require password change on next login"),
    )

    # Organization relationship - users can belong to one organization
    # Many-to-many relationship via OrganizationMembership will be added in Day 3
    # This direct FK is for the user's "current/active" organization context
    active_organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.SET_NULL,
        related_name="active_users",
        null=True,
        blank=True,
        verbose_name=_("Active Organization"),
        help_text=_("Currently active organization for this user"),
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "is_active"]),
            models.Index(fields=["role", "is_active"]),
            models.Index(fields=["is_verified", "is_active"]),
        ]

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        # Track password changes
        if self.pk:
            try:
                old_user = User.objects.get(pk=self.pk)
                if old_user.password != self.password:
                    self.password_changed_at = timezone.now()
            except User.DoesNotExist:
                pass
        super().save(*args, **kwargs)

    def get_full_name(self):
        """Return first_name plus last_name, with a space in between."""
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def full_name(self):
        return self.get_full_name()

    # Role helper methods
    def is_admin(self):
        return self.role == UserRole.ADMIN

    def is_manager(self):
        return self.role in [UserRole.ADMIN, UserRole.MANAGER]

    def can_modify(self):
        return self.role in [UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR]

    # Account lockout methods
    def is_locked(self):
        """Check if account is currently locked."""
        if self.lockout_until and self.lockout_until > timezone.now():
            return True
        return False

    def get_lockout_remaining(self):
        """Get remaining lockout time in seconds."""
        if not self.is_locked():
            return 0
        return int((self.lockout_until - timezone.now()).total_seconds())

    def record_failed_login(self):
        """Record a failed login attempt and lock account if necessary."""
        self.failed_login_attempts += 1
        # Progressive lockout: 5 attempts = 30 min, 10 = 1 hour, 15+ = 24 hours
        if self.failed_login_attempts >= 15:
            self.lockout_until = timezone.now() + timedelta(hours=24)
        elif self.failed_login_attempts >= 10:
            self.lockout_until = timezone.now() + timedelta(hours=1)
        elif self.failed_login_attempts >= 5:
            self.lockout_until = timezone.now() + timedelta(minutes=30)
        self.save(update_fields=["failed_login_attempts", "lockout_until"])

    def record_successful_login(self, ip_address=None):
        """Reset failed attempts on successful login."""
        self.failed_login_attempts = 0
        self.lockout_until = None
        if ip_address:
            self.last_login_ip = ip_address
        self.save(update_fields=["failed_login_attempts", "lockout_until", "last_login_ip"])

    def unlock(self):
        """Manually unlock the account."""
        self.failed_login_attempts = 0
        self.lockout_until = None
        self.save(update_fields=["failed_login_attempts", "lockout_until"])

    # Password management methods
    def set_password(self, raw_password):
        """Override to track password history."""
        super().set_password(raw_password)
        self.password_changed_at = timezone.now()
        self.force_password_change = False

    def check_password_history(self, raw_password, count=5):
        """Check if password was used in the last N passwords."""
        recent_passwords = PasswordHistory.objects.filter(user=self).order_by("-created_at")[:count]

        for history in recent_passwords:
            if history.check_password(raw_password):
                return True
        return False

    def is_password_expired(self, max_age_days=90):
        """Check if password has expired (older than max_age_days)."""
        if not self.password_changed_at:
            return True
        return (timezone.now() - self.password_changed_at).days > max_age_days

    # Two-Factor Authentication methods
    def requires_2fa(self):
        """Check if user requires 2FA verification."""
        return self.two_factor_enabled

    def get_active_2fa(self):
        """Get the active 2FA configuration."""
        return self.two_factor_auth.filter(is_active=True).first()

    def setup_2fa(self):
        """Initialize 2FA setup (returns TwoFactorSetup)."""
        # Deactivate any existing 2FA
        self.two_factor_auth.update(is_active=False)

        # Create new 2FA setup
        return TwoFactorAuth.objects.create(
            user=self,
            is_active=False,  # Not active until verified
        )

    def enable_2fa(self, totp_code):
        """Enable 2FA after verifying the TOTP code."""
        setup = self.two_factor_auth.filter(is_active=False).first()
        if not setup:
            return False, "No pending 2FA setup found"

        if setup.verify_totp(totp_code):
            setup.is_active = True
            setup.verified_at = timezone.now()
            setup.save()
            self.two_factor_enabled = True
            self.save(update_fields=["two_factor_enabled"])
            return True, "Two-factor authentication enabled successfully"

        return False, "Invalid verification code"

    def disable_2fa(self):
        """Disable 2FA for this user."""
        self.two_factor_auth.all().delete()
        self.two_factor_enabled = False
        self.save(update_fields=["two_factor_enabled"])

    # Session management
    def get_active_sessions(self):
        """Get all active sessions for this user."""
        return self.sessions.filter(is_active=True, expires_at__gt=timezone.now())

    def terminate_all_sessions(self, except_current=None):
        """Terminate all sessions (optionally except current)."""
        sessions = self.sessions.filter(is_active=True)
        if except_current:
            sessions = sessions.exclude(session_key=except_current)
        return sessions.update(is_active=False, terminated_at=timezone.now())

    def terminate_session(self, session_key):
        """Terminate a specific session."""
        return self.sessions.filter(session_key=session_key).update(is_active=False, terminated_at=timezone.now())


class PasswordHistory(TimeStampedModel):
    """
    Track password history to prevent reuse.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_history",
        verbose_name=_("User"),
    )
    password_hash = models.CharField(
        max_length=255,
        verbose_name=_("Password Hash"),
    )

    class Meta:
        verbose_name = _("Password History")
        verbose_name_plural = _("Password Histories")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"Password history for {self.user.email} at {self.created_at}"

    def check_password(self, raw_password):
        """Check if the raw password matches this history entry."""
        return check_password(raw_password, self.password_hash)

    @classmethod
    def record(cls, user, raw_password):
        """Record a password in history."""
        return cls.objects.create(
            user=user,
            password_hash=make_password(raw_password),
        )

    @classmethod
    def cleanup_old(cls, user, keep_count=10):
        """Keep only the last N password records."""
        old_records = cls.objects.filter(user=user).order_by("-created_at")[keep_count:]
        old_ids = list(old_records.values_list("id", flat=True))
        return cls.objects.filter(id__in=old_ids).delete()


class TwoFactorAuth(TimeStampedModel):
    """
    Two-Factor Authentication configuration using TOTP.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="two_factor_auth",
        db_index=True,
        verbose_name=_("User"),
    )
    secret_key = models.CharField(
        max_length=32,
        verbose_name=_("Secret Key"),
        help_text=_("TOTP secret key (base32 encoded)"),
    )
    is_active = models.BooleanField(
        default=False,
        verbose_name=_("Is Active"),
    )
    verified_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Verified At"),
    )

    # Backup codes for recovery
    backup_codes = models.JSONField(
        default=list,
        verbose_name=_("Backup Codes"),
        help_text=_("Hashed backup recovery codes"),
    )
    backup_codes_generated_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Backup Codes Generated At"),
    )

    class Meta:
        verbose_name = _("Two-Factor Authentication")
        verbose_name_plural = _("Two-Factor Authentications")
        ordering = ["-created_at"]
        constraints = [
            # Prevent multiple active 2FA setups for the same user
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(is_active=True),
                name="unique_active_2fa_per_user",
            ),
        ]

    def __str__(self):
        status = "Active" if self.is_active else "Pending"
        return f"2FA ({status}) for {self.user.email}"

    def save(self, *args, **kwargs):
        if not self.secret_key:
            self.secret_key = pyotp.random_base32()
        super().save(*args, **kwargs)

    def get_totp(self):
        """Get TOTP instance for this configuration."""
        return pyotp.TOTP(self.secret_key)

    def verify_totp(self, code):
        """Verify a TOTP code (with 1 interval tolerance)."""
        totp = self.get_totp()
        return totp.verify(code, valid_window=1)

    def get_provisioning_uri(self):
        """Get the provisioning URI for QR code generation."""
        totp = self.get_totp()
        return totp.provisioning_uri(
            name=self.user.email,
            issuer_name=getattr(settings, "TWO_FACTOR_ISSUER", "FlyNG"),
        )

    def get_qr_code_base64(self):
        """Generate QR code as base64 string for API response."""
        uri = self.get_provisioning_uri()
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        return base64.b64encode(buffer.getvalue()).decode()

    def generate_backup_codes(self, count=10):
        """Generate new backup recovery codes."""
        codes = []
        hashed_codes = []

        for _i in range(count):
            # Generate 8-character alphanumeric code
            code = secrets.token_hex(4).upper()
            codes.append(code)
            # Store hashed version
            hashed_codes.append(hashlib.sha256(code.encode()).hexdigest())

        self.backup_codes = hashed_codes
        self.backup_codes_generated_at = timezone.now()
        self.save()

        return codes  # Return plain codes to show user once

    def verify_backup_code(self, code):
        """Verify and consume a backup code."""
        code_hash = hashlib.sha256(code.upper().encode()).hexdigest()
        if code_hash in self.backup_codes:
            self.backup_codes.remove(code_hash)
            self.save()
            return True
        return False

    def get_remaining_backup_codes_count(self):
        """Get count of remaining backup codes."""
        return len(self.backup_codes)


class UserSession(TimeStampedModel):
    """
    Track user sessions for security and "logout all devices" feature.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sessions",
        verbose_name=_("User"),
    )
    session_key = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        verbose_name=_("Session Key"),
    )
    ip_address = models.GenericIPAddressField(
        verbose_name=_("IP Address"),
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name=_("User Agent"),
    )
    device_type = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Device Type"),
        help_text=_("Detected device type (mobile, tablet, desktop)"),
    )
    browser = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Browser"),
    )
    os = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Operating System"),
    )
    # Location encrypted for PII protection
    location = encrypt(
        models.CharField(
            max_length=200,
            blank=True,
            verbose_name=_("Location"),
            help_text=_("Approximate location based on IP"),
        )
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Is Active"),
    )
    last_activity = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Last Activity"),
    )
    expires_at = models.DateTimeField(
        verbose_name=_("Expires At"),
    )
    terminated_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Terminated At"),
    )

    class Meta:
        verbose_name = _("User Session")
        verbose_name_plural = _("User Sessions")
        ordering = ["-last_activity"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["session_key"]),
            models.Index(fields=["expires_at"]),
        ]
        constraints = [
            # Session expiry should be after creation
            models.CheckConstraint(
                condition=models.Q(expires_at__gte=models.F("created_at")),
                name="session_expires_after_created",
            ),
        ]

    def __str__(self):
        status = "Active" if self.is_active else "Terminated"
        return f"{status} session for {self.user.email} from {self.ip_address}"

    def is_expired(self):
        """Check if session has expired."""
        return timezone.now() > self.expires_at

    def refresh(self, extend_hours=24):
        """Extend session expiry."""
        self.last_activity = timezone.now()
        self.expires_at = timezone.now() + timedelta(hours=extend_hours)
        self.save(update_fields=["last_activity", "expires_at"])

    def terminate(self):
        """Terminate this session."""
        self.is_active = False
        self.terminated_at = timezone.now()
        self.save(update_fields=["is_active", "terminated_at"])

    @classmethod
    def create_session(cls, user, request, session_key, expires_hours=24):
        """Create a new session with device info using shared utilities."""
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        ip_address = get_client_ip(request)

        # Parse user agent for device info using shared utility
        ua_info = parse_user_agent(user_agent)

        return cls.objects.create(
            user=user,
            session_key=session_key,
            ip_address=ip_address,
            user_agent=user_agent[:500],
            device_type=ua_info.device,
            browser=ua_info.browser,
            os=ua_info.os,
            expires_at=timezone.now() + timedelta(hours=expires_hours),
        )

    @classmethod
    def cleanup_expired(cls):
        """Delete expired sessions older than 30 days."""
        cutoff = timezone.now() - timedelta(days=30)
        return cls.objects.filter(expires_at__lt=cutoff).delete()


class OTP(TimeStampedModel):
    """
    OTP model for password reset and email verification.
    """

    email = models.EmailField(
        db_index=True,
        verbose_name=_("Email"),
    )
    otp = models.CharField(
        max_length=6,
        verbose_name=_("OTP"),
    )
    otp_type = models.CharField(
        max_length=20,
        choices=OTPType.choices,
        default=OTPType.EMAIL_VERIFICATION,
        verbose_name=_("OTP Type"),
    )
    is_used = models.BooleanField(
        default=False,
        verbose_name=_("Is Used"),
    )
    expires_at = models.DateTimeField(
        db_index=True,
        verbose_name=_("Expires At"),
    )
    attempts = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Attempts"),
    )
    max_attempts = models.PositiveIntegerField(
        default=3,
        verbose_name=_("Maximum Attempts"),
    )

    # For email change verification
    new_email = models.EmailField(
        blank=True,
        default="",
        verbose_name=_("New Email"),
    )

    class Meta:
        verbose_name = _("OTP")
        verbose_name_plural = _("OTPs")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "otp_type", "is_used"]),
        ]

    def __str__(self):
        return f"{self.otp_type} OTP for {self.email}"

    def is_valid(self):
        """Check if OTP is still valid (not used, not expired, attempts not exceeded)."""
        if self.is_used:
            return False
        if self.expires_at < timezone.now():
            return False
        if self.attempts >= self.max_attempts:
            return False
        return True

    def verify(self, otp_code):
        """Verify the OTP code. Returns True if valid, False otherwise."""
        self.attempts += 1
        self.save(update_fields=["attempts"])

        if not self.is_valid():
            return False

        if self.otp == otp_code:
            self.is_used = True
            self.save(update_fields=["is_used"])
            return True

        return False

    @classmethod
    def generate(cls, email, otp_type=None, validity_minutes=10, new_email=None):
        """
        Generate a new OTP for the given email.
        Invalidates any existing unused OTPs of the same type.
        """
        if otp_type is None:
            otp_type = OTPType.EMAIL_VERIFICATION

        # Invalidate existing unused OTPs of same type
        cls.objects.filter(
            email=email,
            otp_type=otp_type,
            is_used=False,
        ).update(is_used=True)

        # Generate 6-digit OTP
        otp_code = "".join([str(secrets.randbelow(10)) for _ in range(6)])

        return cls.objects.create(
            email=email,
            otp=otp_code,
            otp_type=otp_type,
            expires_at=timezone.now() + timedelta(minutes=validity_minutes),
            new_email=new_email,
        )

    @classmethod
    def cleanup_expired(cls):
        """Delete expired OTPs older than 24 hours."""
        cutoff = timezone.now() - timedelta(hours=24)
        return cls.objects.filter(expires_at__lt=cutoff).delete()


class LoginAttempt(TimeStampedModel):
    """
    Track login attempts for security auditing.
    """

    email = models.EmailField(
        db_index=True,
        verbose_name=_("Email"),
    )
    ip_address = models.GenericIPAddressField(
        verbose_name=_("IP Address"),
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name=_("User Agent"),
    )
    success = models.BooleanField(
        default=False,
        verbose_name=_("Success"),
    )
    failure_reason = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Failure Reason"),
    )
    two_factor_used = models.BooleanField(
        default=False,
        verbose_name=_("Two-Factor Used"),
    )

    class Meta:
        verbose_name = _("Login Attempt")
        verbose_name_plural = _("Login Attempts")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
            models.Index(fields=["success", "created_at"]),
            models.Index(fields=["created_at"]),  # For cleanup queries
        ]

    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{status} login for {self.email} from {self.ip_address}"

    @classmethod
    def record(cls, email, ip_address, user_agent="", success=False, failure_reason="", two_factor_used=False):
        """Record a login attempt."""
        return cls.objects.create(
            email=email,
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else "",
            success=success,
            failure_reason=failure_reason,
            two_factor_used=two_factor_used,
        )

    @classmethod
    def recent_failures(cls, email=None, ip_address=None, minutes=30):
        """Count recent failed login attempts."""
        cutoff = timezone.now() - timedelta(minutes=minutes)
        qs = cls.objects.filter(success=False, created_at__gte=cutoff)

        if email:
            qs = qs.filter(email=email)
        if ip_address:
            qs = qs.filter(ip_address=ip_address)

        return qs.count()

    @classmethod
    def cleanup_old(cls, days=90):
        """Delete login attempts older than N days."""
        cutoff = timezone.now() - timedelta(days=days)
        return cls.objects.filter(created_at__lt=cutoff).delete()


class EmailChangeRequest(TimeStampedModel):
    """
    Track email change requests requiring verification.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_change_requests",
        verbose_name=_("User"),
    )
    old_email = models.EmailField(
        verbose_name=_("Old Email"),
    )
    new_email = models.EmailField(
        verbose_name=_("New Email"),
    )
    is_verified = models.BooleanField(
        default=False,
        verbose_name=_("Is Verified"),
    )
    verified_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Verified At"),
    )
    expires_at = models.DateTimeField(
        verbose_name=_("Expires At"),
    )

    class Meta:
        verbose_name = _("Email Change Request")
        verbose_name_plural = _("Email Change Requests")
        ordering = ["-created_at"]

    def __str__(self):
        status = "Verified" if self.is_verified else "Pending"
        return f"{status} email change: {self.old_email} -> {self.new_email}"

    def is_expired(self):
        """Check if request has expired."""
        return timezone.now() > self.expires_at

    def complete(self):
        """Complete the email change."""
        if self.is_expired():
            return False, "Email change request has expired"

        if self.is_verified:
            return False, "Email change already completed"

        self.user.email = self.new_email
        self.user.save(update_fields=["email"])

        self.is_verified = True
        self.verified_at = timezone.now()
        self.save()

        return True, "Email changed successfully"

    @classmethod
    def create_request(cls, user, new_email, validity_hours=24):
        """Create a new email change request."""
        # Invalidate existing requests
        cls.objects.filter(user=user, is_verified=False).delete()

        return cls.objects.create(
            user=user,
            old_email=user.email,
            new_email=new_email,
            expires_at=timezone.now() + timedelta(hours=validity_hours),
        )


class UserActivity(ReadOnlyModel):
    """
    Append-only audit log of user activities.
    Tracks business actions: login, CRUD on resources, etc.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="activities",
        verbose_name=_("User"),
    )
    action = models.CharField(
        max_length=20,
        choices=ActivityAction.choices,
        db_index=True,
        verbose_name=_("Action"),
    )
    resource_type = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name=_("Resource Type"),
        help_text=_("Type of resource affected (e.g., Drone, Order, Item)"),
    )
    resource_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Resource ID"),
        help_text=_("ID or UUID of the affected resource"),
    )
    resource_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Resource Name"),
        help_text=_("Display name of the affected resource"),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description"),
        help_text=_("Human-readable description of the activity"),
    )
    ip_address = models.GenericIPAddressField(
        blank=True,
        null=True,
        verbose_name=_("IP Address"),
    )
    user_agent = models.CharField(
        max_length=500,
        blank=True,
        verbose_name=_("User Agent"),
    )

    class Meta:
        verbose_name = _("User Activity")
        verbose_name_plural = _("User Activities")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["resource_type", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        if self.resource_type:
            return f"{self.user.email} {self.action} {self.resource_type} {self.resource_name}"
        return f"{self.user.email} {self.action}"

    @classmethod
    def log(cls, user, action, resource_type="", resource_id="", resource_name="",
            description="", request=None):
        """Create an activity log entry."""
        ip_address = None
        user_agent = ""
        if request:
            ip_address = get_client_ip(request)
            user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]

        return cls.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            resource_name=str(resource_name)[:200],
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    @classmethod
    def cleanup_old(cls, days=90):
        """Delete activity logs older than N days."""
        cutoff = timezone.now() - timedelta(days=days)
        return cls.objects.filter(created_at__lt=cutoff).delete()


class UserPreferences(TimeStampedModel):
    """
    Per-user preferences that override organization defaults.

    All preference fields are nullable: None means "use organization default".
    Only non-null values represent explicit user overrides.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="preferences",
        verbose_name=_("User"),
    )

    # Appearance
    theme = models.CharField(
        max_length=10,
        choices=ThemeChoices.choices,
        null=True,
        blank=True,
        verbose_name=_("Theme"),
        help_text=_("Color theme preference"),
    )

    # Regional (overrides org defaults)
    timezone = models.CharField(
        max_length=64,
        validators=[validate_timezone],
        null=True,
        blank=True,
        verbose_name=_("Timezone"),
        help_text=_("Personal timezone override"),
    )
    date_format = models.CharField(
        max_length=20,
        choices=DateFormatChoices.choices,
        null=True,
        blank=True,
        verbose_name=_("Date Format"),
        help_text=_("Personal date format preference"),
    )
    language = models.CharField(
        max_length=10,
        choices=LanguageChoices.choices,
        null=True,
        blank=True,
        verbose_name=_("Language"),
        help_text=_("Personal language preference"),
    )

    # Notification preferences (overrides org defaults)
    email_notifications_enabled = models.BooleanField(
        null=True,
        blank=True,
        verbose_name=_("Email Notifications Enabled"),
        help_text=_("Personal email notification preference"),
    )
    daily_summary_enabled = models.BooleanField(
        null=True,
        blank=True,
        verbose_name=_("Daily Summary Enabled"),
        help_text=_("Personal daily summary preference"),
    )
    daily_summary_time = models.TimeField(
        null=True,
        blank=True,
        verbose_name=_("Daily Summary Time"),
        help_text=_("Personal daily summary time"),
    )

    class Meta:
        verbose_name = _("User Preferences")
        verbose_name_plural = _("User Preferences")

    def __str__(self):
        return f"Preferences for {self.user.email}"

"""
User Serializers for FlyNG
Production-level serializers with:
- Two-Factor Authentication
- Password history validation
- Session management
- Secure token handling
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from phonenumber_field.serializerfields import PhoneNumberField
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.core.choices import OTPType
from apps.core.utils import get_client_ip

from .models import (
    LoginAttempt,
    PasswordHistory,
    UserSession,
)

User = get_user_model()


# =============================================================================
# USER SERIALIZERS
# =============================================================================


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model (read operations).
    """

    full_name = serializers.CharField(read_only=True)
    phone = PhoneNumberField(required=False, allow_blank=True)
    has_2fa = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "uuid",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "role",
            "is_verified",
            "profile_picture",
            "is_active",
            "two_factor_enabled",
            "has_2fa",
            "last_login",
            "password_changed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "uuid",
            "is_verified",
            "is_active",
            "two_factor_enabled",
            "last_login",
            "password_changed_at",
            "created_at",
            "updated_at",
        ]

    def get_has_2fa(self, obj):
        return obj.two_factor_enabled


class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer for user lists with all necessary fields for display.
    """

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "uuid",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "role",
            "is_verified",
            "is_active",
            "two_factor_enabled",
            "profile_picture",
            "created_at",
            "updated_at",
            "last_login",
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new users.
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    phone = PhoneNumberField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "phone",
            "role",
        ]

    def validate_email(self, value):
        """Normalize email to lowercase."""
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user details.
    """

    phone = PhoneNumberField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone", "profile_picture"]


class UserAdminUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for admin to update user details including role.
    """

    phone = PhoneNumberField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "phone",
            "profile_picture",
            "role",
            "is_active",
            "is_verified",
            "force_password_change",
        ]


# =============================================================================
# PASSWORD SERIALIZERS
# =============================================================================


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change with history validation.
    """

    old_password = serializers.CharField(
        required=True,
        style={"input_type": "password"},
    )
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})

        # Check password history if user is in context
        user = self.context.get("user")
        if user and user.check_password_history(attrs["new_password"]):
            raise serializers.ValidationError(
                {"new_password": "This password has been used recently. Please choose a different password."}
            )

        return attrs


class ResetPasswordSerializer(serializers.Serializer):
    """
    Serializer for resetting password with OTP.
    """

    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={"input_type": "password"},
    )

    def validate_email(self, value):
        return value.lower()

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("OTP must contain only digits.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        return attrs


# =============================================================================
# AUTHENTICATION SERIALIZERS
# =============================================================================


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that handles:
    - Account lockout
    - Login tracking
    - 2FA detection (returns requires_2fa flag if enabled)
    - Session creation
    """

    totp_code = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        email = attrs.get("email", "").lower()
        totp_code = attrs.get("totp_code", "")
        request = self.context.get("request")

        # Get IP address and user agent
        ip_address = self._get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "") if request else ""

        # Check if user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist as err:
            LoginAttempt.record(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="User not found",
            )
            raise serializers.ValidationError({"detail": "No active account found with the given credentials"}) from err

        # Check if account is locked
        if user.is_locked():
            remaining = user.get_lockout_remaining()
            LoginAttempt.record(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="Account locked",
            )
            raise serializers.ValidationError(
                {
                    "detail": f"Account is temporarily locked. Please try again in {remaining // 60} minutes.",
                    "lockout_remaining": remaining,
                }
            )

        # Validate credentials (password only first)
        try:
            # Call parent to validate email/password
            data = super().validate({"email": email, "password": attrs.get("password")})
        except Exception:
            user.record_failed_login()
            LoginAttempt.record(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="Invalid password",
            )
            raise

        # Check if 2FA is required
        if user.requires_2fa():
            two_factor = user.get_active_2fa()
            if not two_factor:
                # 2FA enabled but no active setup - shouldn't happen
                user.two_factor_enabled = False
                user.save(update_fields=["two_factor_enabled"])
            else:
                if not totp_code:
                    # Return partial auth - client needs to provide TOTP
                    raise serializers.ValidationError(
                        {
                            "detail": "Two-factor authentication required",
                            "requires_2fa": True,
                            "email": email,
                        }
                    )

                # Verify TOTP code
                if not two_factor.verify_totp(totp_code):
                    # Try backup code
                    if not two_factor.verify_backup_code(totp_code):
                        LoginAttempt.record(
                            email=email,
                            ip_address=ip_address,
                            user_agent=user_agent,
                            success=False,
                            failure_reason="Invalid 2FA code",
                            two_factor_used=True,
                        )
                        raise serializers.ValidationError(
                            {
                                "detail": "Invalid two-factor authentication code",
                                "requires_2fa": True,
                            }
                        )

        # Successful login - use transaction for atomicity
        with transaction.atomic():
            LoginAttempt.record(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=True,
                two_factor_used=user.requires_2fa(),
            )

            # Reset failed attempts and record IP
            user.record_successful_login(ip_address)

        # Add user data to response
        data["user"] = {
            "id": user.id,
            "uuid": str(user.uuid),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "role": user.role,
            "is_verified": user.is_verified,
            "two_factor_enabled": user.two_factor_enabled,
            "force_password_change": user.force_password_change,
        }

        # Check if password change is required
        if user.force_password_change or user.is_password_expired():
            data["password_change_required"] = True

        return data

    def _get_client_ip(self, request):
        """Extract client IP from request using shared utility."""
        return get_client_ip(request)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token["email"] = user.email
        token["role"] = user.role
        token["uuid"] = str(user.uuid)
        token["2fa_enabled"] = user.two_factor_enabled

        return token


# =============================================================================
# TWO-FACTOR AUTHENTICATION SERIALIZERS
# =============================================================================


class TwoFactorSetupSerializer(serializers.Serializer):
    """
    Serializer for 2FA setup response.
    """

    secret_key = serializers.CharField(read_only=True)
    provisioning_uri = serializers.CharField(read_only=True)
    qr_code = serializers.CharField(read_only=True)


class TwoFactorEnableSerializer(serializers.Serializer):
    """
    Serializer for enabling 2FA.
    """

    totp_code = serializers.CharField(
        required=True,
        min_length=6,
        max_length=6,
        help_text="6-digit code from your authenticator app",
    )

    def validate_totp_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("Code must contain only digits.")
        return value


class TwoFactorVerifySerializer(serializers.Serializer):
    """
    Serializer for verifying 2FA code.
    """

    totp_code = serializers.CharField(required=True, min_length=6, max_length=8)

    def validate_totp_code(self, value):
        # Allow alphanumeric for backup codes
        return value.upper()


class TwoFactorDisableSerializer(serializers.Serializer):
    """
    Serializer for disabling 2FA.
    """

    password = serializers.CharField(
        required=True,
        style={"input_type": "password"},
        help_text="Your account password for verification",
    )


class BackupCodesSerializer(serializers.Serializer):
    """
    Serializer for backup codes response.
    """

    codes = serializers.ListField(child=serializers.CharField())
    generated_at = serializers.DateTimeField()
    remaining_count = serializers.IntegerField()


# =============================================================================
# SESSION MANAGEMENT SERIALIZERS
# =============================================================================


class UserSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for user sessions.
    """

    is_current = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = [
            "id",
            "session_key",
            "ip_address",
            "device_type",
            "browser",
            "os",
            "location",
            "is_active",
            "is_current",
            "is_expired",
            "last_activity",
            "created_at",
            "expires_at",
        ]
        read_only_fields = fields

    def get_is_current(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "session_key"):
            return obj.session_key == request.session_key
        return False

    def get_is_expired(self, obj):
        return obj.is_expired()


class TerminateSessionSerializer(serializers.Serializer):
    """
    Serializer for terminating sessions.
    """

    session_key = serializers.CharField(required=False)
    terminate_all = serializers.BooleanField(default=False)
    keep_current = serializers.BooleanField(default=True)


# =============================================================================
# EMAIL CHANGE SERIALIZERS
# =============================================================================


class EmailChangeRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting email change.
    """

    new_email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        style={"input_type": "password"},
    )

    def validate_new_email(self, value):
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("This email is already in use.")
        return email


class EmailChangeConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming email change.
    """

    otp = serializers.CharField(required=True, min_length=6, max_length=6)

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("OTP must contain only digits.")
        return value


# =============================================================================
# OTP SERIALIZERS
# =============================================================================


class SendOTPSerializer(serializers.Serializer):
    """
    Serializer for sending OTP.
    """

    email = serializers.EmailField(required=True)
    otp_type = serializers.ChoiceField(
        choices=OTPType.choices,
        default=OTPType.EMAIL_VERIFICATION,
    )

    def validate_email(self, value):
        return value.lower()


class VerifyOTPSerializer(serializers.Serializer):
    """
    Serializer for verifying OTP.
    """

    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)
    otp_type = serializers.ChoiceField(
        choices=OTPType.choices,
        default=OTPType.EMAIL_VERIFICATION,
    )

    def validate_email(self, value):
        return value.lower()

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("OTP must contain only digits.")
        return value


# =============================================================================
# ADMIN/AUDIT SERIALIZERS
# =============================================================================


class LoginAttemptSerializer(serializers.ModelSerializer):
    """
    Serializer for login attempts (admin view).
    """

    class Meta:
        model = LoginAttempt
        fields = [
            "id",
            "email",
            "ip_address",
            "user_agent",
            "success",
            "failure_reason",
            "two_factor_used",
            "created_at",
        ]
        read_only_fields = fields


class PasswordHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for password history (admin view).
    """

    class Meta:
        model = PasswordHistory
        fields = ["id", "created_at"]
        read_only_fields = fields

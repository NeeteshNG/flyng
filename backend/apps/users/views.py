"""
User Views for FlyNG
Production-level views with:
- Two-Factor Authentication
- Password history validation
- Session management
- Email change verification
"""

from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.core.choices import OTPType
from apps.core.pagination import StandardPagination
from apps.core.permissions import IsAdmin, IsManager
from apps.core.utils import get_client_ip, parse_user_agent

from .models import (
    OTP,
    EmailChangeRequest,
    LoginAttempt,
    PasswordHistory,
    UserSession,
)
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    EmailChangeConfirmSerializer,
    EmailChangeRequestSerializer,
    LoginAttemptSerializer,
    ResetPasswordSerializer,
    SendOTPSerializer,
    TerminateSessionSerializer,
    TwoFactorDisableSerializer,
    TwoFactorEnableSerializer,
    UserAdminUpdateSerializer,
    UserCreateSerializer,
    UserListSerializer,
    UserSerializer,
    UserSessionSerializer,
    UserUpdateSerializer,
    VerifyOTPSerializer,
)

User = get_user_model()


# =============================================================================
# AUTHENTICATION VIEWS
# =============================================================================


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.
    """

    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens for the new user
        refresh = RefreshToken.for_user(user)

        # Send verification OTP
        self._send_verification_otp(user)

        return Response(
            {
                "success": True,
                "message": "User registered successfully. Please verify your email.",
                "data": {
                    "user": UserSerializer(user).data,
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                },
            },
            status=status.HTTP_201_CREATED,
        )

    def _send_verification_otp(self, user):
        """Send verification OTP email to user."""
        try:
            otp = OTP.generate(
                email=user.email,
                otp_type=OTPType.EMAIL_VERIFICATION,
                validity_minutes=30,
            )
            send_mail(
                subject="Verify your FlyNG account",
                message=f"Your verification code is: {otp.otp}\n\nThis code expires in 30 minutes.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass  # Don't fail registration if email fails


class LoginView(TokenObtainPairView):
    """
    User login endpoint with JWT tokens.
    Supports 2FA - if enabled, requires totp_code field.
    """

    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Create session record for the logged-in user
            try:
                email = request.data.get("email", "").lower()
                user = User.objects.get(email=email)
                self._create_session(request, user)
            except User.DoesNotExist:
                pass

            response.data = {"success": True, "message": "Login successful", "data": response.data}
        return response

    def _create_session(self, request, user):
        """Create a session record for tracking."""
        import secrets

        # Get client info using shared utilities
        ip_address = get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        # Parse user agent for device info using shared utility
        ua_info = parse_user_agent(user_agent)

        # Generate unique session key
        session_key = secrets.token_hex(32)

        # Session expires based on JWT refresh token lifetime (7 days default)
        expires_at = timezone.now() + timedelta(days=7)

        UserSession.objects.create(
            user=user,
            session_key=session_key,
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else "",
            device_type=ua_info.device,
            browser=ua_info.browser,
            os=ua_info.os,
            expires_at=expires_at,
        )


class LogoutSerializer(serializers.Serializer):
    """Serializer for logout request."""

    refresh = serializers.CharField(required=False, help_text="Refresh token to blacklist")


class LogoutView(APIView):
    """
    User logout endpoint - blacklists the refresh token.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=LogoutSerializer,
        responses={200: OpenApiResponse(description="Logout successful")},
    )
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            return Response({"success": True, "message": "Logout successful"}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"success": False, "message": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# PROFILE VIEWS
# =============================================================================


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Get and update current user's profile.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return UserUpdateSerializer
        return UserSerializer

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"success": True, "data": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(
            {"success": True, "message": "Profile updated successfully", "data": UserSerializer(instance).data}
        )


class ChangePasswordView(APIView):
    """
    Change password for authenticated user.
    Validates against password history.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={
            200: OpenApiResponse(description="Password changed successfully"),
            400: OpenApiResponse(description="Validation error or incorrect password"),
        },
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"user": request.user})
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"success": False, "message": "Current password is incorrect"}, status=status.HTTP_400_BAD_REQUEST
            )

        new_password = serializer.validated_data["new_password"]

        # Record in password history before changing
        PasswordHistory.record(user, new_password)
        PasswordHistory.cleanup_old(user, keep_count=10)

        user.set_password(new_password)
        user.save()

        return Response({"success": True, "message": "Password changed successfully"})


# =============================================================================
# TWO-FACTOR AUTHENTICATION VIEWS
# =============================================================================


class TwoFactorSetupView(APIView):
    """
    Initialize 2FA setup. Returns secret key and QR code.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description="QR code and secret key returned")},
    )
    def post(self, request):
        user = request.user

        if user.two_factor_enabled:
            return Response(
                {"success": False, "message": "Two-factor authentication is already enabled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create 2FA setup
        two_factor = user.setup_2fa()

        return Response(
            {
                "success": True,
                "message": "Scan the QR code with your authenticator app",
                "data": {
                    "secret_key": two_factor.secret_key,
                    "provisioning_uri": two_factor.get_provisioning_uri(),
                    "qr_code": f"data:image/png;base64,{two_factor.get_qr_code_base64()}",
                },
            }
        )


class TwoFactorEnableView(APIView):
    """
    Enable 2FA after verifying the TOTP code.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TwoFactorEnableSerializer,
        responses={200: OpenApiResponse(description="2FA enabled with backup codes")},
    )
    def post(self, request):
        serializer = TwoFactorEnableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        totp_code = serializer.validated_data["totp_code"]

        success, message = user.enable_2fa(totp_code)

        if success:
            # Generate backup codes
            two_factor = user.get_active_2fa()
            backup_codes = two_factor.generate_backup_codes()

            return Response(
                {
                    "success": True,
                    "message": message,
                    "data": {
                        "backup_codes": backup_codes,
                        "warning": "Save these backup codes in a safe place. They can be used to access your account if you lose your authenticator device.",
                    },
                }
            )

        return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)


class TwoFactorDisableView(APIView):
    """
    Disable 2FA after password verification.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TwoFactorDisableSerializer,
        responses={200: OpenApiResponse(description="2FA disabled")},
    )
    def post(self, request):
        serializer = TwoFactorDisableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        if not user.two_factor_enabled:
            return Response(
                {"success": False, "message": "Two-factor authentication is not enabled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify password
        if not user.check_password(serializer.validated_data["password"]):
            return Response({"success": False, "message": "Invalid password"}, status=status.HTTP_400_BAD_REQUEST)

        user.disable_2fa()

        return Response({"success": True, "message": "Two-factor authentication has been disabled"})


class TwoFactorBackupCodesView(APIView):
    """
    Generate new backup codes (invalidates existing ones).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description="New backup codes generated")},
    )
    def post(self, request):
        user = request.user

        if not user.two_factor_enabled:
            return Response(
                {"success": False, "message": "Two-factor authentication is not enabled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        two_factor = user.get_active_2fa()
        if not two_factor:
            return Response(
                {"success": False, "message": "Two-factor authentication configuration not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        backup_codes = two_factor.generate_backup_codes()

        return Response(
            {
                "success": True,
                "message": "New backup codes generated. Previous codes are now invalid.",
                "data": {
                    "codes": backup_codes,
                    "generated_at": two_factor.backup_codes_generated_at,
                    "remaining_count": len(backup_codes),
                },
            }
        )

    def get(self, request):
        """Get remaining backup codes count."""
        user = request.user

        if not user.two_factor_enabled:
            return Response({"success": True, "data": {"remaining_count": 0, "enabled": False}})

        two_factor = user.get_active_2fa()
        if not two_factor:
            return Response({"success": True, "data": {"remaining_count": 0, "enabled": False}})

        return Response(
            {
                "success": True,
                "data": {
                    "remaining_count": two_factor.get_remaining_backup_codes_count(),
                    "generated_at": two_factor.backup_codes_generated_at,
                    "enabled": True,
                },
            }
        )


# =============================================================================
# SESSION MANAGEMENT VIEWS
# =============================================================================


class SessionListView(generics.ListAPIView):
    """
    List all active sessions for current user.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserSessionSerializer

    def get_queryset(self):
        return self.request.user.get_active_sessions()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data})


class SessionTerminateView(APIView):
    """
    Terminate sessions.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TerminateSessionSerializer,
        responses={200: OpenApiResponse(description="Session(s) terminated")},
    )
    def post(self, request):
        serializer = TerminateSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        session_key = serializer.validated_data.get("session_key")
        terminate_all = serializer.validated_data.get("terminate_all", False)
        keep_current = serializer.validated_data.get("keep_current", True)

        if terminate_all:
            current_session = request.META.get("HTTP_X_SESSION_KEY")
            count = user.terminate_all_sessions(except_current=current_session if keep_current else None)
            return Response({"success": True, "message": f"{count} session(s) terminated"})

        if session_key:
            count = user.terminate_session(session_key)
            if count:
                return Response({"success": True, "message": "Session terminated successfully"})
            return Response({"success": False, "message": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {"success": False, "message": "Please specify session_key or set terminate_all to true"},
            status=status.HTTP_400_BAD_REQUEST,
        )


# =============================================================================
# EMAIL CHANGE VIEWS
# =============================================================================


class EmailChangeRequestView(APIView):
    """
    Request email change - sends OTP to new email.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=EmailChangeRequestSerializer,
        responses={200: OpenApiResponse(description="Verification code sent to new email")},
    )
    def post(self, request):
        serializer = EmailChangeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        new_email = serializer.validated_data["new_email"]
        password = serializer.validated_data["password"]

        # Verify password
        if not user.check_password(password):
            return Response({"success": False, "message": "Invalid password"}, status=status.HTTP_400_BAD_REQUEST)

        # Create email change request
        EmailChangeRequest.create_request(user, new_email)

        # Generate OTP for new email
        otp = OTP.generate(
            email=new_email,
            otp_type=OTPType.EMAIL_CHANGE,
            validity_minutes=30,
            new_email=new_email,
        )

        # Send OTP to new email
        send_mail(
            subject="Verify your new email address - FlyNG",
            message=f"Your verification code is: {otp.otp}\n\nThis code expires in 30 minutes.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[new_email],
            fail_silently=True,
        )

        return Response({"success": True, "message": f"Verification code sent to {new_email}"})


class EmailChangeConfirmView(APIView):
    """
    Confirm email change with OTP.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=EmailChangeConfirmSerializer,
        responses={200: OpenApiResponse(description="Email changed successfully")},
    )
    def post(self, request):
        serializer = EmailChangeConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        otp_code = serializer.validated_data["otp"]

        # Get pending email change request
        try:
            email_request = EmailChangeRequest.objects.filter(
                user=user,
                is_verified=False,
            ).latest("created_at")
        except EmailChangeRequest.DoesNotExist:
            return Response(
                {"success": False, "message": "No pending email change request found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify OTP
        try:
            otp = OTP.objects.filter(
                email=email_request.new_email,
                otp_type=OTPType.EMAIL_CHANGE,
                is_used=False,
            ).latest("created_at")
        except OTP.DoesNotExist:
            return Response(
                {"success": False, "message": "Invalid or expired verification code"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not otp.verify(otp_code):
            return Response(
                {"success": False, "message": "Invalid verification code"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Complete email change
        success, message = email_request.complete()

        if success:
            return Response({"success": True, "message": message, "data": {"new_email": email_request.new_email}})

        return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# USER MANAGEMENT VIEWS (Admin/Manager)
# =============================================================================


class UserListView(generics.ListAPIView):
    """
    List all users (Admin/Manager only).
    """

    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [IsAuthenticated, IsManager]
    pagination_class = StandardPagination
    filterset_fields = ["role", "is_verified", "is_active", "two_factor_enabled"]
    search_fields = ["email", "first_name", "last_name"]
    ordering_fields = ["created_at", "email", "first_name"]
    ordering = ["-created_at"]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data})


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Get, update, or delete a specific user (Admin/Manager only).
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsManager]
    lookup_field = "uuid"

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            if self.request.user.is_admin():
                return UserAdminUpdateSerializer
            return UserUpdateSerializer
        return UserSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"success": True, "data": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(
            {"success": True, "message": "User updated successfully", "data": UserSerializer(instance).data}
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if not request.user.is_admin():
            return Response(
                {"success": False, "message": "Only administrators can delete users"}, status=status.HTTP_403_FORBIDDEN
            )

        if instance == request.user:
            return Response(
                {"success": False, "message": "You cannot delete your own account"}, status=status.HTTP_400_BAD_REQUEST
            )

        instance.is_active = False
        instance.save()

        return Response({"success": True, "message": "User deleted successfully"}, status=status.HTTP_200_OK)


class UnlockUserView(APIView):
    """
    Unlock a locked user account (Admin only).
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description="User unlocked")},
    )
    def post(self, request, uuid):
        try:
            user = User.objects.get(uuid=uuid)
            user.unlock()

            return Response({"success": True, "message": f"User {user.email} has been unlocked"})
        except User.DoesNotExist:
            return Response({"success": False, "message": "User not found"}, status=status.HTTP_404_NOT_FOUND)


class ForcePasswordChangeView(APIView):
    """
    Force a user to change password on next login (Admin only).
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description="User forced to change password")},
    )
    def post(self, request, uuid):
        try:
            user = User.objects.get(uuid=uuid)
            user.force_password_change = True
            user.save(update_fields=["force_password_change"])

            return Response(
                {"success": True, "message": f"User {user.email} will be required to change password on next login"}
            )
        except User.DoesNotExist:
            return Response({"success": False, "message": "User not found"}, status=status.HTTP_404_NOT_FOUND)


# =============================================================================
# OTP VIEWS
# =============================================================================


class SendOTPView(APIView):
    """
    Send OTP to email for verification or password reset.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=SendOTPSerializer,
        responses={200: OpenApiResponse(description="OTP sent to email")},
    )
    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp_type = serializer.validated_data.get("otp_type", OTPType.EMAIL_VERIFICATION)

        # Check if user exists
        if not User.objects.filter(email=email).exists():
            # Don't reveal if email exists for security
            return Response({"success": True, "message": "If this email exists, an OTP has been sent."})

        # Check rate limiting (max 3 OTPs per email per hour)
        recent_otps = OTP.objects.filter(
            email=email,
            otp_type=otp_type,
            created_at__gte=timezone.now() - timedelta(hours=1),
        ).count()

        if recent_otps >= 3:
            return Response(
                {"success": False, "message": "Too many OTP requests. Please try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Generate OTP
        otp = OTP.generate(email=email, otp_type=otp_type)

        # Send email
        subject = "Your FlyNG verification code"
        if otp_type == OTPType.PASSWORD_RESET:
            subject = "Reset your FlyNG password"

        send_mail(
            subject=subject,
            message=f"Your verification code is: {otp.otp}\n\nThis code expires in 10 minutes.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )

        return Response({"success": True, "message": "OTP sent to your email"})


class VerifyOTPView(APIView):
    """
    Verify OTP code for email verification.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=VerifyOTPSerializer,
        responses={200: OpenApiResponse(description="OTP verified")},
    )
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp_code = serializer.validated_data["otp"]
        otp_type = serializer.validated_data.get("otp_type", OTPType.EMAIL_VERIFICATION)

        try:
            otp = OTP.objects.filter(
                email=email,
                otp_type=otp_type,
                is_used=False,
            ).latest("created_at")
        except OTP.DoesNotExist:
            return Response({"success": False, "message": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)

        if not otp.verify(otp_code):
            remaining = otp.max_attempts - otp.attempts
            return Response(
                {
                    "success": False,
                    "message": f"Invalid OTP. {remaining} attempts remaining."
                    if remaining > 0
                    else "OTP expired or invalid.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_type == OTPType.EMAIL_VERIFICATION:
            try:
                user = User.objects.get(email=email)
                user.is_verified = True
                user.save(update_fields=["is_verified"])
            except User.DoesNotExist:
                pass

        return Response({"success": True, "message": "OTP verified successfully"})


class ResetPasswordView(APIView):
    """
    Reset password with OTP verification.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=ResetPasswordSerializer,
        responses={200: OpenApiResponse(description="Password reset successfully")},
    )
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp_code = serializer.validated_data["otp"]
        new_password = serializer.validated_data["new_password"]

        try:
            otp = OTP.objects.filter(
                email=email,
                otp_type=OTPType.PASSWORD_RESET,
                is_used=False,
            ).latest("created_at")
        except OTP.DoesNotExist:
            return Response(
                {"success": False, "message": "Invalid or expired OTP. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not otp.verify(otp_code):
            return Response({"success": False, "message": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)

            # Record in password history
            PasswordHistory.record(user, new_password)

            user.set_password(new_password)
            user.failed_login_attempts = 0
            user.lockout_until = None
            user.save()

            return Response({"success": True, "message": "Password reset successfully"})
        except User.DoesNotExist:
            return Response({"success": False, "message": "User not found"}, status=status.HTTP_404_NOT_FOUND)


# =============================================================================
# AUDIT/ADMIN VIEWS
# =============================================================================


class LoginAttemptListView(generics.ListAPIView):
    """
    List login attempts (Admin only).
    """

    queryset = LoginAttempt.objects.all()
    serializer_class = LoginAttemptSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = StandardPagination
    filterset_fields = ["email", "success", "ip_address", "two_factor_used"]
    search_fields = ["email", "ip_address"]
    ordering = ["-created_at"]

"""
User URLs for FlyNG
Production-level URL configuration with:
- Two-Factor Authentication endpoints
- Session management
- Email change verification
- Password management
"""

from django.urls import path

from rest_framework_simplejwt.views import TokenRefreshView

from . import views

app_name = "users"

urlpatterns = [
    # ==========================================================================
    # AUTHENTICATION
    # ==========================================================================
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # ==========================================================================
    # PROFILE & PASSWORD
    # ==========================================================================
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change_password"),
    # ==========================================================================
    # OTP / PASSWORD RESET / EMAIL VERIFICATION
    # ==========================================================================
    path("send-otp/", views.SendOTPView.as_view(), name="send_otp"),
    path("verify-otp/", views.VerifyOTPView.as_view(), name="verify_otp"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="reset_password"),
    # ==========================================================================
    # TWO-FACTOR AUTHENTICATION
    # ==========================================================================
    path("2fa/setup/", views.TwoFactorSetupView.as_view(), name="2fa_setup"),
    path("2fa/enable/", views.TwoFactorEnableView.as_view(), name="2fa_enable"),
    path("2fa/disable/", views.TwoFactorDisableView.as_view(), name="2fa_disable"),
    path("2fa/backup-codes/", views.TwoFactorBackupCodesView.as_view(), name="2fa_backup_codes"),
    # ==========================================================================
    # SESSION MANAGEMENT
    # ==========================================================================
    path("sessions/", views.SessionListView.as_view(), name="session_list"),
    path("sessions/terminate/", views.SessionTerminateView.as_view(), name="session_terminate"),
    # ==========================================================================
    # EMAIL CHANGE
    # ==========================================================================
    path("email-change/request/", views.EmailChangeRequestView.as_view(), name="email_change_request"),
    path("email-change/confirm/", views.EmailChangeConfirmView.as_view(), name="email_change_confirm"),
    # ==========================================================================
    # USER MANAGEMENT (Admin/Manager only)
    # ==========================================================================
    path("", views.UserListView.as_view(), name="user_list"),
    path("<uuid:uuid>/", views.UserDetailView.as_view(), name="user_detail"),
    path("<uuid:uuid>/unlock/", views.UnlockUserView.as_view(), name="unlock_user"),
    path("<uuid:uuid>/force-password-change/", views.ForcePasswordChangeView.as_view(), name="force_password_change"),
    # ==========================================================================
    # SECURITY AUDIT (Admin only)
    # ==========================================================================
    path("login-attempts/", views.LoginAttemptListView.as_view(), name="login_attempts"),
    path("activity/", views.UserActivityListView.as_view(), name="user_activity"),
]

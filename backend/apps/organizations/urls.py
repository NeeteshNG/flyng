"""
Organization API URLs
"""

from django.urls import path

from apps.organizations.views import (
    APIKeyListCreateView,
    APIKeyRevokeView,
    AnalyticsView,
    BillingOverviewView,
    DashboardStatsView,
    FleetAnalyticsView,
    InventoryAnalyticsView,
    InvitationListCreateView,
    InvitationResendView,
    InvitationRevokeView,
    MembershipActivateView,
    MembershipDeactivateView,
    MembershipDetailView,
    MembershipListView,
    MembershipStatsView,
    OrderAnalyticsView,
    OrganizationSettingsRegenerateWebhookView,
    OrganizationSettingsView,
    PlanListView,
    ReferenceDataView,
    TransferOwnershipView,
)

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="plan-list"),
    path("billing/", BillingOverviewView.as_view(), name="billing-overview"),
    path("settings/", OrganizationSettingsView.as_view(), name="org-settings"),
    path("settings/regenerate-webhook-secret/", OrganizationSettingsRegenerateWebhookView.as_view(), name="org-settings-regen-webhook"),
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("dashboard/analytics/", AnalyticsView.as_view(), name="dashboard-analytics"),
    path("dashboard/analytics/orders/", OrderAnalyticsView.as_view(), name="analytics-orders"),
    path("dashboard/analytics/fleet/", FleetAnalyticsView.as_view(), name="analytics-fleet"),
    path("dashboard/analytics/inventory/", InventoryAnalyticsView.as_view(), name="analytics-inventory"),
    path("api-keys/", APIKeyListCreateView.as_view(), name="api-key-list-create"),
    path("api-keys/<int:pk>/revoke/", APIKeyRevokeView.as_view(), name="api-key-revoke"),
    path("reference-data/", ReferenceDataView.as_view(), name="reference-data"),
    # Members
    path("members/", MembershipListView.as_view(), name="member-list"),
    path("members/stats/", MembershipStatsView.as_view(), name="member-stats"),
    path("members/transfer-ownership/", TransferOwnershipView.as_view(), name="transfer-ownership"),
    path("members/<int:pk>/", MembershipDetailView.as_view(), name="member-detail"),
    path("members/<int:pk>/deactivate/", MembershipDeactivateView.as_view(), name="member-deactivate"),
    path("members/<int:pk>/activate/", MembershipActivateView.as_view(), name="member-activate"),
    # Invitations
    path("invitations/", InvitationListCreateView.as_view(), name="invitation-list-create"),
    path("invitations/<int:pk>/resend/", InvitationResendView.as_view(), name="invitation-resend"),
    path("invitations/<int:pk>/revoke/", InvitationRevokeView.as_view(), name="invitation-revoke"),
]

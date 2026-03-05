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
    OrganizationSettingsRegenerateWebhookView,
    OrganizationSettingsView,
    PlanListView,
    ReferenceDataView,
)

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="plan-list"),
    path("billing/", BillingOverviewView.as_view(), name="billing-overview"),
    path("settings/", OrganizationSettingsView.as_view(), name="org-settings"),
    path("settings/regenerate-webhook-secret/", OrganizationSettingsRegenerateWebhookView.as_view(), name="org-settings-regen-webhook"),
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("dashboard/analytics/", AnalyticsView.as_view(), name="dashboard-analytics"),
    path("api-keys/", APIKeyListCreateView.as_view(), name="api-key-list-create"),
    path("api-keys/<int:pk>/revoke/", APIKeyRevokeView.as_view(), name="api-key-revoke"),
    path("reference-data/", ReferenceDataView.as_view(), name="reference-data"),
]

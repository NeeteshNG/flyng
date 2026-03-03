"""
Organization API URLs
"""

from django.urls import path

from apps.organizations.views import (
    APIKeyListCreateView,
    APIKeyRevokeView,
    BillingOverviewView,
    DashboardStatsView,
    PlanListView,
)

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="plan-list"),
    path("billing/", BillingOverviewView.as_view(), name="billing-overview"),
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("api-keys/", APIKeyListCreateView.as_view(), name="api-key-list-create"),
    path("api-keys/<int:pk>/revoke/", APIKeyRevokeView.as_view(), name="api-key-revoke"),
]

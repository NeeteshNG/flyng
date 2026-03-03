"""
Organization API URLs
"""

from django.urls import path

from apps.organizations.views import BillingOverviewView, PlanListView

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="plan-list"),
    path("billing/", BillingOverviewView.as_view(), name="billing-overview"),
]

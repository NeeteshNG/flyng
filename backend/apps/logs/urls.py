"""
Logs URL Configuration
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DroneFlightLogViewSet,
    FlightGraphTemplateViewSet,
    FlightLogGraphViewSet,
)

router = DefaultRouter()
router.register(r"flight-logs", DroneFlightLogViewSet, basename="flight-log")
router.register(
    r"graph-templates",
    FlightGraphTemplateViewSet,
    basename="graph-template",
)
router.register(
    r"flight-log-graphs",
    FlightLogGraphViewSet,
    basename="flight-log-graph",
)

urlpatterns = [
    path("", include(router.urls)),
]

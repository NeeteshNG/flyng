"""
Drone URL Configuration
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DroneMaintenanceRecordViewSet,
    DroneTelemetryLogViewSet,
    DroneViewSet,
    FleetPositionsView,
    FleetStatsView,
)

router = DefaultRouter()
router.register(r"drones", DroneViewSet, basename="drone")
router.register(r"drone-telemetry", DroneTelemetryLogViewSet, basename="drone-telemetry")
router.register(
    r"drone-maintenance", DroneMaintenanceRecordViewSet, basename="drone-maintenance"
)

urlpatterns = [
    path("fleet/positions/", FleetPositionsView.as_view(), name="fleet-positions"),
    path("fleet/stats/", FleetStatsView.as_view(), name="fleet-stats"),
    path("", include(router.urls)),
]

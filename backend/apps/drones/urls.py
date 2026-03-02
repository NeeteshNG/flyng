"""
Drone URL Configuration
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DroneMaintenanceRecordViewSet,
    DroneTelemetryLogViewSet,
    DroneViewSet,
)

router = DefaultRouter()
router.register(r"drones", DroneViewSet, basename="drone")
router.register(r"drone-telemetry", DroneTelemetryLogViewSet, basename="drone-telemetry")
router.register(
    r"drone-maintenance", DroneMaintenanceRecordViewSet, basename="drone-maintenance"
)

urlpatterns = [
    path("", include(router.urls)),
]

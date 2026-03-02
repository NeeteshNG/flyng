"""
Battery URL Configuration
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BatteryChargingSessionViewSet,
    BatterySwapRecordViewSet,
    DroneBatteryViewSet,
)

router = DefaultRouter()
router.register(r"batteries", DroneBatteryViewSet, basename="battery")
router.register(
    r"battery-charging-sessions",
    BatteryChargingSessionViewSet,
    basename="battery-charging-session",
)
router.register(
    r"battery-swap-records",
    BatterySwapRecordViewSet,
    basename="battery-swap-record",
)

urlpatterns = [
    path("", include(router.urls)),
]

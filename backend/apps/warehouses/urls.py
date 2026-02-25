"""
Warehouse API URLs
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.warehouses.views import (
    DroneWorkAreaViewSet,
    GroundControlStationViewSet,
    WarehouseContactViewSet,
    WarehouseViewSet,
    WarehouseZoneViewSet,
)

router = DefaultRouter()
router.register(r"warehouses", WarehouseViewSet, basename="warehouse")
router.register(r"warehouse-contacts", WarehouseContactViewSet, basename="warehouse-contact")
router.register(r"zones", WarehouseZoneViewSet, basename="zone")
router.register(r"ground-control-stations", GroundControlStationViewSet, basename="gcs")
router.register(r"work-areas", DroneWorkAreaViewSet, basename="work-area")

urlpatterns = [
    path("", include(router.urls)),
]

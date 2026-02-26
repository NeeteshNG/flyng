"""
Inventory URL Configuration
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BinLabelTypeViewSet,
    StorageLocationViewSet,
    StorageBinViewSet,
    StorageBinTemplateViewSet,
)

router = DefaultRouter()
router.register(r"storage-locations", StorageLocationViewSet, basename="storage-location")
router.register(r"storage-bins", StorageBinViewSet, basename="storage-bin")
router.register(r"bin-templates", StorageBinTemplateViewSet, basename="bin-template")
router.register(r"label-types", BinLabelTypeViewSet, basename="label-type")

urlpatterns = [
    path("", include(router.urls)),
]

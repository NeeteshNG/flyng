"""
Orders URL Configuration
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    PickOrderBatchViewSet,
    PickOrderLineViewSet,
    PickOrderViewSet,
)

router = DefaultRouter()
router.register(r"orders", PickOrderViewSet, basename="pick-order")
router.register(r"order-lines", PickOrderLineViewSet, basename="pick-order-line")
router.register(r"order-batches", PickOrderBatchViewSet, basename="pick-order-batch")

urlpatterns = [
    path("", include(router.urls)),
]

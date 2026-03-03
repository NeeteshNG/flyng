"""
Jobs URL Configuration
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DroneJobEventViewSet,
    DroneJobViewSet,
)

router = DefaultRouter()
router.register(r"jobs", DroneJobViewSet, basename="job")
router.register(r"job-events", DroneJobEventViewSet, basename="job-event")

urlpatterns = [
    path("", include(router.urls)),
]

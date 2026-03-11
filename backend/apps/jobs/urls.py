"""
Jobs URL Configuration
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DroneJobEventViewSet,
    DroneJobViewSet,
    JobQueueStatsView,
)

router = DefaultRouter()
router.register(r"jobs", DroneJobViewSet, basename="job")
router.register(r"job-events", DroneJobEventViewSet, basename="job-event")

urlpatterns = [
    path("jobs/queue-stats/", JobQueueStatsView.as_view(), name="job-queue-stats"),
    path("", include(router.urls)),
]

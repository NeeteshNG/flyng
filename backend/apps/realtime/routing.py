"""
WebSocket URL routing for real-time consumers.
"""

from django.urls import path

from .consumers import JobConsumer, NotificationConsumer, TelemetryConsumer

websocket_urlpatterns = [
    path("ws/telemetry/", TelemetryConsumer.as_asgi()),
    path("ws/jobs/", JobConsumer.as_asgi()),
    path("ws/notifications/", NotificationConsumer.as_asgi()),
]

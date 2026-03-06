"""
Notification Views
"""

from django.utils import timezone
from django_filters import rest_framework as django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationListSerializer, UnreadCountSerializer


class NotificationFilter(django_filters.FilterSet):
    """Filter for notifications."""

    is_read = django_filters.BooleanFilter(field_name="is_read")
    notification_type = django_filters.CharFilter(field_name="notification_type")
    priority = django_filters.CharFilter(field_name="priority")

    class Meta:
        model = Notification
        fields = ["is_read", "notification_type", "priority"]


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user notifications.

    list: Get all notifications for the current user
    retrieve: Get a single notification
    destroy: Dismiss (soft-delete) a notification
    mark_read: Mark a single notification as read
    mark_all_read: Mark all unread notifications as read
    unread_count: Get unread notification count (for polling)
    """

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationListSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = NotificationFilter
    ordering_fields = ["created_at", "priority"]
    ordering = ["-created_at"]
    lookup_field = "uuid"
    http_method_names = ["get", "delete", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        org = getattr(user, "active_organization", None)
        qs = Notification.objects.filter(user=user)
        if org:
            qs = qs.filter(organization=org)
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Notifications are created automatically."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Method not allowed."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def partial_update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Method not allowed."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, uuid=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        notification.mark_as_read()
        return Response(
            {"success": True, "message": "Notification marked as read"},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """Mark all unread notifications as read."""
        qs = self.get_queryset().filter(is_read=False)
        count = qs.update(is_read=True, read_at=timezone.now())
        return Response(
            {"success": True, "message": f"{count} notifications marked as read", "count": count},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """Get unread notification count (for polling)."""
        count = self.get_queryset().filter(is_read=False).count()
        serializer = UnreadCountSerializer({"unread_count": count})
        return Response(serializer.data)

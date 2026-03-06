"""
Notification Serializers
"""

from rest_framework import serializers

from .models import Notification


class NotificationListSerializer(serializers.ModelSerializer):
    """Serializer for listing notifications."""

    notification_type_display = serializers.CharField(
        source="get_notification_type_display", read_only=True
    )
    priority_display = serializers.CharField(
        source="get_priority_display", read_only=True
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "uuid",
            "notification_type",
            "notification_type_display",
            "priority",
            "priority_display",
            "title",
            "message",
            "is_read",
            "read_at",
            "link",
            "source_type",
            "source_id",
            "created_at",
        ]
        read_only_fields = fields


class UnreadCountSerializer(serializers.Serializer):
    """Serializer for unread count response."""

    unread_count = serializers.IntegerField()

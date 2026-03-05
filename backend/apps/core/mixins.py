"""
Core mixins for FlyNG ViewSets.
"""

import logging

from apps.core.choices import ActivityAction

logger = logging.getLogger(__name__)


class ActivityLoggingMixin:
    """
    Mixin for ModelViewSet that automatically logs CREATE, UPDATE, and DELETE
    operations to UserActivity.

    Usage:
        class MyViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
            ...

    For ViewSets that override perform_create/perform_update without calling
    super(), add explicit self.log_activity() calls in those methods.

    For ViewSets that override destroy() directly (soft-delete pattern),
    add self.log_activity() in the destroy() method.
    """

    def _get_resource_type(self, instance):
        """Get human-readable resource type from model class name."""
        # Convert CamelCase to spaced: "DroneWorkArea" -> "DroneWorkArea"
        return instance.__class__.__name__

    def _get_resource_id(self, instance):
        """Get resource ID, preferring uuid if available."""
        if hasattr(instance, "uuid"):
            return str(instance.uuid)
        return str(instance.pk)

    def _get_resource_name(self, instance):
        """Get resource display name."""
        try:
            return str(instance)[:200]
        except Exception:
            return ""

    def log_activity(self, action, instance, description="", request=None):
        """
        Log a user activity. Safe to call — never raises exceptions.

        Args:
            action: ActivityAction value (e.g., ActivityAction.CREATE)
            instance: The model instance being acted upon
            description: Optional human-readable description
            request: The HTTP request (defaults to self.request)
        """
        try:
            from apps.users.models import UserActivity

            request = request or self.request
            user = request.user

            if not user or not user.is_authenticated:
                return

            UserActivity.log(
                user=user,
                action=action,
                resource_type=self._get_resource_type(instance),
                resource_id=self._get_resource_id(instance),
                resource_name=self._get_resource_name(instance),
                description=description,
                request=request,
            )
        except Exception:
            logger.exception("Failed to log user activity")

    def perform_create(self, serializer):
        """Log CREATE after saving."""
        super().perform_create(serializer)
        self.log_activity(
            ActivityAction.CREATE,
            serializer.instance,
            description=f"Created {self._get_resource_type(serializer.instance)}",
        )

    def perform_update(self, serializer):
        """Log UPDATE after saving."""
        super().perform_update(serializer)
        self.log_activity(
            ActivityAction.UPDATE,
            serializer.instance,
            description=f"Updated {self._get_resource_type(serializer.instance)}",
        )

    def perform_destroy(self, instance):
        """Log DELETE before destroying (fallback for ViewSets using default destroy)."""
        self.log_activity(
            ActivityAction.DELETE,
            instance,
            description=f"Deleted {self._get_resource_type(instance)}",
        )
        super().perform_destroy(instance)

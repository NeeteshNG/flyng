"""
Notification Models
"""

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.choices import NotificationPriority, NotificationType
from apps.core.models import BaseModel

from .managers import NotificationManager


class Notification(BaseModel):
    """
    In-app notification for users.

    Organization-scoped and user-targeted. Uses soft delete
    from BaseModel for dismissal (user "deletes" = soft delete).
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name=_("Organization"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name=_("User"),
        help_text=_("The user this notification is for"),
    )

    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        db_index=True,
        verbose_name=_("Notification Type"),
    )
    priority = models.CharField(
        max_length=10,
        choices=NotificationPriority.choices,
        default=NotificationPriority.NORMAL,
        verbose_name=_("Priority"),
    )
    title = models.CharField(
        max_length=255,
        verbose_name=_("Title"),
    )
    message = models.TextField(
        verbose_name=_("Message"),
    )

    is_read = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name=_("Is Read"),
    )
    read_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Read At"),
    )

    link = models.CharField(
        max_length=500,
        blank=True,
        default="",
        verbose_name=_("Link"),
        help_text=_("Frontend route to navigate to (e.g., /dashboard/orders)"),
    )

    source_type = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name=_("Source Type"),
        help_text=_("Model name that triggered this notification"),
    )
    source_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("Source ID"),
        help_text=_("UUID of the source object"),
    )

    objects = NotificationManager()

    class Meta:
        verbose_name = _("Notification")
        verbose_name_plural = _("Notifications")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "user", "-created_at"]),
            models.Index(fields=["user", "is_read", "-created_at"]),
            models.Index(fields=["notification_type"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_notification_type_display()})"

    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at", "updated_at"])

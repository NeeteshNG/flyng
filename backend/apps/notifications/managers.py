"""
Notification Managers
"""

from safedelete.managers import SafeDeleteManager
from safedelete.queryset import SafeDeleteQueryset


class NotificationQuerySet(SafeDeleteQueryset):
    """QuerySet for notifications."""

    def for_user(self, user):
        return self.filter(user=user)

    def for_organization(self, organization):
        return self.filter(organization=organization)

    def unread(self):
        return self.filter(is_read=False)

    def read(self):
        return self.filter(is_read=True)


class NotificationManager(SafeDeleteManager):
    """Manager for Notification model."""

    def get_queryset(self):
        return NotificationQuerySet(self.model, using=self._db)

    def for_user(self, user):
        return self.get_queryset().for_user(user)

    def for_organization(self, organization):
        return self.get_queryset().for_organization(organization)

    def unread(self):
        return self.get_queryset().unread()

    def create_notification(
        self, organization, user, notification_type, title, message,
        priority="NORMAL", link="", source_type="", source_id="",
    ):
        """Helper to create a notification with all required fields."""
        return self.create(
            organization=organization,
            user=user,
            notification_type=notification_type,
            priority=priority,
            title=title,
            message=message,
            link=link,
            source_type=source_type,
            source_id=source_id,
        )

    def notify_org_admins(
        self, organization, notification_type, title, message,
        priority="NORMAL", link="", source_type="", source_id="",
        exclude_user=None,
    ):
        """
        Create a notification for all OWNER and ADMIN users in an organization.

        Args:
            exclude_user: Optionally exclude a specific user (e.g., the actor).
        """
        from apps.organizations.models import OrganizationMembership

        memberships = OrganizationMembership.objects.filter(
            organization=organization,
            membership_role__in=["OWNER", "ADMIN"],
        ).select_related("user")

        notifications = []
        for membership in memberships:
            if exclude_user and membership.user_id == exclude_user.id:
                continue
            notifications.append(
                self.model(
                    organization=organization,
                    user=membership.user,
                    notification_type=notification_type,
                    priority=priority,
                    title=title,
                    message=message,
                    link=link,
                    source_type=source_type,
                    source_id=source_id,
                )
            )

        if notifications:
            self.bulk_create(notifications)

        return notifications

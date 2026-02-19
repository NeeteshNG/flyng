"""
Core Managers - Custom QuerySets and Managers for FlyNG models

Provides:
- Active/inactive filtering
- Organization-scoped queries (multi-tenancy)
- Common query patterns
"""

from django.db import models

from safedelete.managers import SafeDeleteManager
from safedelete.queryset import SafeDeleteQueryset


class ActiveQuerySet(SafeDeleteQueryset):
    """
    QuerySet with common filtering methods.
    Extends SafeDeleteQueryset to work with soft-deleted models.
    """

    def active(self):
        """Filter to only active (non-soft-deleted) records."""
        return self.filter(deleted__isnull=True)

    def inactive(self):
        """Filter to only soft-deleted records."""
        return self.filter(deleted__isnull=False)

    def by_uuid(self, uuid_value):
        """Get record by UUID."""
        return self.filter(uuid=uuid_value)


class ActiveManager(SafeDeleteManager):
    """
    Default manager for models with soft delete.
    Automatically filters out deleted records.
    """

    def get_queryset(self):
        return ActiveQuerySet(self.model, using=self._db)

    def active(self):
        return self.get_queryset().active()

    def inactive(self):
        return self.get_queryset().inactive()

    def by_uuid(self, uuid_value):
        return self.get_queryset().by_uuid(uuid_value)


class OrganizationQuerySet(ActiveQuerySet):
    """
    QuerySet for organization-scoped models (multi-tenancy).
    """

    def for_organization(self, organization):
        """Filter records belonging to a specific organization."""
        return self.filter(organization=organization)

    def for_organization_id(self, organization_id):
        """Filter records belonging to a specific organization by ID."""
        return self.filter(organization_id=organization_id)


class OrganizationManager(ActiveManager):
    """
    Manager for organization-scoped models.
    Provides organization filtering methods.
    """

    def get_queryset(self):
        return OrganizationQuerySet(self.model, using=self._db)

    def for_organization(self, organization):
        return self.get_queryset().for_organization(organization)

    def for_organization_id(self, organization_id):
        return self.get_queryset().for_organization_id(organization_id)


class UserOwnedQuerySet(ActiveQuerySet):
    """
    QuerySet for user-owned models.
    """

    def for_user(self, user):
        """Filter records owned by a specific user."""
        return self.filter(created_by=user)

    def for_user_id(self, user_id):
        """Filter records owned by a specific user by ID."""
        return self.filter(created_by_id=user_id)


class UserOwnedManager(ActiveManager):
    """
    Manager for user-owned models.
    """

    def get_queryset(self):
        return UserOwnedQuerySet(self.model, using=self._db)

    def for_user(self, user):
        return self.get_queryset().for_user(user)

    def for_user_id(self, user_id):
        return self.get_queryset().for_user_id(user_id)


class BulkCreateUpdateManager(models.Manager):
    """
    Manager with optimized bulk operations.
    Useful for high-volume data like telemetry.
    """

    def bulk_create_with_history(self, objs, batch_size=1000, **kwargs):
        """
        Bulk create with optional history tracking.
        For models with django-simple-history.
        """
        from simple_history.utils import bulk_create_with_history as _bulk_create

        return _bulk_create(objs, self.model, batch_size=batch_size, **kwargs)

    def bulk_update_with_history(self, objs, fields, batch_size=1000, **kwargs):
        """
        Bulk update with optional history tracking.
        For models with django-simple-history.
        """
        from simple_history.utils import bulk_update_with_history as _bulk_update

        return _bulk_update(objs, self.model, fields, batch_size=batch_size, **kwargs)

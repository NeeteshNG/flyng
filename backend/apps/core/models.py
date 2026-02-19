"""
Core Models - Production-ready base classes for all FlyNG models

Uses:
- django-safedelete for soft delete with cascade policies
- django-simple-history for audit trails
- UUID for external API references

Note: We use custom TimeStampedModel with 'created_at' and 'updated_at' field names
for consistency with existing code and Django conventions.
"""

import uuid

from django.db import models

from safedelete.config import SOFT_DELETE_CASCADE
from safedelete.models import SafeDeleteModel
from simple_history.models import HistoricalRecords


class TimeStampedModel(models.Model):
    """
    Abstract base model that provides self-updating
    'created_at' and 'updated_at' fields.

    Uses 'created_at' and 'updated_at' field names for consistency
    with existing code and common Django conventions.
    """

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteModel(SafeDeleteModel):
    """
    Abstract base model that provides soft delete functionality
    using django-safedelete with cascade policy.

    Features:
    - Soft delete (deleted records are hidden from default queries)
    - Cascade soft delete to related objects
    - deleted field tracks deletion timestamp
    """

    _safedelete_policy = SOFT_DELETE_CASCADE

    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """
    Abstract base model that provides a UUID field for external API references.
    Use 'uuid' for external APIs, 'id' internally.
    """

    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
    )

    class Meta:
        abstract = True


class BaseModel(TimeStampedModel, SoftDeleteModel, UUIDModel):
    """
    Production-ready base model combining:
    - Timestamps (created, modified from django-model-utils)
    - Soft delete with cascade (django-safedelete)
    - UUID for external API references

    Use this as the base for most models.
    """

    class Meta:
        abstract = True


class AuditedModel(BaseModel):
    """
    Base model with full audit trail using django-simple-history.

    Use this for models that require complete change history
    (e.g., Orders, Inventory, critical business entities).
    """

    history = HistoricalRecords(inherit=True)

    class Meta:
        abstract = True


class ReadOnlyModel(TimeStampedModel, UUIDModel):
    """
    Base model for read-only/append-only data.
    No soft delete - records are immutable once created.

    Use for: Logs, Telemetry, Audit records, Events
    """

    class Meta:
        abstract = True


class OrganizationOwnedMixin(models.Model):
    """
    Mixin for models that belong to an organization.
    Provides multi-tenancy support.
    """

    # Will be a ForeignKey to Organization model
    # Defined here as a placeholder - actual FK added in concrete models
    # organization = models.ForeignKey('organizations.Organization', ...)

    class Meta:
        abstract = True


class UserOwnedMixin(models.Model):
    """
    Mixin for models that are owned by a user.
    """

    # Will be a ForeignKey to User model
    # Defined here as a placeholder - actual FK added in concrete models
    # created_by = models.ForeignKey('users.User', ...)

    class Meta:
        abstract = True

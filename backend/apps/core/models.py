"""
Core Models - Production-ready base classes for all FlyNG models

Uses:
- django-safedelete for soft delete with cascade policies
- django-simple-history for audit trails
- UUID for external API references
- Optimistic locking for high-concurrency scenarios

Note: We use custom TimeStampedModel with 'created_at' and 'updated_at' field names
for consistency with existing code and Django conventions.
"""

import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from safedelete.config import SOFT_DELETE_CASCADE
from safedelete.models import SafeDeleteModel
from simple_history.models import HistoricalRecords

from .utils import import_error_file_upload_path, import_file_upload_path


class ConcurrentModificationError(Exception):
    """
    Raised when optimistic locking detects a concurrent modification.

    This indicates another process modified the record between when
    it was read and when save() was called.
    """

    def __init__(self, message="Record was modified by another process"):
        self.message = message
        super().__init__(self.message)


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


class OptimisticLockingMixin(models.Model):
    """
    Mixin that provides optimistic locking via a version field.

    Prevents lost updates in high-concurrency scenarios by detecting
    when another process has modified a record.

    Usage:
        class MyModel(OptimisticLockingMixin, BaseModel):
            ...

        # When saving, if version mismatch detected:
        try:
            instance.save()
        except ConcurrentModificationError:
            # Handle conflict (refresh and retry, or notify user)
            instance.refresh_from_db()

    Trade-offs:
        Pros:
        - No database locks held (better scalability)
        - Works across multiple database backends
        - Detects conflicts at application level

        Cons:
        - Requires retry logic in application code
        - Can cause more work under high contention
        - Version field adds slight storage overhead
    """

    version = models.PositiveIntegerField(
        default=1,
        verbose_name=_("Version"),
        help_text=_("Optimistic locking version number"),
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        """
        Override save to implement optimistic locking.

        On update, atomically increments version and checks that
        the current version matches what we read.
        """
        if self.pk:
            # This is an update - check version
            cls = self.__class__
            current_version = self.version

            # Atomically update only if version matches
            updated = cls.objects.filter(
                pk=self.pk,
                version=current_version,
            ).update(version=current_version + 1)

            if updated == 0:
                # Version mismatch - record was modified by another process
                raise ConcurrentModificationError(
                    f"{cls.__name__} with pk={self.pk} was modified by another process. "
                    f"Expected version {current_version}."
                )

            # Update our version to reflect the increment
            self.version = current_version + 1

        super().save(*args, **kwargs)

    def save_without_version_check(self, *args, **kwargs):
        """
        Save without optimistic locking check.

        Use sparingly for administrative updates where conflicts
        are acceptable (e.g., bulk updates, migrations).
        """
        super().save(*args, **kwargs)


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


class ImportJob(BaseModel):
    """
    Track bulk import jobs for items, locations, inventory, orders, etc.

    Provides:
    - File upload tracking
    - Progress monitoring
    - Error reporting with downloadable error file
    - Background processing via Celery
    """

    from .choices import ImportStatus, ImportType

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="import_jobs",
        verbose_name=_("Organization"),
    )
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.CASCADE,
        related_name="import_jobs",
        blank=True,
        null=True,
        verbose_name=_("Warehouse"),
        help_text=_("Required for location and inventory imports"),
    )

    # Import configuration
    import_type = models.CharField(
        max_length=20,
        choices=ImportType.choices,
        verbose_name=_("Import Type"),
    )
    status = models.CharField(
        max_length=25,
        choices=ImportStatus.choices,
        default=ImportStatus.PENDING,
        db_index=True,
        verbose_name=_("Status"),
    )

    # File
    file = models.FileField(
        upload_to=import_file_upload_path,
        verbose_name=_("Import File"),
        help_text=_("CSV or Excel file to import"),
    )
    original_filename = models.CharField(
        max_length=255,
        verbose_name=_("Original Filename"),
    )

    # Progress tracking
    total_rows = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Total Rows"),
    )
    processed_rows = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Processed Rows"),
    )
    success_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Success Count"),
    )
    error_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Error Count"),
    )
    skipped_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Skipped Count"),
        help_text=_("Rows skipped (duplicates, unchanged)"),
    )

    # Error reporting
    error_file = models.FileField(
        upload_to=import_error_file_upload_path,
        blank=True,
        null=True,
        verbose_name=_("Error Report"),
        help_text=_("CSV file with failed rows and error details"),
    )
    error_summary = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_("Error Summary"),
        help_text=_("Summary of errors [{row, field, error}]"),
    )
    error_message = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Error Message"),
        help_text=_("General error message if import failed"),
    )

    # Timestamps
    started_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Started At"),
    )
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Completed At"),
    )

    # User tracking
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="import_jobs",
        blank=True,
        null=True,
        db_index=True,
        verbose_name=_("Created By"),
    )

    # Notes
    notes = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Notes"),
    )

    class Meta:
        verbose_name = _("Import Job")
        verbose_name_plural = _("Import Jobs")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["import_type", "status"]),
        ]
        constraints = [
            # Processed rows cannot exceed total rows
            models.CheckConstraint(
                condition=(
                    models.Q(total_rows=0) | models.Q(processed_rows__lte=models.F("total_rows"))
                ),
                name="processed_not_exceed_total_rows",
            ),
            # Success + error + skipped cannot exceed processed
            models.CheckConstraint(
                condition=models.Q(
                    success_count__lte=models.F("processed_rows"),
                    error_count__lte=models.F("processed_rows"),
                    skipped_count__lte=models.F("processed_rows"),
                ),
                name="counts_not_exceed_processed",
            ),
        ]

    def __str__(self):
        return f"{self.get_import_type_display()} - {self.original_filename} ({self.get_status_display()})"

    @property
    def progress_percent(self):
        """Get import progress percentage."""
        if self.total_rows == 0:
            return 0
        return round((self.processed_rows / self.total_rows) * 100, 1)

    @property
    def is_complete(self):
        """Check if import is complete."""
        from .choices import ImportStatus

        return self.status in [
            ImportStatus.COMPLETED,
            ImportStatus.COMPLETED_WITH_ERRORS,
            ImportStatus.FAILED,
            ImportStatus.CANCELLED,
        ]

    @property
    def has_errors(self):
        """Check if import has errors."""
        return self.error_count > 0

    @property
    def duration_seconds(self):
        """Get import duration in seconds."""
        if not self.started_at:
            return None
        from django.utils import timezone

        end_time = self.completed_at or timezone.now()
        return (end_time - self.started_at).total_seconds()

    def start(self):
        """Mark import as started."""
        from django.utils import timezone

        from .choices import ImportStatus

        self.status = ImportStatus.PROCESSING
        self.started_at = timezone.now()
        self.save(update_fields=["status", "started_at", "updated_at"])

    def complete(self):
        """Mark import as completed."""
        from django.utils import timezone

        from .choices import ImportStatus

        if self.error_count > 0:
            self.status = ImportStatus.COMPLETED_WITH_ERRORS
        else:
            self.status = ImportStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at", "updated_at"])

    def fail(self, error_message=""):
        """Mark import as failed."""
        from django.utils import timezone

        from .choices import ImportStatus

        self.status = ImportStatus.FAILED
        self.error_message = error_message
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "error_message", "completed_at", "updated_at"])

    def cancel(self):
        """Cancel the import."""
        from django.utils import timezone

        from .choices import ImportStatus

        self.status = ImportStatus.CANCELLED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at", "updated_at"])

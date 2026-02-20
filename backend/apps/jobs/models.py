"""
Jobs Models

Models for managing drone jobs and job events.
"""

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.choices import JobEventType, JobStatus, JobType, OrderPriority
from apps.core.models import BaseModel, ReadOnlyModel

from .managers import DroneJobEventManager, DroneJobManager


class DroneJob(BaseModel):
    """
    Drone job representing a task to be executed by a drone.

    Jobs are typically derived from order lines and represent
    individual pick/scan/move operations.
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="jobs",
        verbose_name=_("Organization"),
    )
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.CASCADE,
        related_name="jobs",
        verbose_name=_("Warehouse"),
    )
    drone = models.ForeignKey(
        "drones.Drone",
        on_delete=models.SET_NULL,
        related_name="jobs",
        blank=True,
        null=True,
        verbose_name=_("Assigned Drone"),
    )

    # Link to order/order line
    order = models.ForeignKey(
        "orders.PickOrder",
        on_delete=models.SET_NULL,
        related_name="jobs",
        blank=True,
        null=True,
        db_index=True,
        verbose_name=_("Order"),
    )
    order_line = models.ForeignKey(
        "orders.PickOrderLine",
        on_delete=models.SET_NULL,
        related_name="jobs",
        blank=True,
        null=True,
        db_index=True,
        verbose_name=_("Order Line"),
    )

    # Job identifiers
    job_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name=_("Job Number"),
    )

    # Job type and status
    job_type = models.CharField(
        max_length=20,
        choices=JobType.choices,
        default=JobType.PICK,
        verbose_name=_("Job Type"),
    )
    status = models.CharField(
        max_length=20,
        choices=JobStatus.choices,
        default=JobStatus.NEW,
        db_index=True,
        verbose_name=_("Status"),
    )
    priority = models.CharField(
        max_length=20,
        choices=OrderPriority.choices,
        default=OrderPriority.NORMAL,
        db_index=True,
        verbose_name=_("Priority"),
    )

    # Source and destination locations
    source_bin = models.ForeignKey(
        "inventory.StorageBin",
        on_delete=models.PROTECT,
        related_name="source_jobs",
        blank=True,
        null=True,
        verbose_name=_("Source Bin"),
        help_text=_("Bin to pick from"),
    )
    destination_bin = models.ForeignKey(
        "inventory.StorageBin",
        on_delete=models.PROTECT,
        related_name="destination_jobs",
        blank=True,
        null=True,
        verbose_name=_("Destination Bin"),
        help_text=_("Bin to deliver to (for move jobs)"),
    )

    # Item details (for pick/scan jobs)
    item = models.ForeignKey(
        "inventory.InventoryItem",
        on_delete=models.PROTECT,
        related_name="jobs",
        blank=True,
        null=True,
        verbose_name=_("Item"),
    )
    quantity = models.PositiveIntegerField(
        default=1,
        verbose_name=_("Quantity"),
    )
    picked_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Picked Quantity"),
    )

    # Timestamps
    queued_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Queued At"),
    )
    assigned_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Assigned At"),
    )
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
    failed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Failed At"),
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Cancelled At"),
    )

    # Error tracking
    error_code = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name=_("Error Code"),
    )
    error_message = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Error Message"),
    )

    # Retry tracking
    retry_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Retry Count"),
    )
    max_retries = models.PositiveIntegerField(
        default=3,
        verbose_name=_("Max Retries"),
    )

    # Notes
    notes = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Notes"),
    )
    internal_notes = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Internal Notes"),
    )

    objects = DroneJobManager()

    class Meta:
        verbose_name = _("Drone Job")
        verbose_name_plural = _("Drone Jobs")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["warehouse", "status"]),
            models.Index(fields=["drone", "status"]),
            models.Index(fields=["priority", "status"]),
            models.Index(fields=["order"]),
            # Time-series optimizations for date range queries
            models.Index(fields=["created_at"]),
            models.Index(fields=["-created_at"]),  # Descending for recent queries
            models.Index(fields=["completed_at"]),
            models.Index(fields=["-completed_at"]),  # Descending for recent completions
            # Composite for job analytics over time
            models.Index(fields=["organization", "status", "-created_at"]),
            models.Index(fields=["warehouse", "status", "-created_at"]),
            models.Index(fields=["drone", "-completed_at"]),  # Drone performance history
            # Partial indexes for non-deleted records (most queries filter on active jobs)
            models.Index(
                fields=["organization", "status"],
                name="job_org_status_active",
                condition=models.Q(deleted__isnull=True),
            ),
            models.Index(
                fields=["warehouse", "status", "priority"],
                name="job_wh_status_priority_active",
                condition=models.Q(deleted__isnull=True),
            ),
            models.Index(
                fields=["drone", "status"],
                name="job_drone_status_active",
                condition=models.Q(deleted__isnull=True),
            ),
        ]
        constraints = [
            # Picked quantity cannot exceed requested quantity
            models.CheckConstraint(
                condition=models.Q(picked_quantity__lte=models.F("quantity")),
                name="job_picked_not_exceed_quantity",
            ),
        ]

    def __str__(self):
        return f"{self.job_number} ({self.get_status_display()})"

    def clean(self):
        """
        Validate cross-model organization boundaries.

        Ensures all related objects belong to the same organization
        to prevent data leakage between tenants.
        """
        super().clean()
        errors = {}

        # Validate warehouse belongs to organization
        if self.warehouse_id and self.organization_id:
            if self.warehouse.organization_id != self.organization_id:
                errors["warehouse"] = _(
                    "Warehouse must belong to the same organization as the job."
                )

        # Validate order belongs to organization
        if self.order_id and self.organization_id:
            if self.order.organization_id != self.organization_id:
                errors["order"] = _(
                    "Order must belong to the same organization as the job."
                )

        # Validate source bin belongs to same warehouse
        if self.source_bin_id and self.warehouse_id:
            source_warehouse = self.source_bin.location.zone.warehouse_id
            if source_warehouse != self.warehouse_id:
                errors["source_bin"] = _(
                    "Source bin must be in the same warehouse as the job."
                )

        # Validate destination bin belongs to same warehouse
        if self.destination_bin_id and self.warehouse_id:
            dest_warehouse = self.destination_bin.location.zone.warehouse_id
            if dest_warehouse != self.warehouse_id:
                errors["destination_bin"] = _(
                    "Destination bin must be in the same warehouse as the job."
                )

        # Validate item belongs to same organization
        if self.item_id and self.organization_id:
            if self.item.organization_id != self.organization_id:
                errors["item"] = _(
                    "Item must belong to the same organization as the job."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Run full validation on save
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_active(self):
        """Check if job is in an active state."""
        return self.status in [
            JobStatus.NEW,
            JobStatus.QUEUED,
            JobStatus.ASSIGNED,
            JobStatus.IN_PROGRESS,
            JobStatus.PAUSED,
        ]

    @property
    def is_complete(self):
        """Check if job is complete."""
        return self.status == JobStatus.COMPLETED

    @property
    def is_failed(self):
        """Check if job has failed."""
        return self.status == JobStatus.FAILED

    @property
    def is_cancelled(self):
        """Check if job is cancelled."""
        return self.status == JobStatus.CANCELLED

    @property
    def can_retry(self):
        """Check if job can be retried."""
        return self.is_failed and self.retry_count < self.max_retries

    @property
    def duration_seconds(self):
        """Get job duration in seconds."""
        if not self.started_at:
            return None
        end_time = self.completed_at or self.failed_at or timezone.now()
        return (end_time - self.started_at).total_seconds()

    def _get_locked_instance(self):
        """
        Get a row-locked instance of this job for safe concurrent updates.
        Must be called within a transaction.
        """
        return DroneJob.objects.select_for_update().get(pk=self.pk)

    @transaction.atomic
    def queue(self):
        """Add job to queue with row-level locking."""
        job = self._get_locked_instance()
        if job.status != JobStatus.NEW:
            return False
        job.status = JobStatus.QUEUED
        job.queued_at = timezone.now()
        job.save(update_fields=["status", "queued_at", "updated_at"])
        # Update self to reflect changes
        self.status = job.status
        self.queued_at = job.queued_at
        self._log_event(JobEventType.QUEUED, "Job added to queue")
        return True

    @transaction.atomic
    def assign(self, drone):
        """Assign job to a drone with row-level locking."""
        job = self._get_locked_instance()
        if job.status != JobStatus.QUEUED:
            return False
        job.status = JobStatus.ASSIGNED
        job.drone = drone
        job.assigned_at = timezone.now()
        job.save(update_fields=["status", "drone", "assigned_at", "updated_at"])
        # Update self to reflect changes
        self.status = job.status
        self.drone = job.drone
        self.assigned_at = job.assigned_at
        self._log_event(JobEventType.ASSIGNED, f"Job assigned to drone {drone}")
        return True

    @transaction.atomic
    def start(self):
        """Start job execution with row-level locking."""
        job = self._get_locked_instance()
        if job.status != JobStatus.ASSIGNED:
            return False
        job.status = JobStatus.IN_PROGRESS
        job.started_at = timezone.now()
        job.save(update_fields=["status", "started_at", "updated_at"])
        # Update self to reflect changes
        self.status = job.status
        self.started_at = job.started_at
        self._log_event(JobEventType.STARTED, "Job execution started")
        return True

    @transaction.atomic
    def complete(self, picked_quantity=None):
        """Mark job as complete with row-level locking."""
        job = self._get_locked_instance()
        if job.status != JobStatus.IN_PROGRESS:
            return False
        job.status = JobStatus.COMPLETED
        job.completed_at = timezone.now()
        if picked_quantity is not None:
            job.picked_quantity = picked_quantity
        else:
            job.picked_quantity = job.quantity
        job.save(
            update_fields=[
                "status",
                "completed_at",
                "picked_quantity",
                "updated_at",
            ]
        )
        # Update self to reflect changes
        self.status = job.status
        self.completed_at = job.completed_at
        self.picked_quantity = job.picked_quantity
        self._log_event(JobEventType.COMPLETED, "Job completed successfully")
        return True

    @transaction.atomic
    def fail(self, error_code="", error_message=""):
        """Mark job as failed with row-level locking."""
        job = self._get_locked_instance()
        if job.status not in [JobStatus.ASSIGNED, JobStatus.IN_PROGRESS]:
            return False
        job.status = JobStatus.FAILED
        job.failed_at = timezone.now()
        job.error_code = error_code
        job.error_message = error_message
        job.save(
            update_fields=[
                "status",
                "failed_at",
                "error_code",
                "error_message",
                "updated_at",
            ]
        )
        # Update self to reflect changes
        self.status = job.status
        self.failed_at = job.failed_at
        self.error_code = job.error_code
        self.error_message = job.error_message
        self._log_event(JobEventType.FAILED, f"Job failed: {error_message}")
        return True

    @transaction.atomic
    def cancel(self, reason=""):
        """Cancel the job with row-level locking."""
        job = self._get_locked_instance()
        if job.status in [JobStatus.COMPLETED, JobStatus.CANCELLED]:
            return False
        job.status = JobStatus.CANCELLED
        job.cancelled_at = timezone.now()
        if reason:
            job.notes = f"{job.notes}\nCancelled: {reason}".strip()
        job.save(update_fields=["status", "cancelled_at", "notes", "updated_at"])
        # Update self to reflect changes
        self.status = job.status
        self.cancelled_at = job.cancelled_at
        self.notes = job.notes
        self._log_event(JobEventType.CANCELLED, f"Job cancelled: {reason}")
        return True

    @transaction.atomic
    def pause(self):
        """Pause job execution with row-level locking."""
        job = self._get_locked_instance()
        if job.status != JobStatus.IN_PROGRESS:
            return False
        job.status = JobStatus.PAUSED
        job.save(update_fields=["status", "updated_at"])
        # Update self to reflect changes
        self.status = job.status
        self._log_event(JobEventType.PAUSED, "Job paused")
        return True

    @transaction.atomic
    def resume(self):
        """Resume paused job with row-level locking."""
        job = self._get_locked_instance()
        if job.status != JobStatus.PAUSED:
            return False
        job.status = JobStatus.IN_PROGRESS
        job.save(update_fields=["status", "updated_at"])
        # Update self to reflect changes
        self.status = job.status
        self._log_event(JobEventType.RESUMED, "Job resumed")
        return True

    @transaction.atomic
    def retry(self):
        """Retry a failed job with row-level locking."""
        job = self._get_locked_instance()
        if not (job.status == JobStatus.FAILED and job.retry_count < job.max_retries):
            return False
        job.status = JobStatus.QUEUED
        job.retry_count += 1
        job.error_code = ""
        job.error_message = ""
        job.failed_at = None
        job.queued_at = timezone.now()
        job.save(
            update_fields=[
                "status",
                "retry_count",
                "error_code",
                "error_message",
                "failed_at",
                "queued_at",
                "updated_at",
            ]
        )
        # Update self to reflect changes
        self.status = job.status
        self.retry_count = job.retry_count
        self.error_code = job.error_code
        self.error_message = job.error_message
        self.failed_at = job.failed_at
        self.queued_at = job.queued_at
        self._log_event(JobEventType.QUEUED, f"Job retrying (attempt {self.retry_count})")
        return True

    def _log_event(self, event_type, description=""):
        """Create a job event log entry."""
        DroneJobEvent.objects.create(
            job=self,
            event_type=event_type,
            description=description,
            drone=self.drone,
        )


class DroneJobEvent(ReadOnlyModel):
    """
    Event log for drone job state changes.

    Tracks all state transitions and significant events during job execution.
    """

    job = models.ForeignKey(
        DroneJob,
        on_delete=models.CASCADE,
        related_name="events",
        verbose_name=_("Job"),
    )
    drone = models.ForeignKey(
        "drones.Drone",
        on_delete=models.SET_NULL,
        related_name="job_events",
        blank=True,
        null=True,
        verbose_name=_("Drone"),
    )
    event_type = models.CharField(
        max_length=20,
        choices=JobEventType.choices,
        db_index=True,
        verbose_name=_("Event Type"),
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Description"),
    )

    # Position at event time (optional) - using DecimalField for consistency
    x_position = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        blank=True,
        null=True,
        verbose_name=_("X Position"),
    )
    y_position = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        blank=True,
        null=True,
        verbose_name=_("Y Position"),
    )
    z_position = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        blank=True,
        null=True,
        verbose_name=_("Z Position"),
    )

    # Metadata
    metadata = models.JSONField(
        blank=True,
        default=dict,
        verbose_name=_("Metadata"),
    )

    objects = DroneJobEventManager()

    class Meta:
        verbose_name = _("Drone Job Event")
        verbose_name_plural = _("Drone Job Events")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["job", "event_type"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.job.job_number} - {self.get_event_type_display()}"

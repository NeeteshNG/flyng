"""
Jobs Models

Models for managing drone jobs and job events.
"""

from django.db import models
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
        verbose_name=_("Order"),
    )
    order_line = models.ForeignKey(
        "orders.PickOrderLine",
        on_delete=models.SET_NULL,
        related_name="jobs",
        blank=True,
        null=True,
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
        ]

    def __str__(self):
        return f"{self.job_number} ({self.get_status_display()})"

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

    def queue(self):
        """Add job to queue."""
        if self.status != JobStatus.NEW:
            return False
        self.status = JobStatus.QUEUED
        self.queued_at = timezone.now()
        self.save(update_fields=["status", "queued_at", "updated_at"])
        self._log_event(JobEventType.QUEUED, "Job added to queue")
        return True

    def assign(self, drone):
        """Assign job to a drone."""
        if self.status != JobStatus.QUEUED:
            return False
        self.status = JobStatus.ASSIGNED
        self.drone = drone
        self.assigned_at = timezone.now()
        self.save(update_fields=["status", "drone", "assigned_at", "updated_at"])
        self._log_event(JobEventType.ASSIGNED, f"Job assigned to drone {drone}")
        return True

    def start(self):
        """Start job execution."""
        if self.status != JobStatus.ASSIGNED:
            return False
        self.status = JobStatus.IN_PROGRESS
        self.started_at = timezone.now()
        self.save(update_fields=["status", "started_at", "updated_at"])
        self._log_event(JobEventType.STARTED, "Job execution started")
        return True

    def complete(self, picked_quantity=None):
        """Mark job as complete."""
        if self.status != JobStatus.IN_PROGRESS:
            return False
        self.status = JobStatus.COMPLETED
        self.completed_at = timezone.now()
        if picked_quantity is not None:
            self.picked_quantity = picked_quantity
        else:
            self.picked_quantity = self.quantity
        self.save(
            update_fields=[
                "status",
                "completed_at",
                "picked_quantity",
                "updated_at",
            ]
        )
        self._log_event(JobEventType.COMPLETED, "Job completed successfully")
        return True

    def fail(self, error_code="", error_message=""):
        """Mark job as failed."""
        if self.status not in [JobStatus.ASSIGNED, JobStatus.IN_PROGRESS]:
            return False
        self.status = JobStatus.FAILED
        self.failed_at = timezone.now()
        self.error_code = error_code
        self.error_message = error_message
        self.save(
            update_fields=[
                "status",
                "failed_at",
                "error_code",
                "error_message",
                "updated_at",
            ]
        )
        self._log_event(JobEventType.FAILED, f"Job failed: {error_message}")
        return True

    def cancel(self, reason=""):
        """Cancel the job."""
        if self.status in [JobStatus.COMPLETED, JobStatus.CANCELLED]:
            return False
        self.status = JobStatus.CANCELLED
        self.cancelled_at = timezone.now()
        if reason:
            self.notes = f"{self.notes}\nCancelled: {reason}".strip()
        self.save(update_fields=["status", "cancelled_at", "notes", "updated_at"])
        self._log_event(JobEventType.CANCELLED, f"Job cancelled: {reason}")
        return True

    def pause(self):
        """Pause job execution."""
        if self.status != JobStatus.IN_PROGRESS:
            return False
        self.status = JobStatus.PAUSED
        self.save(update_fields=["status", "updated_at"])
        self._log_event(JobEventType.PAUSED, "Job paused")
        return True

    def resume(self):
        """Resume paused job."""
        if self.status != JobStatus.PAUSED:
            return False
        self.status = JobStatus.IN_PROGRESS
        self.save(update_fields=["status", "updated_at"])
        self._log_event(JobEventType.RESUMED, "Job resumed")
        return True

    def retry(self):
        """Retry a failed job."""
        if not self.can_retry:
            return False
        self.status = JobStatus.QUEUED
        self.retry_count += 1
        self.error_code = ""
        self.error_message = ""
        self.failed_at = None
        self.queued_at = timezone.now()
        self.save(
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

    # Position at event time (optional)
    x_position = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("X Position"),
    )
    y_position = models.FloatField(
        blank=True,
        null=True,
        verbose_name=_("Y Position"),
    )
    z_position = models.FloatField(
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

"""
Jobs Managers

Custom managers and querysets for jobs models.
"""

from django.db import models

from apps.core.choices import JobStatus


class DroneJobQuerySet(models.QuerySet):
    """Custom QuerySet for DroneJob model."""

    def pending(self):
        """Get jobs waiting to be queued."""
        return self.filter(status=JobStatus.NEW)

    def queued(self):
        """Get jobs in queue."""
        return self.filter(status=JobStatus.QUEUED)

    def assigned(self):
        """Get jobs assigned to drones."""
        return self.filter(status=JobStatus.ASSIGNED)

    def in_progress(self):
        """Get jobs currently being executed."""
        return self.filter(status=JobStatus.IN_PROGRESS)

    def active(self):
        """Get all active jobs (not completed, failed, or cancelled)."""
        return self.filter(
            status__in=[
                JobStatus.NEW,
                JobStatus.QUEUED,
                JobStatus.ASSIGNED,
                JobStatus.IN_PROGRESS,
                JobStatus.PAUSED,
            ]
        )

    def completed(self):
        """Get completed jobs."""
        return self.filter(status=JobStatus.COMPLETED)

    def failed(self):
        """Get failed jobs."""
        return self.filter(status=JobStatus.FAILED)

    def cancelled(self):
        """Get cancelled jobs."""
        return self.filter(status=JobStatus.CANCELLED)

    def for_warehouse(self, warehouse):
        """Get jobs for a specific warehouse."""
        return self.filter(warehouse=warehouse)

    def for_drone(self, drone):
        """Get jobs for a specific drone."""
        return self.filter(drone=drone)

    def for_order(self, order):
        """Get jobs for a specific order."""
        return self.filter(order=order)

    def for_order_line(self, order_line):
        """Get jobs for a specific order line."""
        return self.filter(order_line=order_line)

    def priority_ordered(self):
        """Order by priority (URGENT first, then by created_at)."""
        from apps.core.choices import OrderPriority

        priority_order = models.Case(
            models.When(priority=OrderPriority.URGENT, then=0),
            models.When(priority=OrderPriority.HIGH, then=1),
            models.When(priority=OrderPriority.NORMAL, then=2),
            models.When(priority=OrderPriority.LOW, then=3),
            default=4,
        )
        return self.annotate(priority_order=priority_order).order_by("priority_order", "created_at")

    def next_in_queue(self, warehouse=None, drone=None):
        """
        Get the next job in queue for processing.

        Args:
            warehouse: Optional warehouse to filter by
            drone: Optional drone to filter by (for drone-specific jobs)
        """
        qs = self.queued().priority_ordered()
        if warehouse:
            qs = qs.filter(warehouse=warehouse)
        if drone:
            qs = qs.filter(models.Q(drone=drone) | models.Q(drone__isnull=True))
        return qs.first()


class DroneJobManager(models.Manager):
    """Custom manager for DroneJob model."""

    def get_queryset(self):
        return DroneJobQuerySet(self.model, using=self._db)

    def pending(self):
        return self.get_queryset().pending()

    def queued(self):
        return self.get_queryset().queued()

    def assigned(self):
        return self.get_queryset().assigned()

    def in_progress(self):
        return self.get_queryset().in_progress()

    def active(self):
        return self.get_queryset().active()

    def completed(self):
        return self.get_queryset().completed()

    def failed(self):
        return self.get_queryset().failed()

    def cancelled(self):
        return self.get_queryset().cancelled()

    def for_warehouse(self, warehouse):
        return self.get_queryset().for_warehouse(warehouse)

    def for_drone(self, drone):
        return self.get_queryset().for_drone(drone)

    def for_order(self, order):
        return self.get_queryset().for_order(order)

    def priority_ordered(self):
        return self.get_queryset().priority_ordered()

    def next_in_queue(self, warehouse=None, drone=None):
        return self.get_queryset().next_in_queue(warehouse, drone)


class DroneJobEventQuerySet(models.QuerySet):
    """Custom QuerySet for DroneJobEvent model."""

    def for_job(self, job):
        """Get events for a specific job."""
        return self.filter(job=job)

    def by_type(self, event_type):
        """Get events of a specific type."""
        return self.filter(event_type=event_type)

    def recent(self, limit=10):
        """Get most recent events."""
        return self.order_by("-created_at")[:limit]


class DroneJobEventManager(models.Manager):
    """Custom manager for DroneJobEvent model."""

    def get_queryset(self):
        return DroneJobEventQuerySet(self.model, using=self._db)

    def for_job(self, job):
        return self.get_queryset().for_job(job)

    def by_type(self, event_type):
        return self.get_queryset().by_type(event_type)

    def recent(self, limit=10):
        return self.get_queryset().recent(limit)

"""
Orders Managers

Custom managers for Order models with business logic queries.
"""

from django.db import models
from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from apps.core.choices import OrderPriority, OrderStatus


class PickOrderQuerySet(models.QuerySet):
    """QuerySet for PickOrder with common filters."""

    def for_organization(self, organization):
        """Filter orders by organization."""
        return self.filter(organization=organization)

    def for_warehouse(self, warehouse):
        """Filter orders by warehouse."""
        return self.filter(warehouse=warehouse)

    def pending(self):
        """Get pending orders."""
        return self.filter(status=OrderStatus.PENDING)

    def confirmed(self):
        """Get confirmed orders."""
        return self.filter(status=OrderStatus.CONFIRMED)

    def in_progress(self):
        """Get orders currently being picked."""
        return self.filter(status__in=[OrderStatus.PICKING, OrderStatus.PACKING])

    def completed(self):
        """Get completed orders."""
        return self.filter(status__in=[OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.DELIVERED])

    def cancelled(self):
        """Get cancelled orders."""
        return self.filter(status=OrderStatus.CANCELLED)

    def active(self):
        """Get active (non-cancelled, non-completed) orders."""
        return self.exclude(status__in=[OrderStatus.CANCELLED, OrderStatus.DELIVERED])

    def by_priority(self, priority):
        """Filter by priority level."""
        return self.filter(priority=priority)

    def urgent(self):
        """Get urgent orders."""
        return self.filter(priority=OrderPriority.URGENT)

    def high_priority(self):
        """Get high priority and above."""
        return self.filter(priority__in=[OrderPriority.HIGH, OrderPriority.URGENT])

    def due_today(self):
        """Get orders due today."""
        today = timezone.now().date()
        return self.filter(due_date=today)

    def overdue(self):
        """Get overdue orders."""
        today = timezone.now().date()
        return self.filter(due_date__lt=today).exclude(status__in=[OrderStatus.DELIVERED, OrderStatus.CANCELLED])

    def with_line_counts(self):
        """Annotate with line counts."""
        return self.annotate(
            total_lines=Count("lines"),
            picked_lines=Count("lines", filter=Q(lines__is_picked=True)),
            pending_lines=Count("lines", filter=Q(lines__is_picked=False)),
        )

    def with_item_counts(self):
        """Annotate with total item counts."""
        return self.annotate(
            total_items=Sum("lines__quantity"),
            picked_items=Sum("lines__picked_quantity"),
        )

    def ready_for_picking(self):
        """Get orders that are ready to be picked."""
        return self.filter(status=OrderStatus.CONFIRMED)

    def search(self, query):
        """Search orders by number, reference, or customer."""
        return self.filter(
            Q(order_number__icontains=query)
            | Q(external_reference__icontains=query)
            | Q(customer_name__icontains=query)
        )


class PickOrderManager(models.Manager):
    """Manager for PickOrder model."""

    def get_queryset(self):
        """Return custom queryset."""
        return PickOrderQuerySet(self.model, using=self._db)

    def for_organization(self, organization):
        """Filter orders by organization."""
        return self.get_queryset().for_organization(organization)

    def pending(self):
        """Get pending orders."""
        return self.get_queryset().pending()

    def active(self):
        """Get active orders."""
        return self.get_queryset().active()

    def urgent(self):
        """Get urgent orders."""
        return self.get_queryset().urgent()

    def overdue(self):
        """Get overdue orders."""
        return self.get_queryset().overdue()

    def create_order(self, organization, warehouse, created_by, **kwargs):
        """Create a new pick order with auto-generated order number."""
        from django.utils.crypto import get_random_string

        # Generate unique order number
        today = timezone.now()
        prefix = f"PO-{today.strftime('%Y%m%d')}"
        suffix = get_random_string(6, "0123456789").upper()
        order_number = f"{prefix}-{suffix}"

        return self.create(
            organization=organization,
            warehouse=warehouse,
            order_number=order_number,
            created_by=created_by,
            **kwargs,
        )


class PickOrderLineQuerySet(models.QuerySet):
    """QuerySet for PickOrderLine with common filters."""

    def for_order(self, order):
        """Filter lines by order."""
        return self.filter(order=order)

    def picked(self):
        """Get picked lines."""
        return self.filter(is_picked=True)

    def pending(self):
        """Get pending (not picked) lines."""
        return self.filter(is_picked=False)

    def with_shortages(self):
        """Get lines with shortages (picked < requested)."""
        return self.filter(is_picked=True, picked_quantity__lt=F("quantity"))

    def for_item(self, item):
        """Filter lines by inventory item."""
        return self.filter(item=item)

    def for_bin(self, bin):
        """Filter lines by source bin."""
        return self.filter(source_bin=bin)


class PickOrderLineManager(models.Manager):
    """Manager for PickOrderLine model."""

    def get_queryset(self):
        """Return custom queryset."""
        return PickOrderLineQuerySet(self.model, using=self._db)

    def for_order(self, order):
        """Filter lines by order."""
        return self.get_queryset().for_order(order)

    def pending(self):
        """Get pending lines."""
        return self.get_queryset().pending()


class PickOrderBatchQuerySet(models.QuerySet):
    """QuerySet for PickOrderBatch with common filters."""

    def for_organization(self, organization):
        """Filter batches by organization."""
        return self.filter(organization=organization)

    def for_warehouse(self, warehouse):
        """Filter batches by warehouse."""
        return self.filter(warehouse=warehouse)

    def active(self):
        """Get active (open) batches."""
        return self.filter(is_completed=False)

    def completed(self):
        """Get completed batches."""
        return self.filter(is_completed=True)

    def with_order_counts(self):
        """Annotate with order counts."""
        return self.annotate(order_count=Count("orders"))


class PickOrderBatchManager(models.Manager):
    """Manager for PickOrderBatch model."""

    def get_queryset(self):
        """Return custom queryset."""
        return PickOrderBatchQuerySet(self.model, using=self._db)

    def for_organization(self, organization):
        """Filter batches by organization."""
        return self.get_queryset().for_organization(organization)

    def active(self):
        """Get active batches."""
        return self.get_queryset().active()

    def create_batch(self, organization, warehouse, created_by, orders=None, **kwargs):
        """Create a new batch with optional orders."""
        from django.utils.crypto import get_random_string

        # Generate unique batch number
        today = timezone.now()
        prefix = f"BATCH-{today.strftime('%Y%m%d')}"
        suffix = get_random_string(4, "0123456789").upper()
        batch_number = f"{prefix}-{suffix}"

        batch = self.create(
            organization=organization,
            warehouse=warehouse,
            batch_number=batch_number,
            created_by=created_by,
            **kwargs,
        )

        if orders:
            batch.orders.set(orders)

        return batch

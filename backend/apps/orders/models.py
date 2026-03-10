"""
Orders Models

Models for managing pick orders, order lines, and order batches.
"""

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import F, Value
from django.db.models.functions import Greatest
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from django_cryptography.fields import encrypt

from apps.core.choices import OrderPriority, OrderStatus
from apps.core.models import AuditedModel, BaseModel, TimeStampedModel

from .managers import PickOrderBatchManager, PickOrderLineManager, PickOrderManager


class PickOrder(AuditedModel):
    """
    Pick order representing a customer order to be fulfilled.

    Orders contain multiple lines (items to be picked) and go through
    various statuses from pending to delivered.
    Uses AuditedModel for complete change history tracking.
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="orders",
        verbose_name=_("Organization"),
    )
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.CASCADE,
        related_name="orders",
        verbose_name=_("Warehouse"),
    )
    batch = models.ForeignKey(
        "orders.PickOrderBatch",
        on_delete=models.SET_NULL,
        related_name="orders",
        blank=True,
        null=True,
        verbose_name=_("Batch"),
    )
    order_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name=_("Order Number"),
    )
    external_reference = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
        verbose_name=_("External Reference"),
        help_text=_("Reference from external system (ERP, WMS, etc.)"),
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
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

    # Customer information
    customer_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Customer Name"),
    )
    customer_code = models.CharField(
        max_length=50,
        blank=True,
        default="",
        db_index=True,
        verbose_name=_("Customer Code"),
    )

    # Shipping address - encrypted for PII protection
    shipping_address_line1 = encrypt(
        models.CharField(
            max_length=255,
            blank=True,
            default="",
            verbose_name=_("Address Line 1"),
        )
    )
    shipping_address_line2 = encrypt(
        models.CharField(
            max_length=255,
            blank=True,
            default="",
            verbose_name=_("Address Line 2"),
        )
    )
    shipping_city = encrypt(
        models.CharField(
            max_length=100,
            blank=True,
            default="",
            verbose_name=_("City"),
        )
    )
    shipping_state = encrypt(
        models.CharField(
            max_length=100,
            blank=True,
            default="",
            verbose_name=_("State"),
        )
    )
    shipping_postal_code = encrypt(
        models.CharField(
            max_length=20,
            blank=True,
            default="",
            verbose_name=_("Postal Code"),
        )
    )
    shipping_country = models.CharField(
        max_length=100,
        default="India",
        verbose_name=_("Country"),
    )

    # Dates
    order_date = models.DateField(
        default=timezone.now,
        verbose_name=_("Order Date"),
    )
    due_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Due Date"),
    )
    confirmed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Confirmed At"),
    )
    picking_started_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Picking Started At"),
    )
    picking_completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Picking Completed At"),
    )
    packed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Packed At"),
    )
    shipped_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Shipped At"),
    )
    delivered_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Delivered At"),
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Cancelled At"),
    )

    # Assigned picker (user who is picking this order)
    assigned_to = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="assigned_orders",
        blank=True,
        null=True,
        db_index=True,
        verbose_name=_("Assigned To"),
    )
    assigned_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Assigned At"),
        help_text=_("When the order was assigned to a picker"),
    )
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="created_orders",
        blank=True,
        null=True,
        db_index=True,
        verbose_name=_("Created By"),
    )

    # Cancellation
    cancellation_reason = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Cancellation Reason"),
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

    objects = PickOrderManager()

    class Meta:
        verbose_name = _("Pick Order")
        verbose_name_plural = _("Pick Orders")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["warehouse", "status"]),
            models.Index(fields=["order_date"]),
            models.Index(fields=["due_date"]),
            models.Index(fields=["priority", "status"]),
            # Composite indexes for common queries
            models.Index(fields=["organization", "status", "priority"]),
            models.Index(fields=["warehouse", "status", "due_date"]),
            models.Index(fields=["assigned_to", "status"]),
            # Partial indexes for non-deleted records (most queries filter on active records)
            models.Index(
                fields=["organization", "status"],
                name="order_org_status_active",
                condition=models.Q(deleted__isnull=True),
            ),
            models.Index(
                fields=["warehouse", "status", "priority"],
                name="order_wh_stat_pri_active",
                condition=models.Q(deleted__isnull=True),
            ),
            models.Index(
                fields=["due_date"],
                name="order_due_date_active",
                condition=models.Q(deleted__isnull=True),
            ),
        ]
        constraints = [
            # Due date should be on or after order date
            models.CheckConstraint(
                condition=(
                    models.Q(due_date__isnull=True) | models.Q(due_date__gte=models.F("order_date"))
                ),
                name="due_date_after_order_date",
            ),
        ]

    def __str__(self):
        return f"{self.order_number} ({self.get_status_display()})"

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
                    "Warehouse must belong to the same organization as the order."
                )

        # Validate batch belongs to same organization
        if self.batch_id and self.organization_id:
            if self.batch.organization_id != self.organization_id:
                errors["batch"] = _(
                    "Batch must belong to the same organization as the order."
                )

        # Validate assigned_to belongs to same organization
        if self.assigned_to_id and self.organization_id:
            from apps.organizations.models import OrganizationMembership

            if not OrganizationMembership.objects.filter(
                user_id=self.assigned_to_id,
                organization_id=self.organization_id,
            ).exists():
                errors["assigned_to"] = _(
                    "Assigned user must be a member of the order's organization."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Skip history to avoid conflict with django-modeltranslation
        self.skip_history_when_saving = True
        # Run full validation on save (skip if using update_fields for state transitions)
        if not kwargs.get("update_fields"):
            self.full_clean()
        super().save(*args, **kwargs)

    @property
    def total_lines(self):
        """Get total number of order lines."""
        return self.lines.count()

    @property
    def picked_lines(self):
        """Get number of picked lines."""
        return self.lines.filter(is_picked=True).count()

    @property
    def pending_lines(self):
        """Get number of pending lines."""
        return self.lines.filter(is_picked=False).count()

    @property
    def total_quantity(self):
        """Get total quantity to pick."""
        return self.lines.aggregate(total=models.Sum("quantity"))["total"] or 0

    @property
    def picked_quantity(self):
        """Get total quantity picked."""
        return self.lines.aggregate(total=models.Sum("picked_quantity"))["total"] or 0

    @property
    def pick_progress_percent(self):
        """Get picking progress percentage."""
        total = self.total_quantity
        if total == 0:
            return 0
        return round((self.picked_quantity / total) * 100, 1)

    @property
    def is_overdue(self):
        """Check if order is overdue."""
        if not self.due_date:
            return False
        if self.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            return False
        return self.due_date < timezone.now().date()

    @property
    def is_complete(self):
        """Check if order is complete."""
        return self.status in [OrderStatus.DELIVERED, OrderStatus.SHIPPED]

    @property
    def shipping_address(self):
        """Get formatted shipping address."""
        parts = [
            self.shipping_address_line1,
            self.shipping_address_line2,
            self.shipping_city,
            f"{self.shipping_state} {self.shipping_postal_code}".strip(),
            self.shipping_country,
        ]
        return ", ".join(p for p in parts if p)

    @transaction.atomic
    def confirm(self, user=None):
        """Confirm the order for picking and reserve stock."""
        if self.status != OrderStatus.PENDING:
            return False
        # Reserve stock for each line that has a stock record
        for line in self.lines.select_related("stock").all():
            if line.stock:
                line.stock.reserved_quantity = F("reserved_quantity") + line.quantity
                line.stock.save(update_fields=["reserved_quantity", "updated_at"])
        self.status = OrderStatus.CONFIRMED
        self.confirmed_at = timezone.now()
        self.save(update_fields=["status", "confirmed_at", "updated_at"])
        return True

    @transaction.atomic
    def start_picking(self, user=None):
        """Start picking the order."""
        if self.status != OrderStatus.CONFIRMED:
            return False
        self.status = OrderStatus.PICKING
        self.picking_started_at = timezone.now()
        update_fields = ["status", "picking_started_at", "updated_at"]
        if user:
            self.assigned_to = user
            self.assigned_at = timezone.now()
            update_fields.extend(["assigned_to", "assigned_at"])
        self.save(update_fields=update_fields)
        return True

    @transaction.atomic
    def complete_picking(self):
        """Mark picking as complete."""
        if self.status != OrderStatus.PICKING:
            return False
        self.status = OrderStatus.PICKED
        self.picking_completed_at = timezone.now()
        self.save(update_fields=["status", "picking_completed_at", "updated_at"])
        return True

    @transaction.atomic
    def pack(self):
        """Mark order as packed."""
        if self.status not in [OrderStatus.PICKED, OrderStatus.PACKING]:
            return False
        self.status = OrderStatus.PACKED
        self.packed_at = timezone.now()
        self.save(update_fields=["status", "packed_at", "updated_at"])
        return True

    @transaction.atomic
    def ship(self):
        """Mark order as shipped."""
        if self.status != OrderStatus.PACKED:
            return False
        self.status = OrderStatus.SHIPPED
        self.shipped_at = timezone.now()
        self.save(update_fields=["status", "shipped_at", "updated_at"])
        return True

    @transaction.atomic
    def deliver(self):
        """Mark order as delivered."""
        if self.status != OrderStatus.SHIPPED:
            return False
        self.status = OrderStatus.DELIVERED
        self.delivered_at = timezone.now()
        self.save(update_fields=["status", "delivered_at", "updated_at"])
        return True

    @transaction.atomic
    def cancel(self, reason=""):
        """Cancel the order and release/restore stock."""
        if self.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            return False
        for line in self.lines.select_related("stock").all():
            if line.stock:
                if self.status in [OrderStatus.CONFIRMED, OrderStatus.PICKING]:
                    # Release reservation for unpicked lines
                    line.stock.reserved_quantity = Greatest(
                        F("reserved_quantity") - line.quantity, Value(0)
                    )
                    line.stock.save(update_fields=["reserved_quantity", "updated_at"])
                elif self.status in [
                    OrderStatus.PICKED, OrderStatus.PACKING,
                    OrderStatus.PACKED, OrderStatus.SHIPPED,
                ]:
                    # Restore deducted stock for picked lines
                    if line.is_picked:
                        line.stock.quantity = F("quantity") + line.picked_quantity
                        line.stock.save(update_fields=["quantity", "updated_at"])
        self.status = OrderStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancellation_reason = reason
        self.save(update_fields=["status", "cancelled_at", "cancellation_reason", "updated_at"])
        return True

    @transaction.atomic
    def hold(self):
        """Put order on hold."""
        if self.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            return False
        self.status = OrderStatus.ON_HOLD
        self.save(update_fields=["status", "updated_at"])
        return True

    # State revert map: current → previous
    REVERT_MAP = {
        OrderStatus.CONFIRMED: OrderStatus.PENDING,
        OrderStatus.PICKING: OrderStatus.CONFIRMED,
        OrderStatus.PICKED: OrderStatus.PICKING,
        OrderStatus.PACKING: OrderStatus.PICKED,
        OrderStatus.PACKED: OrderStatus.PICKED,
        OrderStatus.SHIPPED: OrderStatus.PACKED,
    }

    # Timestamp fields to clear when reverting from a state
    REVERT_TIMESTAMP_FIELDS = {
        OrderStatus.CONFIRMED: "confirmed_at",
        OrderStatus.PICKING: "picking_started_at",
        OrderStatus.PICKED: "picking_completed_at",
        OrderStatus.PACKED: "packed_at",
        OrderStatus.SHIPPED: "shipped_at",
    }

    @transaction.atomic
    def revert(self, reason=""):
        """Revert the order to its previous state, undoing stock changes."""
        prev = self.REVERT_MAP.get(self.status)
        if not prev:
            return False

        if self.status == OrderStatus.CONFIRMED:
            # Release reservations made during confirm
            for line in self.lines.select_related("stock").all():
                if line.stock:
                    line.stock.reserved_quantity = Greatest(
                        F("reserved_quantity") - line.quantity, Value(0)
                    )
                    line.stock.save(update_fields=["reserved_quantity", "updated_at"])

        elif self.status == OrderStatus.PICKED:
            # Un-pick lines: restore stock quantity and re-reserve
            for line in self.lines.select_related("stock").filter(is_picked=True):
                if line.stock:
                    line.stock.quantity = F("quantity") + line.picked_quantity
                    line.stock.reserved_quantity = F("reserved_quantity") + line.quantity
                    line.stock.save(update_fields=["quantity", "reserved_quantity", "updated_at"])
                line.is_picked = False
                line.picked_quantity = 0
                line.picked_at = None
                line.picked_by = None
                line.save(update_fields=[
                    "is_picked", "picked_quantity", "picked_at", "picked_by", "updated_at",
                ])

        elif self.status == OrderStatus.SHIPPED:
            # Shipped → Packed: restore deducted stock
            for line in self.lines.select_related("stock").filter(is_picked=True):
                if line.stock:
                    line.stock.quantity = F("quantity") + line.picked_quantity
                    line.stock.save(update_fields=["quantity", "updated_at"])

        # Clear the timestamp for the state being reverted
        ts_field = self.REVERT_TIMESTAMP_FIELDS.get(self.status)
        update_fields = ["status", "updated_at"]
        if ts_field:
            setattr(self, ts_field, None)
            update_fields.append(ts_field)

        self.status = prev
        self.save(update_fields=update_fields)
        return True


class PickOrderLine(TimeStampedModel):
    """
    Individual line item within a pick order.

    Each line represents an item to be picked from a specific location.
    """

    order = models.ForeignKey(
        PickOrder,
        on_delete=models.CASCADE,
        related_name="lines",
        verbose_name=_("Order"),
    )
    item = models.ForeignKey(
        "inventory.InventoryItem",
        on_delete=models.PROTECT,
        related_name="order_lines",
        verbose_name=_("Item"),
    )
    source_bin = models.ForeignKey(
        "inventory.StorageBin",
        on_delete=models.PROTECT,
        related_name="order_lines",
        verbose_name=_("Source Bin"),
        help_text=_("Bin from which item should be picked"),
    )
    stock = models.ForeignKey(
        "inventory.InventoryStock",
        on_delete=models.SET_NULL,
        related_name="order_lines",
        blank=True,
        null=True,
        verbose_name=_("Stock Record"),
        help_text=_("Specific stock record to pick from (optional)"),
    )

    # Quantities
    quantity = models.PositiveIntegerField(
        verbose_name=_("Quantity"),
        help_text=_("Quantity to pick"),
    )
    picked_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Picked Quantity"),
        help_text=_("Quantity actually picked"),
    )

    # Line number for ordering
    line_number = models.PositiveIntegerField(
        default=1,
        verbose_name=_("Line Number"),
    )

    # Status
    is_picked = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name=_("Is Picked"),
    )
    picked_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Picked At"),
    )
    picked_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="picked_lines",
        blank=True,
        null=True,
        verbose_name=_("Picked By"),
    )

    # For tracking lot/batch
    lot_number = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("Lot Number"),
    )

    # Notes
    notes = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Notes"),
    )
    pick_notes = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Pick Notes"),
        help_text=_("Notes recorded during picking"),
    )

    objects = PickOrderLineManager()

    class Meta:
        verbose_name = _("Pick Order Line")
        verbose_name_plural = _("Pick Order Lines")
        ordering = ["order", "line_number"]
        indexes = [
            models.Index(fields=["order", "is_picked"]),
            models.Index(fields=["item"]),
            models.Index(fields=["source_bin"]),
        ]
        constraints = [
            # Picked quantity cannot exceed requested quantity
            models.CheckConstraint(
                condition=models.Q(picked_quantity__lte=models.F("quantity")),
                name="order_line_picked_not_exceed_quantity",
            ),
        ]

    def __str__(self):
        return f"{self.order.order_number} - Line {self.line_number}: {self.item.sku}"

    def clean(self):
        """
        Validate cross-model organization boundaries.

        Ensures item and bin belong to the same organization/warehouse as the order.
        """
        super().clean()
        errors = {}

        if self.order_id:
            order_org_id = self.order.organization_id
            order_warehouse_id = self.order.warehouse_id

            # Validate item belongs to same organization
            if self.item_id and order_org_id:
                if self.item.organization_id != order_org_id:
                    errors["item"] = _(
                        "Item must belong to the same organization as the order."
                    )

            # Validate source bin belongs to same warehouse
            if self.source_bin_id and order_warehouse_id:
                bin_warehouse_id = self.source_bin.location.zone.warehouse_id
                if bin_warehouse_id != order_warehouse_id:
                    errors["source_bin"] = _(
                        "Source bin must be in the same warehouse as the order."
                    )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Run full validation on save
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def shortage_quantity(self):
        """Get shortage quantity (requested - picked)."""
        if not self.is_picked:
            return 0
        return max(0, self.quantity - self.picked_quantity)

    @property
    def has_shortage(self):
        """Check if line has shortage."""
        return self.shortage_quantity > 0

    @property
    def is_fully_picked(self):
        """Check if line is fully picked."""
        return self.is_picked and self.picked_quantity >= self.quantity

    @transaction.atomic
    def pick(self, quantity, user=None, notes=""):
        """Mark line as picked with quantity and deduct from stock."""
        self.picked_quantity = quantity
        self.is_picked = True
        self.picked_at = timezone.now()
        if user:
            self.picked_by = user
        if notes:
            self.pick_notes = notes
        # Deduct from stock: reduce quantity and release reservation
        if self.stock:
            self.stock.quantity = F("quantity") - quantity
            self.stock.reserved_quantity = Greatest(
                F("reserved_quantity") - self.quantity, Value(0)
            )
            self.stock.save(update_fields=["quantity", "reserved_quantity", "updated_at"])
        self.save(
            update_fields=[
                "picked_quantity",
                "is_picked",
                "picked_at",
                "picked_by",
                "pick_notes",
                "updated_at",
            ]
        )

        # Check if all lines are picked
        self._check_order_complete()
        return True

    def _check_order_complete(self):
        """Check if order is complete and update status."""
        order = self.order
        if order.lines.filter(is_picked=False).count() == 0:
            order.complete_picking()


class PickOrderBatch(BaseModel):
    """
    Batch of pick orders for wave picking or group processing.

    Batches allow grouping orders for more efficient picking
    by optimizing pick paths.
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="order_batches",
        verbose_name=_("Organization"),
    )
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.CASCADE,
        related_name="order_batches",
        verbose_name=_("Warehouse"),
    )
    batch_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name=_("Batch Number"),
    )
    name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Batch Name"),
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Description"),
    )

    # Status
    is_completed = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name=_("Is Completed"),
    )
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Completed At"),
    )

    # Assigned picker
    assigned_to = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="assigned_batches",
        blank=True,
        null=True,
        db_index=True,
        verbose_name=_("Assigned To"),
    )
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="created_batches",
        blank=True,
        null=True,
        verbose_name=_("Created By"),
    )

    # Notes
    notes = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Notes"),
    )

    objects = PickOrderBatchManager()

    class Meta:
        verbose_name = _("Pick Order Batch")
        verbose_name_plural = _("Pick Order Batches")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "is_completed"]),
            models.Index(fields=["warehouse", "is_completed"]),
            # Partial indexes for non-deleted records
            models.Index(
                fields=["organization", "is_completed"],
                name="batch_org_completed_active",
                condition=models.Q(deleted__isnull=True),
            ),
        ]

    def __str__(self):
        return f"{self.batch_number}"

    def clean(self):
        """
        Validate cross-model organization boundaries.

        Ensures warehouse belongs to the same organization as the batch.
        """
        super().clean()
        errors = {}

        # Validate warehouse belongs to organization
        if self.warehouse_id and self.organization_id:
            if self.warehouse.organization_id != self.organization_id:
                errors["warehouse"] = _(
                    "Warehouse must belong to the same organization as the batch."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Run full validation on save
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def order_count(self):
        """Get number of orders in batch."""
        return self.orders.count()

    @property
    def total_lines(self):
        """Get total lines across all orders."""
        return sum(order.total_lines for order in self.orders.all())

    @property
    def picked_lines(self):
        """Get picked lines across all orders."""
        return sum(order.picked_lines for order in self.orders.all())

    @property
    def progress_percent(self):
        """Get batch picking progress."""
        total = self.total_lines
        if total == 0:
            return 0
        return round((self.picked_lines / total) * 100, 1)

    @transaction.atomic
    def add_orders(self, orders):
        """Add orders to batch."""
        for order in orders:
            order.batch = self
            order.save(update_fields=["batch", "updated_at"])

    @transaction.atomic
    def remove_order(self, order):
        """Remove order from batch."""
        if order.batch == self:
            order.batch = None
            order.save(update_fields=["batch", "updated_at"])

    @transaction.atomic
    def complete(self):
        """Mark batch as complete."""
        self.is_completed = True
        self.completed_at = timezone.now()
        self.save(update_fields=["is_completed", "completed_at", "updated_at"])
        return True

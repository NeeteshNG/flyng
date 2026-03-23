"""
Orders Views

API views for pick orders, order lines, and order batches.
"""

from django.db.models import Count, Q, Sum
from django_filters import rest_framework as django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.choices import ActivityAction
from apps.core.mixins import ActivityLoggingMixin
from apps.core.permissions import HasPermission, PlanLimitPermission

from .models import Customer, PickOrder, PickOrderBatch, PickOrderLine
from .serializers import (
    CustomerCreateUpdateSerializer,
    CustomerDetailSerializer,
    CustomerListSerializer,
    PickOrderBatchCreateUpdateSerializer,
    PickOrderBatchDetailSerializer,
    PickOrderBatchListSerializer,
    PickOrderCreateUpdateSerializer,
    PickOrderDetailSerializer,
    PickOrderLineCreateUpdateSerializer,
    PickOrderLineListSerializer,
    PickOrderListSerializer,
)


# --- Customer Views ---


class CustomerFilter(django_filters.FilterSet):
    """Filter for customers."""

    organization = django_filters.NumberFilter(field_name="organization")
    is_active = django_filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = Customer
        fields = ["organization", "is_active"]


class CustomerViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for customers.

    list: Get all customers
    create: Create a new customer
    retrieve: Get a customer by UUID
    update: Update a customer
    partial_update: Partially update a customer
    destroy: Soft delete (deactivate) a customer
    """

    permission_classes = [IsAuthenticated, HasPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CustomerFilter
    search_fields = ["name", "code", "email", "contact_person"]
    ordering_fields = ["name", "code", "created_at"]
    ordering = ["name"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return customers with annotated order counts."""
        return (
            Customer.objects.select_related("organization")
            .annotate(order_count=Count("orders"))
            .order_by("name")
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return CustomerListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return CustomerCreateUpdateSerializer
        return CustomerDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete: deactivate the customer."""
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        self.log_activity(ActivityAction.DELETE, instance, "Deactivated customer")
        return Response(
            {"success": True, "message": "Customer deactivated successfully"},
            status=status.HTTP_200_OK,
        )


# --- Pick Order Views ---


class PickOrderFilter(django_filters.FilterSet):
    """Filter for pick orders."""

    organization = django_filters.NumberFilter(field_name="organization")
    warehouse = django_filters.NumberFilter(field_name="warehouse")
    batch = django_filters.NumberFilter(field_name="batch")
    customer = django_filters.NumberFilter(field_name="customer")
    status = django_filters.CharFilter(field_name="status")
    priority = django_filters.CharFilter(field_name="priority")
    assigned_to = django_filters.NumberFilter(field_name="assigned_to")
    created_by = django_filters.NumberFilter(field_name="created_by")
    order_date_from = django_filters.DateFilter(field_name="order_date", lookup_expr="gte")
    order_date_to = django_filters.DateFilter(field_name="order_date", lookup_expr="lte")
    due_date_from = django_filters.DateFilter(field_name="due_date", lookup_expr="gte")
    due_date_to = django_filters.DateFilter(field_name="due_date", lookup_expr="lte")

    class Meta:
        model = PickOrder
        fields = [
            "organization",
            "warehouse",
            "batch",
            "customer",
            "status",
            "priority",
            "assigned_to",
            "created_by",
        ]


class PickOrderViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for pick orders.

    list: Get all pick orders
    create: Create a new pick order
    retrieve: Get a pick order by UUID
    update: Update a pick order
    partial_update: Partially update a pick order
    destroy: Cancel a pick order
    """

    permission_classes = [IsAuthenticated, HasPermission, PlanLimitPermission]
    plan_limit_resource = "order"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PickOrderFilter
    search_fields = [
        "order_number",
        "external_reference",
        "customer_name",
        "customer_code",
    ]
    ordering_fields = [
        "order_number",
        "status",
        "priority",
        "order_date",
        "due_date",
        "created_at",
    ]
    ordering = ["-created_at"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return orders with annotated line counts."""
        return (
            PickOrder.objects.select_related(
                "organization",
                "warehouse",
                "batch",
                "customer",
                "assigned_to",
                "created_by",
            )
            .annotate(
                annotated_total_lines=Count("lines"),
                annotated_picked_lines=Count("lines", filter=Q(lines__is_picked=True)),
                annotated_pending_lines=Count("lines", filter=Q(lines__is_picked=False)),
                annotated_total_items=Sum("lines__quantity"),
                annotated_picked_items=Sum("lines__picked_quantity"),
            )
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return PickOrderListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return PickOrderCreateUpdateSerializer
        return PickOrderDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """Cancel an order instead of deleting."""
        instance = self.get_object()
        reason = request.data.get("reason", "")
        success = instance.cancel(reason=reason)
        if success:
            self.log_activity(ActivityAction.DELETE, instance, "Cancelled order")
            return Response(
                {"success": True, "message": "Order cancelled successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "message": "Order cannot be cancelled in its current state"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def confirm(self, request, uuid=None):
        """Confirm the order for picking."""
        order = self.get_object()
        success = order.confirm(user=request.user)
        if success:
            self.log_activity(ActivityAction.UPDATE, order, "Confirmed order")
            return Response(
                {"success": True, "message": "Order confirmed successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "message": "Order cannot be confirmed in its current state"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"], url_path="start-picking")
    def start_picking(self, request, uuid=None):
        """Start picking the order."""
        order = self.get_object()
        success = order.start_picking(user=request.user)
        if success:
            self.log_activity(ActivityAction.UPDATE, order, "Started picking order")
            return Response(
                {"success": True, "message": "Picking started successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "message": "Cannot start picking in current state"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"], url_path="complete-picking")
    def complete_picking(self, request, uuid=None):
        """Complete picking the order."""
        order = self.get_object()
        success = order.complete_picking()
        if success:
            self.log_activity(ActivityAction.UPDATE, order, "Completed picking order")
            return Response(
                {"success": True, "message": "Picking completed successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "message": "Cannot complete picking in current state"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def pack(self, request, uuid=None):
        """Mark order as packed."""
        order = self.get_object()
        success = order.pack()
        if success:
            self.log_activity(ActivityAction.UPDATE, order, "Packed order")
            return Response(
                {"success": True, "message": "Order packed successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "message": "Cannot pack order in current state"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def ship(self, request, uuid=None):
        """Mark order as shipped."""
        order = self.get_object()
        success = order.ship()
        if success:
            self.log_activity(ActivityAction.UPDATE, order, "Shipped order")
            return Response(
                {"success": True, "message": "Order shipped successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "message": "Cannot ship order in current state"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def deliver(self, request, uuid=None):
        """Mark order as delivered."""
        order = self.get_object()
        success = order.deliver()
        if success:
            self.log_activity(ActivityAction.UPDATE, order, "Delivered order")
            return Response(
                {"success": True, "message": "Order delivered successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "message": "Cannot deliver order in current state"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def hold(self, request, uuid=None):
        """Put order on hold."""
        order = self.get_object()
        success = order.hold()
        if success:
            self.log_activity(ActivityAction.UPDATE, order, "Put order on hold")
            return Response(
                {"success": True, "message": "Order put on hold"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "message": "Cannot put order on hold in current state"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, uuid=None):
        """Cancel the order and release/restore stock."""
        order = self.get_object()
        reason = request.data.get("reason", "")
        success = order.cancel(reason=reason)
        if success:
            self.log_activity(ActivityAction.UPDATE, order, f"Cancelled order: {reason}")
            return Response(
                {"success": True, "message": "Order cancelled successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "message": "Cannot cancel order in current state"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def revert(self, request, uuid=None):
        """Revert the order to its previous state."""
        order = self.get_object()
        reason = request.data.get("reason", "")
        success = order.revert(reason=reason)
        if success:
            self.log_activity(
                ActivityAction.UPDATE, order,
                f"Reverted order to {order.get_status_display()}: {reason}",
            )
            return Response(
                {"success": True, "message": f"Order reverted to {order.get_status_display()}"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "message": "Cannot revert order in current state"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["get"])
    def history(self, request, uuid=None):
        """
        GET /orders/{uuid}/history/

        Returns the change history for an order using django-simple-history.
        Each entry shows what changed, when, and by whom.
        """
        order = self.get_object()
        history_qs = order.history.all().order_by("-history_date")[:50]

        records = []
        history_list = list(history_qs)
        for i, record in enumerate(history_list):
            entry = {
                "history_id": record.history_id,
                "history_date": record.history_date.isoformat(),
                "history_type": record.get_history_type_display(),
                "history_type_code": record.history_type,
                "history_change_reason": record.history_change_reason or "",
                "history_user": (
                    record.history_user.get_full_name() or record.history_user.email
                    if record.history_user else None
                ),
                "status": record.status,
                "priority": record.priority,
                "changes": [],
            }

            # Compute field-level diff against previous record
            if i < len(history_list) - 1:
                prev = history_list[i + 1]
                delta = record.diff_against(prev)
                for change in delta.changes:
                    entry["changes"].append({
                        "field": change.field,
                        "old": str(change.old) if change.old is not None else None,
                        "new": str(change.new) if change.new is not None else None,
                    })

            records.append(entry)

        return Response(records)


# --- Pick Order Line Views ---


class PickOrderLineFilter(django_filters.FilterSet):
    """Filter for order lines."""

    order = django_filters.NumberFilter(field_name="order")
    item = django_filters.NumberFilter(field_name="item")
    source_bin = django_filters.NumberFilter(field_name="source_bin")
    is_picked = django_filters.BooleanFilter(field_name="is_picked")

    class Meta:
        model = PickOrderLine
        fields = [
            "order",
            "item",
            "source_bin",
            "is_picked",
        ]


class PickOrderLineViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for pick order lines.

    list: Get all order lines
    create: Create a new order line
    retrieve: Get an order line by ID
    update: Update an order line
    partial_update: Partially update an order line
    destroy: Delete an order line
    """

    permission_classes = [IsAuthenticated, HasPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PickOrderLineFilter
    search_fields = ["item__sku", "item__name", "source_bin__code", "lot_number"]
    ordering_fields = ["line_number", "quantity", "created_at"]
    ordering = ["order", "line_number"]

    def get_queryset(self):
        """Return order lines with related data."""
        return PickOrderLine.objects.select_related(
            "order",
            "item",
            "source_bin",
            "stock",
            "picked_by",
        ).order_by("order", "line_number")

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action in ["create", "update", "partial_update"]:
            return PickOrderLineCreateUpdateSerializer
        return PickOrderLineListSerializer

    @action(detail=True, methods=["post"])
    def pick(self, request, pk=None):
        """Mark line as picked."""
        line = self.get_object()
        quantity = request.data.get("quantity", line.quantity)
        notes = request.data.get("notes", "")
        line.pick(quantity=quantity, user=request.user, notes=notes)
        self.log_activity(ActivityAction.UPDATE, line, "Picked order line")
        return Response(
            {"success": True, "message": "Line picked successfully"},
            status=status.HTTP_200_OK,
        )


# --- Pick Order Batch Views ---


class PickOrderBatchFilter(django_filters.FilterSet):
    """Filter for order batches."""

    organization = django_filters.NumberFilter(field_name="organization")
    warehouse = django_filters.NumberFilter(field_name="warehouse")
    is_completed = django_filters.BooleanFilter(field_name="is_completed")
    assigned_to = django_filters.NumberFilter(field_name="assigned_to")

    class Meta:
        model = PickOrderBatch
        fields = [
            "organization",
            "warehouse",
            "is_completed",
            "assigned_to",
        ]


class PickOrderBatchViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for pick order batches.

    list: Get all order batches
    create: Create a new batch
    retrieve: Get a batch by UUID
    update: Update a batch
    partial_update: Partially update a batch
    destroy: Delete a batch
    """

    permission_classes = [IsAuthenticated, HasPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PickOrderBatchFilter
    search_fields = ["batch_number", "name", "description"]
    ordering_fields = ["batch_number", "created_at", "completed_at"]
    ordering = ["-created_at"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return batches with annotated order counts."""
        return (
            PickOrderBatch.objects.select_related(
                "organization",
                "warehouse",
                "assigned_to",
                "created_by",
            )
            .annotate(
                order_count=Count("orders"),
            )
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return PickOrderBatchListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return PickOrderBatchCreateUpdateSerializer
        return PickOrderBatchDetailSerializer

    def perform_create(self, serializer):
        """Auto-set created_by and auto-generate batch_number."""
        kwargs = {}
        if self.request.user.is_authenticated:
            kwargs["created_by"] = self.request.user

        if not serializer.validated_data.get("batch_number"):
            from django.utils import timezone
            from django.utils.crypto import get_random_string

            today = timezone.now()
            prefix = f"BATCH-{today.strftime('%Y%m%d')}"
            suffix = get_random_string(4, "0123456789").upper()
            kwargs["batch_number"] = f"{prefix}-{suffix}"

        serializer.save(**kwargs)
        self.log_activity(ActivityAction.CREATE, serializer.instance, "Created batch")

    @action(detail=True, methods=["post"])
    def complete(self, request, uuid=None):
        """Mark batch as complete."""
        batch = self.get_object()
        success = batch.complete()
        if success:
            self.log_activity(ActivityAction.UPDATE, batch, "Completed batch")
            return Response(
                {"success": True, "message": "Batch completed successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": False, "message": "Cannot complete batch"},
            status=status.HTTP_400_BAD_REQUEST,
        )

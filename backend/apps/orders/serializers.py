"""
Orders Serializers

Serializers for pick orders, order lines, and order batches.
"""

from rest_framework import serializers

from .models import PickOrder, PickOrderBatch, PickOrderLine


# --- Pick Order Line Serializers ---


class PickOrderLineListSerializer(serializers.ModelSerializer):
    """Serializer for listing order lines."""

    item_sku = serializers.CharField(source="item.sku", read_only=True)
    item_name = serializers.CharField(source="item.name", read_only=True)
    bin_code = serializers.CharField(source="source_bin.code", read_only=True)
    picked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PickOrderLine
        fields = [
            "id",
            "order",
            "item",
            "item_sku",
            "item_name",
            "source_bin",
            "bin_code",
            "stock",
            "quantity",
            "picked_quantity",
            "line_number",
            "is_picked",
            "picked_at",
            "picked_by",
            "picked_by_name",
            "lot_number",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_picked_by_name(self, obj):
        if obj.picked_by:
            return obj.picked_by.get_full_name() or obj.picked_by.email
        return None


class PickOrderLineCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating order lines."""

    class Meta:
        model = PickOrderLine
        fields = [
            "order",
            "item",
            "source_bin",
            "stock",
            "quantity",
            "picked_quantity",
            "line_number",
            "lot_number",
            "notes",
        ]

    def validate(self, data):
        """Validate line data."""
        quantity = data.get("quantity", self.instance.quantity if self.instance else 0)
        picked = data.get(
            "picked_quantity",
            self.instance.picked_quantity if self.instance else 0,
        )

        if picked > quantity:
            raise serializers.ValidationError(
                {"picked_quantity": "Picked quantity cannot exceed requested quantity."}
            )

        return data


# --- Pick Order Batch Serializers ---


class PickOrderBatchListSerializer(serializers.ModelSerializer):
    """Serializer for listing order batches."""

    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    order_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PickOrderBatch
        fields = [
            "id",
            "uuid",
            "organization",
            "warehouse",
            "warehouse_name",
            "batch_number",
            "name",
            "description",
            "is_completed",
            "completed_at",
            "assigned_to",
            "assigned_to_name",
            "created_by",
            "created_by_name",
            "order_count",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.email
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None


class PickOrderBatchDetailSerializer(serializers.ModelSerializer):
    """Serializer for batch details."""

    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    order_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PickOrderBatch
        fields = [
            "id",
            "uuid",
            "organization",
            "warehouse",
            "warehouse_name",
            "batch_number",
            "name",
            "description",
            "is_completed",
            "completed_at",
            "assigned_to",
            "assigned_to_name",
            "created_by",
            "created_by_name",
            "order_count",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.email
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None


class PickOrderBatchCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating batches."""

    class Meta:
        model = PickOrderBatch
        fields = [
            "organization",
            "warehouse",
            "batch_number",
            "name",
            "description",
            "assigned_to",
            "notes",
        ]
        extra_kwargs = {
            "batch_number": {"required": False},
        }


# --- Pick Order Serializers ---


class PickOrderListSerializer(serializers.ModelSerializer):
    """Serializer for listing pick orders."""

    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    batch_number = serializers.CharField(source="batch.batch_number", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    total_lines = serializers.IntegerField(source="annotated_total_lines", read_only=True)
    picked_lines = serializers.IntegerField(source="annotated_picked_lines", read_only=True)
    pending_lines = serializers.IntegerField(source="annotated_pending_lines", read_only=True)
    total_items = serializers.IntegerField(source="annotated_total_items", read_only=True)
    picked_items = serializers.IntegerField(source="annotated_picked_items", read_only=True)
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = PickOrder
        fields = [
            "id",
            "uuid",
            "organization",
            "warehouse",
            "warehouse_name",
            "batch",
            "batch_number",
            "order_number",
            "external_reference",
            "status",
            "status_display",
            "priority",
            "priority_display",
            "customer_name",
            "customer_code",
            "order_date",
            "due_date",
            "assigned_to",
            "assigned_to_name",
            "created_by",
            "created_by_name",
            "total_lines",
            "picked_lines",
            "pending_lines",
            "total_items",
            "picked_items",
            "is_overdue",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.email
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None


class PickOrderDetailSerializer(serializers.ModelSerializer):
    """Serializer for order details."""

    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    batch_number = serializers.CharField(source="batch.batch_number", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    total_lines = serializers.IntegerField(source="annotated_total_lines", read_only=True)
    picked_lines = serializers.IntegerField(source="annotated_picked_lines", read_only=True)
    pending_lines = serializers.IntegerField(source="annotated_pending_lines", read_only=True)
    total_items = serializers.IntegerField(source="annotated_total_items", read_only=True)
    picked_items = serializers.IntegerField(source="annotated_picked_items", read_only=True)
    is_overdue = serializers.ReadOnlyField()
    shipping_address = serializers.ReadOnlyField()
    lines = PickOrderLineListSerializer(many=True, read_only=True)

    class Meta:
        model = PickOrder
        fields = [
            "id",
            "uuid",
            "organization",
            "warehouse",
            "warehouse_name",
            "batch",
            "batch_number",
            "order_number",
            "external_reference",
            "status",
            "status_display",
            "priority",
            "priority_display",
            "customer_name",
            "customer_code",
            "shipping_address_line1",
            "shipping_address_line2",
            "shipping_city",
            "shipping_state",
            "shipping_postal_code",
            "shipping_country",
            "shipping_address",
            "order_date",
            "due_date",
            "confirmed_at",
            "picking_started_at",
            "picking_completed_at",
            "packed_at",
            "shipped_at",
            "delivered_at",
            "cancelled_at",
            "assigned_to",
            "assigned_to_name",
            "assigned_at",
            "created_by",
            "created_by_name",
            "cancellation_reason",
            "total_lines",
            "picked_lines",
            "pending_lines",
            "total_items",
            "picked_items",
            "is_overdue",
            "notes",
            "internal_notes",
            "lines",
            "created_at",
            "updated_at",
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.email
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None


class PickOrderCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating pick orders."""

    lines = PickOrderLineCreateUpdateSerializer(many=True, required=False)

    class Meta:
        model = PickOrder
        fields = [
            "organization",
            "warehouse",
            "batch",
            "order_number",
            "external_reference",
            "priority",
            "customer_name",
            "customer_code",
            "shipping_address_line1",
            "shipping_address_line2",
            "shipping_city",
            "shipping_state",
            "shipping_postal_code",
            "shipping_country",
            "order_date",
            "due_date",
            "assigned_to",
            "notes",
            "internal_notes",
            "lines",
        ]
        extra_kwargs = {
            "order_number": {"required": False},
        }

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        request = self.context.get("request")

        # Auto-set created_by from request user
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        # Auto-generate order number if not provided
        if not validated_data.get("order_number"):
            from django.utils import timezone
            from django.utils.crypto import get_random_string

            today = timezone.now()
            prefix = f"PO-{today.strftime('%Y%m%d')}"
            suffix = get_random_string(6, "0123456789").upper()
            validated_data["order_number"] = f"{prefix}-{suffix}"

        order = PickOrder(**validated_data)
        order.save()

        # Create order lines
        for i, line_data in enumerate(lines_data, start=1):
            line_data.pop("order", None)
            if "line_number" not in line_data:
                line_data["line_number"] = i
            PickOrderLine.objects.create(order=order, **line_data)

        return order

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance

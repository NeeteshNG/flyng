"""
Inventory Serializers

Serializers for storage locations, bins, items, and stock.
"""

from rest_framework import serializers

from .models import StorageLocation, StorageBin, StorageBinTemplate


class StorageLocationListSerializer(serializers.ModelSerializer):
    """Serializer for listing storage locations."""

    zone_name = serializers.CharField(source="zone.name", read_only=True)
    warehouse_name = serializers.CharField(source="zone.warehouse.name", read_only=True)
    bin_count = serializers.SerializerMethodField()

    class Meta:
        model = StorageLocation
        fields = [
            "id",
            "uuid",
            "zone",
            "zone_name",
            "warehouse_name",
            "code",
            "aisle",
            "rack",
            "level",
            "position",
            "location_type",
            "x_coordinate",
            "y_coordinate",
            "z_coordinate",
            "max_bins",
            "is_accessible",
            "is_full",
            "is_active",
            "notes",
            "bin_count",
            "created_at",
            "updated_at",
        ]

    def get_bin_count(self, obj):
        return obj.bins.count() if hasattr(obj, "bins") else 0


class StorageLocationDetailSerializer(serializers.ModelSerializer):
    """Serializer for storage location details."""

    zone_name = serializers.CharField(source="zone.name", read_only=True)
    warehouse_name = serializers.CharField(source="zone.warehouse.name", read_only=True)
    bin_count = serializers.SerializerMethodField()
    full_address = serializers.ReadOnlyField()

    class Meta:
        model = StorageLocation
        fields = [
            "id",
            "uuid",
            "zone",
            "zone_name",
            "warehouse_name",
            "code",
            "aisle",
            "rack",
            "level",
            "position",
            "location_type",
            "x_coordinate",
            "y_coordinate",
            "z_coordinate",
            "max_bins",
            "is_accessible",
            "is_full",
            "is_active",
            "notes",
            "bin_count",
            "full_address",
            "created_at",
            "updated_at",
        ]

    def get_bin_count(self, obj):
        return obj.bins.count() if hasattr(obj, "bins") else 0


class StorageLocationCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating storage locations."""

    class Meta:
        model = StorageLocation
        fields = [
            "zone",
            "code",
            "aisle",
            "rack",
            "level",
            "position",
            "location_type",
            "x_coordinate",
            "y_coordinate",
            "z_coordinate",
            "max_bins",
            "is_accessible",
            "is_active",
            "notes",
        ]

    def validate(self, data):
        """Validate location data."""
        # Check unique code within zone
        zone = data.get("zone") or (self.instance.zone if self.instance else None)
        code = data.get("code") or (self.instance.code if self.instance else None)

        if zone and code:
            qs = StorageLocation.objects.filter(zone=zone, code=code)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"code": "Location code already exists in this zone."}
                )

        return data


class StorageBinListSerializer(serializers.ModelSerializer):
    """Serializer for listing storage bins."""

    location_code = serializers.CharField(source="location.code", read_only=True)
    location_full_address = serializers.CharField(
        source="location.full_address", read_only=True
    )
    zone_name = serializers.CharField(source="location.zone.name", read_only=True)
    warehouse_name = serializers.CharField(
        source="location.zone.warehouse.name", read_only=True
    )
    template_name = serializers.CharField(source="template.name", read_only=True)

    class Meta:
        model = StorageBin
        fields = [
            "id",
            "uuid",
            "location",
            "location_code",
            "location_full_address",
            "zone_name",
            "warehouse_name",
            "template",
            "template_name",
            "code",
            "label_value",
            "position_index",
            "current_weight_kg",
            "item_count",
            "is_full",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]


class StorageBinDetailSerializer(serializers.ModelSerializer):
    """Serializer for storage bin details."""

    location_code = serializers.CharField(source="location.code", read_only=True)
    location_full_address = serializers.CharField(
        source="location.full_address", read_only=True
    )
    zone_name = serializers.CharField(source="location.zone.name", read_only=True)
    warehouse_name = serializers.CharField(
        source="location.zone.warehouse.name", read_only=True
    )
    template_name = serializers.CharField(source="template.name", read_only=True)
    template_capacity = serializers.DecimalField(
        source="template.max_weight_kg",
        max_digits=8,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = StorageBin
        fields = [
            "id",
            "uuid",
            "location",
            "location_code",
            "location_full_address",
            "zone_name",
            "warehouse_name",
            "template",
            "template_name",
            "template_capacity",
            "code",
            "label_value",
            "position_index",
            "current_weight_kg",
            "item_count",
            "is_full",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]


class StorageBinCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating storage bins."""

    class Meta:
        model = StorageBin
        fields = [
            "location",
            "template",
            "code",
            "label_value",
            "position_index",
            "is_active",
            "notes",
        ]

    def validate(self, data):
        """Validate bin data."""
        location = data.get("location") or (
            self.instance.location if self.instance else None
        )
        code = data.get("code") or (self.instance.code if self.instance else None)

        # Check unique code within location
        if location and code:
            qs = StorageBin.objects.filter(location=location, code=code)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"code": "Bin code already exists in this location."}
                )

        # Check max_bins capacity
        if location and not self.instance:  # Only check on creation
            current_bin_count = StorageBin.objects.filter(location=location).count()
            if location.max_bins and current_bin_count >= location.max_bins:
                raise serializers.ValidationError(
                    {
                        "location": f"Location has reached maximum bin capacity ({location.max_bins})."
                    }
                )

        return data


class StorageBinTemplateListSerializer(serializers.ModelSerializer):
    """Serializer for listing bin templates."""

    class Meta:
        model = StorageBinTemplate
        fields = [
            "id",
            "uuid",
            "name",
            "description",
            "width",
            "height",
            "depth",
            "max_weight_kg",
        ]

"""
Inventory Serializers

Serializers for storage locations, bins, items, and stock.
"""

from rest_framework import serializers

from .models import StorageLocation


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

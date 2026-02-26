"""
Inventory Serializers

Serializers for storage locations, bins, items, and stock.
"""

from rest_framework import serializers

from .models import BinLabelType, StorageLocation, StorageBin, StorageBinTemplate


class StorageLocationListSerializer(serializers.ModelSerializer):
    """Serializer for listing storage locations."""

    zone_name = serializers.CharField(source="zone.name", read_only=True)
    warehouse_name = serializers.CharField(source="zone.warehouse.name", read_only=True)
    bin_count = serializers.IntegerField(read_only=True)

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


class StorageLocationDetailSerializer(serializers.ModelSerializer):
    """Serializer for storage location details."""

    zone_name = serializers.CharField(source="zone.name", read_only=True)
    warehouse_name = serializers.CharField(source="zone.warehouse.name", read_only=True)
    bin_count = serializers.IntegerField(read_only=True)
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

    label_type_name = serializers.CharField(source="label_type.name", read_only=True)
    bin_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = StorageBinTemplate
        fields = [
            "id",
            "uuid",
            "organization",
            "label_type",
            "label_type_name",
            "name",
            "description",
            "width",
            "height",
            "depth",
            "max_weight_kg",
            "coordinate_type",
            "is_active",
            "bin_count",
            "created_at",
            "updated_at",
        ]


class StorageBinTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer for bin template details."""

    label_type_name = serializers.CharField(source="label_type.name", read_only=True)
    label_type_display = serializers.CharField(
        source="label_type.get_label_type_display", read_only=True
    )
    coordinate_type_display = serializers.CharField(
        source="get_coordinate_type_display", read_only=True
    )
    bin_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = StorageBinTemplate
        fields = [
            "id",
            "uuid",
            "organization",
            "label_type",
            "label_type_name",
            "label_type_display",
            "name",
            "description",
            "width",
            "height",
            "depth",
            "max_weight_kg",
            "coordinate_type",
            "coordinate_type_display",
            "config",
            "is_active",
            "bin_count",
            "created_at",
            "updated_at",
        ]


class StorageBinTemplateCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating bin templates."""

    class Meta:
        model = StorageBinTemplate
        fields = [
            "organization",
            "label_type",
            "name",
            "description",
            "width",
            "height",
            "depth",
            "max_weight_kg",
            "coordinate_type",
            "config",
            "is_active",
        ]

    def validate(self, data):
        """Validate template data."""
        organization = data.get("organization") or (
            self.instance.organization if self.instance else None
        )
        name = data.get("name") or (self.instance.name if self.instance else None)

        if organization and name:
            qs = StorageBinTemplate.objects.filter(organization=organization, name=name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"name": "Template name already exists in this organization."}
                )

        return data


# --- Bin Label Type Serializers ---


class BinLabelTypeListSerializer(serializers.ModelSerializer):
    """Serializer for listing bin label types."""

    label_type_display = serializers.CharField(
        source="get_label_type_display", read_only=True
    )
    template_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = BinLabelType
        fields = [
            "id",
            "uuid",
            "organization",
            "name",
            "label_type",
            "label_type_display",
            "dictionary_size",
            "marker_size_mm",
            "is_active",
            "template_count",
            "created_at",
            "updated_at",
        ]


class BinLabelTypeDetailSerializer(serializers.ModelSerializer):
    """Serializer for bin label type details."""

    label_type_display = serializers.CharField(
        source="get_label_type_display", read_only=True
    )
    template_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = BinLabelType
        fields = [
            "id",
            "uuid",
            "organization",
            "name",
            "label_type",
            "label_type_display",
            "dictionary_size",
            "marker_size_mm",
            "config",
            "is_active",
            "template_count",
            "created_at",
            "updated_at",
        ]


class BinLabelTypeCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating bin label types."""

    class Meta:
        model = BinLabelType
        fields = [
            "organization",
            "name",
            "label_type",
            "dictionary_size",
            "marker_size_mm",
            "config",
            "is_active",
        ]

    def validate(self, data):
        """Validate label type data."""
        organization = data.get("organization") or (
            self.instance.organization if self.instance else None
        )
        name = data.get("name") or (self.instance.name if self.instance else None)

        if organization and name:
            qs = BinLabelType.objects.filter(organization=organization, name=name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"name": "Label type name already exists in this organization."}
                )

        return data

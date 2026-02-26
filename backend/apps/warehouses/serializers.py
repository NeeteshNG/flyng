"""
Warehouse API Serializers
"""

from rest_framework import serializers

from apps.warehouses.models import (
    DroneWorkArea,
    GroundControlStation,
    Warehouse,
    WarehouseContact,
    WarehouseProfile,
    WarehouseZone,
)


class WarehouseProfileSerializer(serializers.ModelSerializer):
    """Serializer for WarehouseProfile model."""

    class Meta:
        model = WarehouseProfile
        fields = [
            "id",
            "uuid",
            "operating_hours_start",
            "operating_hours_end",
            "operates_24x7",
            "total_area_sqft",
            "ceiling_height_ft",
            "max_drone_capacity",
            "measurement_standard",
            "currency",
            "date_format",
            "language",
            "emergency_contact_number",
            "safety_clearance_height_ft",
            "max_flight_speed_mps",
            "enable_autonomous_ops",
            "enable_night_ops",
        ]
        read_only_fields = ["id", "uuid"]


class WarehouseContactSerializer(serializers.ModelSerializer):
    """Serializer for WarehouseContact model."""

    class Meta:
        model = WarehouseContact
        fields = [
            "id",
            "uuid",
            "warehouse",
            "name",
            "designation",
            "email",
            "phone_primary",
            "phone_secondary",
            "is_primary",
            "is_emergency",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uuid", "created_at", "updated_at"]


class WarehouseContactCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating WarehouseContact."""

    class Meta:
        model = WarehouseContact
        fields = [
            "name",
            "designation",
            "email",
            "phone_primary",
            "phone_secondary",
            "is_primary",
            "is_emergency",
            "notes",
        ]


class WarehouseListSerializer(serializers.ModelSerializer):
    """Serializer for listing warehouses.

    Note: zone_count and contact_count are annotated in the ViewSet's get_queryset()
    to avoid N+1 queries. They will be populated from the queryset annotation.
    """

    organization_name = serializers.CharField(source="organization.name", read_only=True)
    # These fields are populated by annotations in the queryset
    zone_count = serializers.IntegerField(read_only=True)
    contact_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Warehouse
        fields = [
            "id",
            "uuid",
            "organization",
            "organization_name",
            "name",
            "code",
            "description",
            "city",
            "state",
            "country",
            "timezone",
            "is_active",
            "zone_count",
            "contact_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uuid", "created_at", "updated_at"]


class WarehouseDetailSerializer(serializers.ModelSerializer):
    """Serializer for warehouse detail view."""

    organization_name = serializers.CharField(source="organization.name", read_only=True)
    profile = WarehouseProfileSerializer(read_only=True)
    contacts = WarehouseContactSerializer(many=True, read_only=True)
    full_address = serializers.CharField(read_only=True)
    coordinates = serializers.SerializerMethodField()
    zone_count = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = [
            "id",
            "uuid",
            "organization",
            "organization_name",
            "name",
            "code",
            "description",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "postal_code",
            "country",
            "full_address",
            "latitude",
            "longitude",
            "coordinates",
            "timezone",
            "is_active",
            "profile",
            "contacts",
            "zone_count",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "uuid", "created_at", "updated_at", "created_by", "updated_by"]

    def get_coordinates(self, obj):
        return obj.coordinates

    def get_zone_count(self, obj):
        # Use annotation if available, otherwise fallback to query
        if hasattr(obj, "zone_count"):
            return obj.zone_count
        return obj.zones.filter(is_active=True).count()


class WarehouseCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating warehouses."""

    profile = WarehouseProfileSerializer(required=False)
    contacts = WarehouseContactCreateSerializer(many=True, required=False)

    class Meta:
        model = Warehouse
        fields = [
            "organization",
            "name",
            "code",
            "description",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "postal_code",
            "country",
            "latitude",
            "longitude",
            "timezone",
            "is_active",
            "profile",
            "contacts",
        ]

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", None)
        contacts_data = validated_data.pop("contacts", [])

        warehouse = Warehouse.objects.create(**validated_data)

        # Create profile if provided
        if profile_data:
            WarehouseProfile.objects.create(warehouse=warehouse, **profile_data)

        # Create contacts if provided
        for contact_data in contacts_data:
            WarehouseContact.objects.create(warehouse=warehouse, **contact_data)

        return warehouse

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        contacts_data = validated_data.pop("contacts", None)

        # Update warehouse fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update profile if provided
        if profile_data:
            profile, _ = WarehouseProfile.objects.get_or_create(warehouse=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance


# Zone Serializers
class WarehouseZoneListSerializer(serializers.ModelSerializer):
    """Serializer for listing warehouse zones.

    Note: gcs_count is annotated in the ViewSet's get_queryset() to avoid N+1 queries.
    """

    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    # This field is populated by annotation in the queryset
    gcs_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = WarehouseZone
        fields = [
            "id",
            "uuid",
            "warehouse",
            "warehouse_name",
            "name",
            "code",
            "zone_type",
            "floor_level",
            "area_sqft",
            "max_drones_allowed",
            "priority",
            "is_active",
            "is_no_fly_zone",
            "gcs_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uuid", "created_at", "updated_at"]


class WarehouseZoneDetailSerializer(serializers.ModelSerializer):
    """Serializer for zone detail view."""

    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    bounds = serializers.SerializerMethodField()

    class Meta:
        model = WarehouseZone
        fields = [
            "id",
            "uuid",
            "warehouse",
            "warehouse_name",
            "name",
            "code",
            "description",
            "zone_type",
            "floor_level",
            "area_sqft",
            "min_x",
            "max_x",
            "min_y",
            "max_y",
            "bounds",
            "max_drones_allowed",
            "priority",
            "is_active",
            "is_no_fly_zone",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "uuid", "created_at", "updated_at", "created_by", "updated_by"]

    def get_bounds(self, obj):
        return obj.bounds


class WarehouseZoneCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating zones."""

    class Meta:
        model = WarehouseZone
        fields = [
            "warehouse",
            "name",
            "code",
            "description",
            "zone_type",
            "floor_level",
            "area_sqft",
            "min_x",
            "max_x",
            "min_y",
            "max_y",
            "max_drones_allowed",
            "priority",
            "is_active",
            "is_no_fly_zone",
        ]


# Ground Control Station Serializers
class GroundControlStationListSerializer(serializers.ModelSerializer):
    """Serializer for listing GCS.

    Note: work_area_count is annotated in the ViewSet's get_queryset() to avoid N+1 queries.
    """

    zone_name = serializers.CharField(source="zone.name", read_only=True)
    warehouse_name = serializers.CharField(source="zone.warehouse.name", read_only=True)
    # This field is populated by annotation in the queryset
    work_area_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = GroundControlStation
        fields = [
            "id",
            "uuid",
            "zone",
            "zone_name",
            "warehouse_name",
            "name",
            "code",
            "hardware_id",
            "ip_address",
            "max_drones",
            "status",
            "is_active",
            "last_heartbeat",
            "work_area_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uuid", "created_at", "updated_at"]


class GroundControlStationDetailSerializer(serializers.ModelSerializer):
    """Serializer for GCS detail view."""

    zone_name = serializers.CharField(source="zone.name", read_only=True)
    warehouse_name = serializers.CharField(source="zone.warehouse.name", read_only=True)
    position = serializers.SerializerMethodField()

    class Meta:
        model = GroundControlStation
        fields = [
            "id",
            "uuid",
            "zone",
            "zone_name",
            "warehouse_name",
            "name",
            "code",
            "description",
            "x_position",
            "y_position",
            "z_position",
            "position",
            "hardware_id",
            "ip_address",
            "firmware_version",
            "max_drones",
            "status",
            "is_active",
            "last_heartbeat",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "uuid", "created_at", "updated_at", "created_by", "updated_by"]

    def get_position(self, obj):
        return obj.position


class GroundControlStationCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating GCS."""

    class Meta:
        model = GroundControlStation
        fields = [
            "zone",
            "name",
            "code",
            "description",
            "x_position",
            "y_position",
            "z_position",
            "hardware_id",
            "ip_address",
            "firmware_version",
            "max_drones",
            "status",
            "is_active",
        ]


# Drone Work Area Serializers
class DroneWorkAreaListSerializer(serializers.ModelSerializer):
    """Serializer for listing work areas."""

    gcs_name = serializers.CharField(source="ground_control_station.name", read_only=True)
    zone_name = serializers.CharField(source="ground_control_station.zone.name", read_only=True)
    warehouse_name = serializers.CharField(
        source="ground_control_station.zone.warehouse.name", read_only=True
    )

    class Meta:
        model = DroneWorkArea
        fields = [
            "id",
            "uuid",
            "ground_control_station",
            "gcs_name",
            "zone_name",
            "warehouse_name",
            "name",
            "code",
            "area_type",
            "max_drones",
            "max_flight_speed_mps",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uuid", "created_at", "updated_at"]


class DroneWorkAreaDetailSerializer(serializers.ModelSerializer):
    """Serializer for work area detail view."""

    gcs_name = serializers.CharField(source="ground_control_station.name", read_only=True)
    zone_name = serializers.CharField(source="ground_control_station.zone.name", read_only=True)
    warehouse_name = serializers.CharField(
        source="ground_control_station.zone.warehouse.name", read_only=True
    )
    bounds = serializers.SerializerMethodField()
    tether_anchor = serializers.SerializerMethodField()

    class Meta:
        model = DroneWorkArea
        fields = [
            "id",
            "uuid",
            "ground_control_station",
            "gcs_name",
            "zone_name",
            "warehouse_name",
            "name",
            "code",
            "description",
            "area_type",
            "min_x",
            "max_x",
            "min_y",
            "max_y",
            "min_z",
            "max_z",
            "bounds",
            "tether_length_m",
            "tether_anchor_x",
            "tether_anchor_y",
            "tether_anchor_z",
            "tether_anchor",
            "max_flight_speed_mps",
            "max_drones",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "uuid", "created_at", "updated_at", "created_by", "updated_by"]

    def get_bounds(self, obj):
        return obj.bounds

    def get_tether_anchor(self, obj):
        return obj.tether_anchor


class DroneWorkAreaCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating work areas."""

    class Meta:
        model = DroneWorkArea
        fields = [
            "ground_control_station",
            "name",
            "code",
            "description",
            "area_type",
            "min_x",
            "max_x",
            "min_y",
            "max_y",
            "min_z",
            "max_z",
            "tether_length_m",
            "tether_anchor_x",
            "tether_anchor_y",
            "tether_anchor_z",
            "max_flight_speed_mps",
            "max_drones",
            "is_active",
        ]

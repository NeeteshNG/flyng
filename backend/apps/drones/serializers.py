"""
Drone Serializers

Serializers for drones, telemetry logs, and maintenance records.
"""

from rest_framework import serializers

from .models import Drone, DroneMaintenanceRecord, DroneTelemetryLog


# --- Drone Serializers ---


class DroneListSerializer(serializers.ModelSerializer):
    """Serializer for listing drones."""

    work_area_name = serializers.CharField(source="work_area.name", read_only=True)
    work_area_code = serializers.CharField(source="work_area.code", read_only=True)
    gcs_name = serializers.CharField(
        source="work_area.ground_control_station.name", read_only=True
    )
    zone_name = serializers.CharField(
        source="work_area.ground_control_station.zone.name", read_only=True
    )
    warehouse_name = serializers.CharField(
        source="work_area.ground_control_station.zone.warehouse.name", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    autonomy_display = serializers.CharField(
        source="get_autonomy_mode_display", read_only=True
    )
    battery_name = serializers.CharField(
        source="current_battery.name", read_only=True, default=None
    )
    maintenance_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Drone
        fields = [
            "id",
            "uuid",
            "work_area",
            "work_area_name",
            "work_area_code",
            "gcs_name",
            "zone_name",
            "warehouse_name",
            "serial_number",
            "name",
            "model",
            "manufacturer",
            "status",
            "status_display",
            "autonomy_mode",
            "autonomy_display",
            "current_battery",
            "battery_name",
            "firmware_version",
            "total_flight_hours",
            "total_flights",
            "total_distance_km",
            "last_heartbeat",
            "is_active",
            "maintenance_count",
            "created_at",
            "updated_at",
        ]


class DroneDetailSerializer(serializers.ModelSerializer):
    """Serializer for drone details."""

    work_area_name = serializers.CharField(source="work_area.name", read_only=True)
    work_area_code = serializers.CharField(source="work_area.code", read_only=True)
    gcs_name = serializers.CharField(
        source="work_area.ground_control_station.name", read_only=True
    )
    gcs_code = serializers.CharField(
        source="work_area.ground_control_station.code", read_only=True
    )
    zone_name = serializers.CharField(
        source="work_area.ground_control_station.zone.name", read_only=True
    )
    warehouse_name = serializers.CharField(
        source="work_area.ground_control_station.zone.warehouse.name", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    autonomy_display = serializers.CharField(
        source="get_autonomy_mode_display", read_only=True
    )
    battery_name = serializers.CharField(
        source="current_battery.name", read_only=True, default=None
    )
    is_online = serializers.ReadOnlyField()
    home_position = serializers.ReadOnlyField()
    maintenance_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Drone
        fields = [
            "id",
            "uuid",
            "work_area",
            "work_area_name",
            "work_area_code",
            "gcs_name",
            "gcs_code",
            "zone_name",
            "warehouse_name",
            "serial_number",
            "name",
            "model",
            "manufacturer",
            "firmware_version",
            "hardware_version",
            "status",
            "status_display",
            "autonomy_mode",
            "autonomy_display",
            "current_battery",
            "battery_name",
            "home_x",
            "home_y",
            "home_z",
            "home_position",
            "ip_address",
            "last_heartbeat",
            "is_online",
            "max_payload_kg",
            "max_flight_time_min",
            "total_flight_hours",
            "total_flights",
            "total_distance_km",
            "last_maintenance_at",
            "next_maintenance_due",
            "is_active",
            "maintenance_count",
            "created_at",
            "updated_at",
        ]


class DroneCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating drones."""

    class Meta:
        model = Drone
        fields = [
            "work_area",
            "serial_number",
            "name",
            "model",
            "manufacturer",
            "firmware_version",
            "hardware_version",
            "status",
            "autonomy_mode",
            "home_x",
            "home_y",
            "home_z",
            "ip_address",
            "max_payload_kg",
            "max_flight_time_min",
            "is_active",
        ]

    def validate(self, data):
        """Validate drone data."""
        serial_number = data.get("serial_number") or (
            self.instance.serial_number if self.instance else None
        )

        if serial_number:
            qs = Drone.objects.filter(serial_number=serial_number)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"serial_number": "Serial number already exists."}
                )

        return data


# --- Telemetry Log Serializers ---


class DroneTelemetryLogListSerializer(serializers.ModelSerializer):
    """Serializer for listing telemetry logs."""

    drone_name = serializers.CharField(source="drone.name", read_only=True)
    drone_serial = serializers.CharField(source="drone.serial_number", read_only=True)
    flight_mode_display = serializers.CharField(
        source="get_flight_mode_display", read_only=True
    )

    class Meta:
        model = DroneTelemetryLog
        fields = [
            "id",
            "uuid",
            "drone",
            "drone_name",
            "drone_serial",
            "timestamp",
            "flight_mode",
            "flight_mode_display",
            "position_x",
            "position_y",
            "position_z",
            "ground_speed",
            "battery_percentage",
            "battery_voltage",
            "rssi",
            "temperature",
            "created_at",
        ]


class DroneTelemetryLogDetailSerializer(serializers.ModelSerializer):
    """Serializer for telemetry log details."""

    drone_name = serializers.CharField(source="drone.name", read_only=True)
    drone_serial = serializers.CharField(source="drone.serial_number", read_only=True)
    flight_mode_display = serializers.CharField(
        source="get_flight_mode_display", read_only=True
    )
    position = serializers.ReadOnlyField()
    velocity = serializers.ReadOnlyField()
    attitude = serializers.ReadOnlyField()

    class Meta:
        model = DroneTelemetryLog
        fields = [
            "id",
            "uuid",
            "drone",
            "drone_name",
            "drone_serial",
            "timestamp",
            "flight_mode",
            "flight_mode_display",
            "position_x",
            "position_y",
            "position_z",
            "position",
            "velocity_x",
            "velocity_y",
            "velocity_z",
            "velocity",
            "roll",
            "pitch",
            "yaw",
            "attitude",
            "battery_voltage",
            "battery_percentage",
            "battery_current",
            "ground_speed",
            "air_speed",
            "temperature",
            "rssi",
            "sensor_data",
            "created_at",
        ]


class DroneTelemetryLogCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating telemetry logs (append-only)."""

    class Meta:
        model = DroneTelemetryLog
        fields = [
            "drone",
            "timestamp",
            "flight_mode",
            "position_x",
            "position_y",
            "position_z",
            "velocity_x",
            "velocity_y",
            "velocity_z",
            "roll",
            "pitch",
            "yaw",
            "battery_voltage",
            "battery_percentage",
            "battery_current",
            "ground_speed",
            "air_speed",
            "temperature",
            "rssi",
            "sensor_data",
        ]


# --- Maintenance Record Serializers ---


class DroneMaintenanceRecordListSerializer(serializers.ModelSerializer):
    """Serializer for listing maintenance records."""

    drone_name = serializers.CharField(source="drone.name", read_only=True)
    drone_serial = serializers.CharField(source="drone.serial_number", read_only=True)
    performed_by_name = serializers.CharField(
        source="performed_by.get_full_name", read_only=True, default=None
    )
    maintenance_type_display = serializers.CharField(
        source="get_maintenance_type_display", read_only=True
    )
    is_completed = serializers.ReadOnlyField()

    class Meta:
        model = DroneMaintenanceRecord
        fields = [
            "id",
            "uuid",
            "drone",
            "drone_name",
            "drone_serial",
            "performed_by",
            "performed_by_name",
            "maintenance_type",
            "maintenance_type_display",
            "title",
            "scheduled_at",
            "started_at",
            "completed_at",
            "downtime_minutes",
            "cost",
            "is_completed",
            "created_at",
        ]


class DroneMaintenanceRecordDetailSerializer(serializers.ModelSerializer):
    """Serializer for maintenance record details."""

    drone_name = serializers.CharField(source="drone.name", read_only=True)
    drone_serial = serializers.CharField(source="drone.serial_number", read_only=True)
    performed_by_name = serializers.CharField(
        source="performed_by.get_full_name", read_only=True, default=None
    )
    maintenance_type_display = serializers.CharField(
        source="get_maintenance_type_display", read_only=True
    )
    is_completed = serializers.ReadOnlyField()
    duration_minutes = serializers.ReadOnlyField()

    class Meta:
        model = DroneMaintenanceRecord
        fields = [
            "id",
            "uuid",
            "drone",
            "drone_name",
            "drone_serial",
            "performed_by",
            "performed_by_name",
            "maintenance_type",
            "maintenance_type_display",
            "title",
            "description",
            "parts_replaced",
            "cost",
            "scheduled_at",
            "started_at",
            "completed_at",
            "downtime_minutes",
            "flight_hours_at_maintenance",
            "flights_at_maintenance",
            "notes",
            "is_completed",
            "duration_minutes",
            "created_at",
        ]


class DroneMaintenanceRecordCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating maintenance records."""

    class Meta:
        model = DroneMaintenanceRecord
        fields = [
            "drone",
            "performed_by",
            "maintenance_type",
            "title",
            "description",
            "parts_replaced",
            "cost",
            "scheduled_at",
            "started_at",
            "completed_at",
            "downtime_minutes",
            "flight_hours_at_maintenance",
            "flights_at_maintenance",
            "notes",
        ]

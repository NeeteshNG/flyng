"""
Battery Serializers

Serializers for drone batteries, charging sessions, and swap records.
"""

from rest_framework import serializers

from .models import BatteryChargingSession, BatterySwapRecord, DroneBattery


# --- DroneBattery Serializers ---


class DroneBatteryListSerializer(serializers.ModelSerializer):
    """Serializer for listing batteries."""

    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    health_display = serializers.CharField(source="get_health_status_display", read_only=True)
    chemistry_display = serializers.CharField(source="get_chemistry_display", read_only=True)
    health_percentage = serializers.ReadOnlyField()
    cycles_remaining = serializers.ReadOnlyField()
    is_low_charge = serializers.ReadOnlyField()
    needs_replacement = serializers.ReadOnlyField()
    charging_sessions_count = serializers.IntegerField(read_only=True)
    swaps_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DroneBattery
        fields = [
            "id",
            "uuid",
            "serial_number",
            "name",
            "warehouse",
            "warehouse_name",
            "chemistry",
            "chemistry_display",
            "capacity_mah",
            "current_capacity_mah",
            "voltage_nominal",
            "cell_count",
            "status",
            "status_display",
            "health_status",
            "health_display",
            "current_charge_percent",
            "cycle_count",
            "max_cycles",
            "health_percentage",
            "cycles_remaining",
            "is_low_charge",
            "needs_replacement",
            "manufacturer",
            "model_number",
            "last_charged_at",
            "is_active",
            "charging_sessions_count",
            "swaps_count",
            "created_at",
            "updated_at",
        ]


class DroneBatteryDetailSerializer(serializers.ModelSerializer):
    """Serializer for battery details."""

    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    health_display = serializers.CharField(source="get_health_status_display", read_only=True)
    chemistry_display = serializers.CharField(source="get_chemistry_display", read_only=True)
    health_percentage = serializers.ReadOnlyField()
    cycles_remaining = serializers.ReadOnlyField()
    is_low_charge = serializers.ReadOnlyField()
    needs_replacement = serializers.ReadOnlyField()
    charging_sessions_count = serializers.IntegerField(read_only=True)
    swaps_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DroneBattery
        fields = [
            "id",
            "uuid",
            "serial_number",
            "name",
            "warehouse",
            "warehouse_name",
            "chemistry",
            "chemistry_display",
            "capacity_mah",
            "current_capacity_mah",
            "voltage_nominal",
            "cell_count",
            "status",
            "status_display",
            "health_status",
            "health_display",
            "current_charge_percent",
            "cycle_count",
            "max_cycles",
            "health_percentage",
            "cycles_remaining",
            "is_low_charge",
            "needs_replacement",
            "purchase_date",
            "warranty_expires_at",
            "last_charged_at",
            "last_health_check_at",
            "manufacturer",
            "model_number",
            "notes",
            "is_active",
            "charging_sessions_count",
            "swaps_count",
            "created_at",
            "updated_at",
        ]


class DroneBatteryCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating batteries."""

    class Meta:
        model = DroneBattery
        fields = [
            "serial_number",
            "name",
            "warehouse",
            "chemistry",
            "capacity_mah",
            "current_capacity_mah",
            "voltage_nominal",
            "cell_count",
            "status",
            "health_status",
            "current_charge_percent",
            "cycle_count",
            "max_cycles",
            "purchase_date",
            "warranty_expires_at",
            "last_charged_at",
            "last_health_check_at",
            "manufacturer",
            "model_number",
            "notes",
            "is_active",
        ]

    def validate(self, data):
        """Validate battery data."""
        serial_number = data.get("serial_number") or (
            self.instance.serial_number if self.instance else None
        )

        if serial_number:
            qs = DroneBattery.objects.filter(serial_number=serial_number)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"serial_number": "Serial number already exists."}
                )

        return data


# --- BatteryChargingSession Serializers ---


class BatteryChargingSessionListSerializer(serializers.ModelSerializer):
    """Serializer for listing charging sessions."""

    battery_name = serializers.CharField(source="battery.name", read_only=True)
    battery_serial = serializers.CharField(source="battery.serial_number", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    duration_minutes = serializers.ReadOnlyField()
    charge_gained = serializers.ReadOnlyField()

    class Meta:
        model = BatteryChargingSession
        fields = [
            "id",
            "uuid",
            "battery",
            "battery_name",
            "battery_serial",
            "charger_id",
            "started_at",
            "ended_at",
            "status",
            "status_display",
            "start_charge_percent",
            "end_charge_percent",
            "duration_minutes",
            "charge_gained",
            "created_at",
        ]


class BatteryChargingSessionDetailSerializer(serializers.ModelSerializer):
    """Serializer for charging session details."""

    battery_name = serializers.CharField(source="battery.name", read_only=True)
    battery_serial = serializers.CharField(source="battery.serial_number", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    duration_minutes = serializers.ReadOnlyField()
    charge_gained = serializers.ReadOnlyField()

    class Meta:
        model = BatteryChargingSession
        fields = [
            "id",
            "uuid",
            "battery",
            "battery_name",
            "battery_serial",
            "charger_id",
            "charger_location",
            "started_at",
            "ended_at",
            "status",
            "status_display",
            "start_charge_percent",
            "end_charge_percent",
            "start_voltage",
            "end_voltage",
            "energy_consumed_wh",
            "peak_charging_rate_amps",
            "temperature_start_c",
            "temperature_max_c",
            "error_code",
            "error_message",
            "notes",
            "duration_minutes",
            "charge_gained",
            "created_at",
        ]


class BatteryChargingSessionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating charging sessions (append-only)."""

    class Meta:
        model = BatteryChargingSession
        fields = [
            "battery",
            "charger_id",
            "charger_location",
            "started_at",
            "ended_at",
            "status",
            "start_charge_percent",
            "end_charge_percent",
            "start_voltage",
            "end_voltage",
            "energy_consumed_wh",
            "peak_charging_rate_amps",
            "temperature_start_c",
            "temperature_max_c",
            "error_code",
            "error_message",
            "notes",
        ]


# --- BatterySwapRecord Serializers ---


class BatterySwapRecordListSerializer(serializers.ModelSerializer):
    """Serializer for listing swap records."""

    drone_name = serializers.CharField(source="drone.name", read_only=True)
    drone_serial = serializers.CharField(source="drone.serial_number", read_only=True)
    old_battery_name = serializers.CharField(
        source="old_battery.name", read_only=True, default=None
    )
    old_battery_serial = serializers.CharField(
        source="old_battery.serial_number", read_only=True, default=None
    )
    new_battery_name = serializers.CharField(source="new_battery.name", read_only=True)
    new_battery_serial = serializers.CharField(
        source="new_battery.serial_number", read_only=True
    )
    swap_reason_display = serializers.CharField(
        source="get_swap_reason_display", read_only=True
    )
    performed_by_name = serializers.CharField(
        source="performed_by.get_full_name", read_only=True, default=None
    )

    class Meta:
        model = BatterySwapRecord
        fields = [
            "id",
            "uuid",
            "drone",
            "drone_name",
            "drone_serial",
            "old_battery",
            "old_battery_name",
            "old_battery_serial",
            "new_battery",
            "new_battery_name",
            "new_battery_serial",
            "swapped_at",
            "swap_reason",
            "swap_reason_display",
            "performed_by",
            "performed_by_name",
            "old_battery_charge",
            "new_battery_charge",
            "location",
            "swap_duration_seconds",
            "created_at",
        ]


class BatterySwapRecordDetailSerializer(serializers.ModelSerializer):
    """Serializer for swap record details."""

    drone_name = serializers.CharField(source="drone.name", read_only=True)
    drone_serial = serializers.CharField(source="drone.serial_number", read_only=True)
    old_battery_name = serializers.CharField(
        source="old_battery.name", read_only=True, default=None
    )
    old_battery_serial = serializers.CharField(
        source="old_battery.serial_number", read_only=True, default=None
    )
    new_battery_name = serializers.CharField(source="new_battery.name", read_only=True)
    new_battery_serial = serializers.CharField(
        source="new_battery.serial_number", read_only=True
    )
    swap_reason_display = serializers.CharField(
        source="get_swap_reason_display", read_only=True
    )
    performed_by_name = serializers.CharField(
        source="performed_by.get_full_name", read_only=True, default=None
    )

    class Meta:
        model = BatterySwapRecord
        fields = [
            "id",
            "uuid",
            "drone",
            "drone_name",
            "drone_serial",
            "old_battery",
            "old_battery_name",
            "old_battery_serial",
            "new_battery",
            "new_battery_name",
            "new_battery_serial",
            "swapped_at",
            "swap_reason",
            "swap_reason_display",
            "performed_by",
            "performed_by_name",
            "old_battery_charge",
            "new_battery_charge",
            "location",
            "swap_duration_seconds",
            "notes",
            "created_at",
        ]


class BatterySwapRecordCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating swap records (append-only)."""

    class Meta:
        model = BatterySwapRecord
        fields = [
            "drone",
            "old_battery",
            "new_battery",
            "swapped_at",
            "swap_reason",
            "performed_by",
            "old_battery_charge",
            "new_battery_charge",
            "location",
            "swap_duration_seconds",
            "notes",
        ]

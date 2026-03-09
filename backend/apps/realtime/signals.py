"""
Real-time broadcast signals.

Triggers WebSocket broadcasts when drone telemetry, job status,
or notifications change. Uses string-based sender references
to avoid circular imports.
"""

import logging
import threading

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .broadcast import broadcast

logger = logging.getLogger(__name__)

# Thread-local storage for previous state (same pattern as notifications/signals.py)
_previous_state = threading.local()


def _store_previous(model_name, pk, **fields):
    if not hasattr(_previous_state, "data"):
        _previous_state.data = {}
    _previous_state.data[f"{model_name}_{pk}"] = fields


def _get_previous(model_name, pk):
    if not hasattr(_previous_state, "data"):
        return None
    return _previous_state.data.pop(f"{model_name}_{pk}", None)


def _decimal_to_float(value):
    """Convert Decimal to float for JSON serialization, or return None."""
    if value is None:
        return None
    return float(value)


# =============================================================================
# Drone Telemetry Broadcasts
# =============================================================================


@receiver(post_save, sender="drones.DroneTelemetryLog")
def broadcast_telemetry(sender, instance, created, **kwargs):
    """Broadcast new telemetry data to the drone's organization channel."""
    if not created:
        return

    try:
        drone = instance.drone
        org_id = drone.work_area.ground_control_station.zone.warehouse.organization_id
    except Exception:
        logger.debug("Could not resolve org for telemetry broadcast: drone=%s", instance.drone_id)
        return

    broadcast(f"org_{org_id}_telemetry", {
        "type": "telemetry_update",
        "data": {
            "type": "telemetry",
            "drone_id": drone.id,
            "drone_name": drone.name,
            "status": drone.status,
            "position_x": _decimal_to_float(instance.position_x),
            "position_y": _decimal_to_float(instance.position_y),
            "position_z": _decimal_to_float(instance.position_z),
            "battery_percentage": instance.battery_percentage,
            "ground_speed": _decimal_to_float(instance.ground_speed),
            "flight_mode": instance.flight_mode,
            "rssi": instance.rssi,
            "timestamp": instance.timestamp.isoformat(),
        },
    })


# =============================================================================
# Drone Status Broadcasts
# =============================================================================


@receiver(pre_save, sender="drones.Drone")
def capture_drone_previous_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            _store_previous("Drone", instance.pk, status=old.status)
        except sender.DoesNotExist:
            pass


@receiver(post_save, sender="drones.Drone")
def broadcast_drone_status_change(sender, instance, created, **kwargs):
    """Broadcast drone status changes to the telemetry channel."""
    if created:
        return

    previous = _get_previous("Drone", instance.pk)
    if not previous or previous.get("status") == instance.status:
        return

    try:
        org_id = instance.work_area.ground_control_station.zone.warehouse.organization_id
    except Exception:
        return

    broadcast(f"org_{org_id}_telemetry", {
        "type": "drone_status_update",
        "data": {
            "type": "drone_status",
            "drone_id": instance.id,
            "drone_name": instance.name,
            "status": instance.status,
            "old_status": previous["status"],
            "is_active": instance.is_active,
        },
    })


# =============================================================================
# Job Status Broadcasts
# =============================================================================


@receiver(pre_save, sender="jobs.DroneJob")
def capture_job_previous_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            _store_previous("DroneJob", instance.pk, status=old.status)
        except sender.DoesNotExist:
            pass


@receiver(post_save, sender="jobs.DroneJob")
def broadcast_job_status_change(sender, instance, created, **kwargs):
    """Broadcast job status changes."""
    if created:
        # Broadcast new job creation too
        broadcast(f"org_{instance.organization_id}_jobs", {
            "type": "job_update",
            "data": {
                "type": "job_created",
                "job_id": instance.id,
                "job_number": instance.job_number,
                "status": instance.status,
                "status_display": instance.get_status_display(),
                "drone_name": instance.drone.name if instance.drone else None,
            },
        })
        return

    previous = _get_previous("DroneJob", instance.pk)
    if not previous or previous.get("status") == instance.status:
        return

    broadcast(f"org_{instance.organization_id}_jobs", {
        "type": "job_update",
        "data": {
            "type": "job_update",
            "job_id": instance.id,
            "job_number": instance.job_number,
            "status": instance.status,
            "status_display": instance.get_status_display(),
            "old_status": previous["status"],
            "drone_name": instance.drone.name if instance.drone else None,
        },
    })


# =============================================================================
# Notification Broadcasts
# =============================================================================


@receiver(post_save, sender="notifications.Notification")
def broadcast_notification(sender, instance, created, **kwargs):
    """Broadcast new notifications via WebSocket."""
    if not created:
        return

    notification_data = {
        "type": "notification",
        "uuid": str(instance.uuid),
        "notification_type": instance.notification_type,
        "title": instance.title,
        "message": instance.message,
        "priority": instance.priority,
        "link": instance.link or "",
        "created_at": instance.created_at.isoformat(),
    }

    # Broadcast to user-specific group
    if instance.user_id:
        broadcast(f"user_{instance.user_id}_notifications", {
            "type": "new_notification",
            "data": notification_data,
        })

    # Also broadcast to org-wide group (notification center can dedupe)
    broadcast(f"org_{instance.organization_id}_notifications", {
        "type": "new_notification",
        "data": notification_data,
    })

"""
Notification Signals

Automatically creates notifications when key events occur.
Uses string-based sender references to avoid circular imports.
Uses pre_save to capture previous state, post_save to detect transitions.
"""

import logging
import threading

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.core.choices import (
    ImportStatus,
    JobStatus,
    NotificationPriority,
    NotificationType,
)

from .models import Notification
from .templates import render_notification

logger = logging.getLogger(__name__)

# Thread-local storage for previous state
_previous_state = threading.local()


def _store_previous(model_name, pk, **fields):
    if not hasattr(_previous_state, "data"):
        _previous_state.data = {}
    _previous_state.data[f"{model_name}_{pk}"] = fields


def _get_previous(model_name, pk):
    if not hasattr(_previous_state, "data"):
        return None
    return _previous_state.data.pop(f"{model_name}_{pk}", None)


# =============================================================================
# Order Signals
# =============================================================================


@receiver(pre_save, sender="orders.PickOrder")
def capture_order_previous_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            _store_previous("PickOrder", instance.pk, status=old.status)
        except sender.DoesNotExist:
            pass


@receiver(post_save, sender="orders.PickOrder")
def notify_order_status_changed(sender, instance, created, **kwargs):
    if created:
        return

    previous = _get_previous("PickOrder", instance.pk)
    if not previous or previous.get("status") == instance.status:
        return

    title, message = render_notification(
        "ORDER_STATUS_CHANGED",
        order_number=instance.order_number,
        old_status=previous["status"],
        new_status=instance.get_status_display(),
    )

    priority = NotificationPriority.NORMAL
    if instance.status in ("CANCELLED", "ON_HOLD"):
        priority = NotificationPriority.HIGH

    Notification.objects.notify_org_admins(
        organization=instance.organization,
        notification_type=NotificationType.ORDER_STATUS_CHANGED,
        title=title,
        message=message,
        priority=priority,
        link="/dashboard/orders",
        source_type="PickOrder",
        source_id=str(instance.uuid),
    )

    # Also notify assigned user if not already covered
    if instance.assigned_to:
        Notification.objects.create_notification(
            organization=instance.organization,
            user=instance.assigned_to,
            notification_type=NotificationType.ORDER_STATUS_CHANGED,
            title=title,
            message=message,
            priority=priority,
            link="/dashboard/orders",
            source_type="PickOrder",
            source_id=str(instance.uuid),
        )


# =============================================================================
# Job Signals
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
def notify_job_completion_or_failure(sender, instance, created, **kwargs):
    if created:
        return

    previous = _get_previous("DroneJob", instance.pk)
    if not previous or previous.get("status") == instance.status:
        return

    if instance.status == JobStatus.COMPLETED:
        title, message = render_notification(
            "JOB_COMPLETED",
            job_number=instance.job_number,
        )
        Notification.objects.notify_org_admins(
            organization=instance.organization,
            notification_type=NotificationType.JOB_COMPLETED,
            title=title,
            message=message,
            priority=NotificationPriority.LOW,
            link="/dashboard/jobs",
            source_type="DroneJob",
            source_id=str(instance.uuid),
        )

    elif instance.status == JobStatus.FAILED:
        error_detail = f" Error: {instance.error_message}" if instance.error_message else ""
        title, message = render_notification(
            "JOB_FAILED",
            job_number=instance.job_number,
            error_detail=error_detail,
        )
        Notification.objects.notify_org_admins(
            organization=instance.organization,
            notification_type=NotificationType.JOB_FAILED,
            title=title,
            message=message,
            priority=NotificationPriority.HIGH,
            link="/dashboard/jobs",
            source_type="DroneJob",
            source_id=str(instance.uuid),
        )


# =============================================================================
# Import Job Signals
# =============================================================================


@receiver(pre_save, sender="core.ImportJob")
def capture_import_previous_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            _store_previous("ImportJob", instance.pk, status=old.status)
        except sender.DoesNotExist:
            pass


@receiver(post_save, sender="core.ImportJob")
def notify_import_result(sender, instance, created, **kwargs):
    if created:
        return

    previous = _get_previous("ImportJob", instance.pk)
    if not previous or previous.get("status") == instance.status:
        return

    if not instance.created_by:
        return

    if instance.status in (ImportStatus.COMPLETED, ImportStatus.COMPLETED_WITH_ERRORS):
        suffix = ""
        if instance.status == ImportStatus.COMPLETED_WITH_ERRORS:
            suffix = f" ({instance.error_count} errors)"

        title, message = render_notification(
            "IMPORT_COMPLETED",
            import_type=instance.get_import_type_display(),
            filename=instance.original_filename,
            success_count=instance.success_count,
            suffix=suffix,
        )

        Notification.objects.create_notification(
            organization=instance.organization,
            user=instance.created_by,
            notification_type=NotificationType.IMPORT_COMPLETED,
            title=title,
            message=message,
            priority=NotificationPriority.NORMAL,
            link="/dashboard/activity",
            source_type="ImportJob",
            source_id=str(instance.uuid),
        )

    elif instance.status == ImportStatus.FAILED:
        title, message = render_notification(
            "IMPORT_FAILED",
            import_type=instance.get_import_type_display(),
            filename=instance.original_filename,
            error_message=instance.error_message or "Unknown error",
        )

        Notification.objects.create_notification(
            organization=instance.organization,
            user=instance.created_by,
            notification_type=NotificationType.IMPORT_FAILED,
            title=title,
            message=message,
            priority=NotificationPriority.HIGH,
            link="/dashboard/activity",
            source_type="ImportJob",
            source_id=str(instance.uuid),
        )


# =============================================================================
# Membership Signals
# =============================================================================


@receiver(post_save, sender="organizations.OrganizationMembership")
def notify_new_member_joined(sender, instance, created, **kwargs):
    if not created:
        return

    user_name = instance.user.get_full_name() or instance.user.email
    title, message = render_notification(
        "NEW_MEMBER_JOINED",
        user_name=user_name,
    )

    Notification.objects.notify_org_admins(
        organization=instance.organization,
        notification_type=NotificationType.NEW_MEMBER_JOINED,
        title=title,
        message=message,
        priority=NotificationPriority.LOW,
        link="/dashboard/users",
        source_type="OrganizationMembership",
        source_id=str(instance.uuid),
        exclude_user=instance.user,
    )

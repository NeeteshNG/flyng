"""
Notification Message Templates

Centralized, translatable notification templates.
Each template uses Python format placeholders ({key}) that are filled
with dynamic values at notification-creation time.

Uses gettext (not gettext_lazy) because notifications are rendered
immediately in signal handlers — the translation must be materialized
at call time based on the active language.
"""

from django.utils.translation import gettext as _

# =============================================================================
# Template Definitions
# =============================================================================

NOTIFICATION_TEMPLATES = {
    # ----- Order Notifications -----

    # Translators: Notification when an order's status changes
    "ORDER_STATUS_CHANGED": {
        "title": "Order {order_number} status changed",
        "message": "Order {order_number} changed from {old_status} to {new_status}.",
    },

    # ----- Job Notifications -----

    # Translators: Notification when a drone job completes successfully
    "JOB_COMPLETED": {
        "title": "Job {job_number} completed",
        "message": "Drone job {job_number} completed successfully.",
    },
    # Translators: Notification when a drone job fails
    "JOB_FAILED": {
        "title": "Job {job_number} failed",
        "message": "Drone job {job_number} has failed.{error_detail}",
    },

    # ----- Import Notifications -----

    # Translators: Notification when a CSV/data import finishes
    "IMPORT_COMPLETED": {
        "title": "Import completed{suffix}",
        "message": "{import_type} import '{filename}' finished. {success_count} rows imported{suffix}.",
    },
    # Translators: Notification when a CSV/data import fails
    "IMPORT_FAILED": {
        "title": "Import failed",
        "message": "{import_type} import '{filename}' failed. {error_message}.",
    },

    # ----- Membership Notifications -----

    # Translators: Notification when a new user joins the organization
    "NEW_MEMBER_JOINED": {
        "title": "New member joined",
        "message": "{user_name} has joined the organization.",
    },
}


def render_notification(notification_type, **context):
    """
    Render title and message for a notification type with i18n support.

    The English template string is looked up in the NOTIFICATION_TEMPLATES dict,
    passed through gettext for translation, then .format() fills in the
    dynamic placeholders.

    Args:
        notification_type: Key from NOTIFICATION_TEMPLATES (e.g. "ORDER_STATUS_CHANGED")
        **context: Template variables (e.g. order_number="ORD-001")

    Returns:
        tuple[str, str]: (title, message)
    """
    template = NOTIFICATION_TEMPLATES[notification_type]
    title = _(template["title"]).format(**context)
    message = _(template["message"]).format(**context)
    return title, message

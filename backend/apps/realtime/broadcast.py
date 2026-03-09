"""
Broadcast helper for sending messages to channel groups from synchronous code.
"""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def broadcast(group_name, message):
    """
    Send a message to a channel group from synchronous Django code.

    Args:
        group_name: The channel group name (e.g., "org_5_telemetry")
        message: Dict with at least a "type" key matching the consumer handler
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        logger.warning("No channel layer configured — skipping broadcast to %s", group_name)
        return

    try:
        async_to_sync(channel_layer.group_send)(group_name, message)
    except Exception:
        logger.exception("Failed to broadcast to group %s", group_name)

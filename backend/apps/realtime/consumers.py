"""
WebSocket consumers for real-time communication.

Three separate consumers for different domains:
- TelemetryConsumer: Live drone telemetry updates (~1Hz per active drone)
- JobConsumer: Drone job status change events
- NotificationConsumer: Push notifications (replaces polling)
"""

import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class TelemetryConsumer(AsyncJsonWebsocketConsumer):
    """
    Streams live drone telemetry to connected dashboard clients.

    Group: org_{org_id}_telemetry
    Read-only — clients receive updates but don't send messages.
    """

    async def connect(self):
        self.org_id = self.scope.get("org_id")
        if not self.org_id:
            await self.close(code=4001)
            return

        self.group_name = f"org_{self.org_id}_telemetry"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.debug("Telemetry WebSocket connected: user=%s org=%s", self.scope["user"].id, self.org_id)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def telemetry_update(self, event):
        """Handle telemetry broadcast from signals."""
        await self.send_json(event["data"])

    async def drone_status_update(self, event):
        """Handle drone status change broadcast."""
        await self.send_json(event["data"])


class JobConsumer(AsyncJsonWebsocketConsumer):
    """
    Pushes drone job status changes to connected clients.

    Group: org_{org_id}_jobs
    """

    async def connect(self):
        self.org_id = self.scope.get("org_id")
        if not self.org_id:
            await self.close(code=4001)
            return

        self.group_name = f"org_{self.org_id}_jobs"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.debug("Jobs WebSocket connected: user=%s org=%s", self.scope["user"].id, self.org_id)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def job_update(self, event):
        """Handle job status change broadcast."""
        await self.send_json(event["data"])


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Pushes new notifications to connected clients.

    Groups:
    - org_{org_id}_notifications — org-wide notifications
    - user_{user_id}_notifications — user-specific notifications
    """

    async def connect(self):
        self.org_id = self.scope.get("org_id")
        self.user_id = self.scope["user"].id
        if not self.org_id:
            await self.close(code=4001)
            return

        self.org_group = f"org_{self.org_id}_notifications"
        self.user_group = f"user_{self.user_id}_notifications"

        await self.channel_layer.group_add(self.org_group, self.channel_name)
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()
        logger.debug(
            "Notifications WebSocket connected: user=%s org=%s", self.user_id, self.org_id
        )

    async def disconnect(self, close_code):
        if hasattr(self, "org_group"):
            await self.channel_layer.group_discard(self.org_group, self.channel_name)
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def new_notification(self, event):
        """Handle new notification broadcast."""
        await self.send_json(event["data"])

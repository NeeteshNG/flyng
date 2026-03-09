"""
JWT Authentication middleware for WebSocket connections.

WebSocket connections cannot send custom HTTP headers, so the JWT token
is passed as a query string parameter: ws://host/ws/path/?token=<jwt>
"""

import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)

User = get_user_model()


@database_sync_to_async
def get_user_and_org(user_id):
    """Fetch user and their active organization membership."""
    from apps.organizations.models import OrganizationMembership

    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return AnonymousUser(), None

    membership = (
        OrganizationMembership.objects.filter(user=user, is_active=True)
        .select_related("organization")
        .first()
    )

    org_id = membership.organization_id if membership else None
    return user, org_id


class JWTAuthMiddleware(BaseMiddleware):
    """
    Authenticate WebSocket connections via JWT token in query string.

    Usage: ws://host/ws/telemetry/?token=<access_token>

    Sets scope["user"] and scope["org_id"] on successful auth.
    Closes connection with code 4001 on auth failure.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)
        token_list = params.get("token", [])

        if not token_list:
            logger.debug("WebSocket connection rejected: no token provided")
            await send({"type": "websocket.close", "code": 4001})
            return

        token_str = token_list[0]

        try:
            access_token = AccessToken(token_str)
            user_id = access_token["user_id"]
        except (InvalidToken, TokenError, KeyError) as e:
            logger.debug("WebSocket connection rejected: invalid token — %s", e)
            await send({"type": "websocket.close", "code": 4001})
            return

        user, org_id = await get_user_and_org(user_id)

        if isinstance(user, AnonymousUser) or org_id is None:
            logger.debug("WebSocket connection rejected: user not found or no org")
            await send({"type": "websocket.close", "code": 4001})
            return

        scope["user"] = user
        scope["org_id"] = org_id

        return await super().__call__(scope, receive, send)

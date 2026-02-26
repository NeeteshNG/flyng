"""
Request utilities for FlyNG.

Provides functions for extracting information from HTTP requests.
"""

from typing import Optional

from django.http import HttpRequest


def get_client_ip(request: Optional[HttpRequest]) -> str:
    """
    Extract client IP address from request.

    Handles X-Forwarded-For header for requests behind proxies/load balancers.

    Args:
        request: Django HttpRequest object, can be None.

    Returns:
        Client IP address as string, or "0.0.0.0" if not determinable.

    Example:
        >>> from apps.core.utils import get_client_ip
        >>> ip = get_client_ip(request)
        >>> print(ip)  # "192.168.1.100"
    """
    if not request:
        return "0.0.0.0"

    # Check for proxy headers first
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        # X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
        # The first one is the original client
        return x_forwarded_for.split(",")[0].strip()

    # Fall back to REMOTE_ADDR
    return request.META.get("REMOTE_ADDR", "0.0.0.0")


def get_user_agent(request: Optional[HttpRequest]) -> str:
    """
    Extract User-Agent header from request.

    Args:
        request: Django HttpRequest object, can be None.

    Returns:
        User-Agent string, or empty string if not available.
    """
    if not request:
        return ""

    return request.META.get("HTTP_USER_AGENT", "")

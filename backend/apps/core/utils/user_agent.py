"""
User-Agent parsing utilities for FlyNG.

Provides functions for parsing and extracting information from User-Agent strings.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class UserAgentInfo:
    """Parsed User-Agent information."""

    device: str  # "desktop", "mobile", "tablet"
    browser: str  # "Chrome", "Firefox", "Safari", etc.
    os: str  # "Windows", "macOS", "Linux", "Android", "iOS"


def parse_user_agent(user_agent: Optional[str]) -> UserAgentInfo:
    """
    Parse User-Agent string to extract device, browser, and OS information.

    This is a lightweight parser that handles common user agents without
    external dependencies. For production use with complex requirements,
    consider using a library like `user-agents`.

    Args:
        user_agent: Raw User-Agent header string.

    Returns:
        UserAgentInfo dataclass with device, browser, and os fields.

    Example:
        >>> from apps.core.utils import parse_user_agent
        >>> info = parse_user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0")
        >>> print(info.device)  # "desktop"
        >>> print(info.browser)  # "Chrome"
        >>> print(info.os)  # "Windows"
    """
    ua_lower = user_agent.lower() if user_agent else ""

    # Detect device type
    device = _detect_device(ua_lower)

    # Detect browser
    browser = _detect_browser(ua_lower)

    # Detect operating system
    os = _detect_os(ua_lower)

    return UserAgentInfo(device=device, browser=browser, os=os)


def _detect_device(ua_lower: str) -> str:
    """Detect device type from User-Agent."""
    if not ua_lower:
        return "unknown"

    # Check for mobile indicators
    mobile_indicators = ["mobile", "android", "iphone", "ipod", "blackberry", "windows phone"]
    tablet_indicators = ["tablet", "ipad", "kindle", "playbook"]

    for indicator in tablet_indicators:
        if indicator in ua_lower:
            return "tablet"

    for indicator in mobile_indicators:
        if indicator in ua_lower:
            # iPad contains "mobile" in some cases, double-check
            if "ipad" not in ua_lower:
                return "mobile"

    return "desktop"


def _detect_browser(ua_lower: str) -> str:
    """Detect browser from User-Agent."""
    if not ua_lower:
        return "unknown"

    # Order matters: Edge contains "chrome", so check Edge first
    browsers = [
        ("edg", "Edge"),
        ("opr", "Opera"),
        ("opera", "Opera"),
        ("firefox", "Firefox"),
        ("fxios", "Firefox"),  # Firefox on iOS
        ("chrome", "Chrome"),
        ("crios", "Chrome"),  # Chrome on iOS
        ("safari", "Safari"),
        ("msie", "Internet Explorer"),
        ("trident", "Internet Explorer"),
    ]

    for indicator, name in browsers:
        if indicator in ua_lower:
            return name

    return "unknown"


def _detect_os(ua_lower: str) -> str:
    """Detect operating system from User-Agent."""
    if not ua_lower:
        return "unknown"

    os_patterns = [
        ("iphone", "iOS"),
        ("ipad", "iOS"),
        ("ipod", "iOS"),
        ("mac os x", "macOS"),
        ("macintosh", "macOS"),
        ("android", "Android"),
        ("windows nt 10", "Windows 10"),
        ("windows nt 6.3", "Windows 8.1"),
        ("windows nt 6.2", "Windows 8"),
        ("windows nt 6.1", "Windows 7"),
        ("windows", "Windows"),
        ("linux", "Linux"),
        ("cros", "Chrome OS"),
    ]

    for indicator, name in os_patterns:
        if indicator in ua_lower:
            return name

    return "unknown"


def get_device_type(user_agent: Optional[str]) -> str:
    """
    Get just the device type from User-Agent.

    Convenience function when only device type is needed.

    Args:
        user_agent: Raw User-Agent header string.

    Returns:
        Device type: "desktop", "mobile", "tablet", or "unknown".
    """
    return parse_user_agent(user_agent).device


def get_browser_name(user_agent: Optional[str]) -> str:
    """
    Get just the browser name from User-Agent.

    Convenience function when only browser is needed.

    Args:
        user_agent: Raw User-Agent header string.

    Returns:
        Browser name or "unknown".
    """
    return parse_user_agent(user_agent).browser


def get_os_name(user_agent: Optional[str]) -> str:
    """
    Get just the OS name from User-Agent.

    Convenience function when only OS is needed.

    Args:
        user_agent: Raw User-Agent header string.

    Returns:
        OS name or "unknown".
    """
    return parse_user_agent(user_agent).os

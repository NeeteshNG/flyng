"""
Core utilities for FlyNG.

This module provides shared utility functions used across all apps.
"""

from .request import get_client_ip
from .uploads import import_error_file_upload_path, import_file_upload_path
from .user_agent import parse_user_agent

__all__ = [
    "get_client_ip",
    "import_error_file_upload_path",
    "import_file_upload_path",
    "parse_user_agent",
]

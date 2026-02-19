"""
Logs App Configuration
"""

from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class LogsConfig(AppConfig):
    """Configuration for the Logs app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.logs"
    verbose_name = _("Flight Logs")

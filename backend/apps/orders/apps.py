"""
Orders App Configuration
"""

from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class OrdersConfig(AppConfig):
    """Configuration for the Orders app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orders"
    verbose_name = _("Orders")

    def ready(self):
        """Import signals when app is ready."""
        pass

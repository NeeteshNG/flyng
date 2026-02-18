"""
Warehouses App Configuration
"""
from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class WarehousesConfig(AppConfig):
    """Configuration for the Warehouses app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.warehouses'
    # Translators: Application name for warehouse management
    verbose_name = _('Warehouse Management')

"""
Jobs App Configuration
"""

from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class JobsConfig(AppConfig):
    """Configuration for the Jobs app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.jobs"
    verbose_name = _("Jobs")

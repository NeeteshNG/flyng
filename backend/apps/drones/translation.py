"""
Model Translation Configuration for Drones App

Uses django-modeltranslation to provide multi-language support for
user-facing content fields. Adds language-suffixed columns (e.g., name_en, name_hi)
to the database.

Translatable fields:
- Drone: name
- DroneMaintenanceRecord: title, description, notes
"""

from modeltranslation.translator import TranslationOptions, register

from apps.drones.models import Drone, DroneMaintenanceRecord


@register(Drone)
class DroneTranslationOptions(TranslationOptions):
    """
    Translation options for Drone model.

    Translatable fields:
    - name: Drone display name
    """

    fields = ("name",)


@register(DroneMaintenanceRecord)
class DroneMaintenanceRecordTranslationOptions(TranslationOptions):
    """
    Translation options for DroneMaintenanceRecord model.

    Translatable fields:
    - title: Maintenance title
    - description: Detailed description
    - notes: Additional notes
    """

    fields = ("title", "description", "notes")

"""
Model Translation Configuration for Warehouses App

Uses django-modeltranslation to provide multi-language support for
user-facing content fields. Adds language-suffixed columns (e.g., name_en, name_hi)
to the database.

Translatable fields:
- Warehouse: name, description
- WarehouseContact: designation, notes
- WarehouseZone: name, description
- GroundControlStation: name, description
- DroneWorkArea: name, description
"""

from modeltranslation.translator import TranslationOptions, register

from apps.warehouses.models import (
    DroneWorkArea,
    GroundControlStation,
    Warehouse,
    WarehouseContact,
    WarehouseZone,
)


@register(Warehouse)
class WarehouseTranslationOptions(TranslationOptions):
    """
    Translation options for Warehouse model.

    Translatable fields:
    - name: Warehouse display name
    - description: Warehouse detailed description
    """

    fields = ("name", "description")


@register(WarehouseContact)
class WarehouseContactTranslationOptions(TranslationOptions):
    """
    Translation options for WarehouseContact model.

    Translatable fields:
    - designation: Job title (e.g., "Manager" → "प्रबंधक")
    - notes: Additional notes about the contact
    """

    fields = ("designation", "notes")


@register(WarehouseZone)
class WarehouseZoneTranslationOptions(TranslationOptions):
    """
    Translation options for WarehouseZone model.

    Translatable fields:
    - name: Zone display name (e.g., "Storage Zone A" → "भंडारण क्षेत्र A")
    - description: Zone detailed description
    """

    fields = ("name", "description")


@register(GroundControlStation)
class GroundControlStationTranslationOptions(TranslationOptions):
    """
    Translation options for GroundControlStation model.

    Translatable fields:
    - name: GCS display name
    - description: GCS detailed description
    """

    fields = ("name", "description")


@register(DroneWorkArea)
class DroneWorkAreaTranslationOptions(TranslationOptions):
    """
    Translation options for DroneWorkArea model.

    Translatable fields:
    - name: Work area display name
    - description: Work area detailed description
    """

    fields = ("name", "description")

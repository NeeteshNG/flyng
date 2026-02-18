"""
Model Translation Configuration for Warehouses App

Uses django-modeltranslation to provide multi-language support for
user-facing content fields. Adds language-suffixed columns (e.g., name_en, name_hi)
to the database.

Translatable fields:
- Warehouse: name, description
- WarehouseContact: designation, notes
"""
from modeltranslation.translator import TranslationOptions, register

from apps.warehouses.models import Warehouse, WarehouseContact


@register(Warehouse)
class WarehouseTranslationOptions(TranslationOptions):
    """
    Translation options for Warehouse model.

    Translatable fields:
    - name: Warehouse display name
    - description: Warehouse detailed description
    """
    fields = ('name', 'description')


@register(WarehouseContact)
class WarehouseContactTranslationOptions(TranslationOptions):
    """
    Translation options for WarehouseContact model.

    Translatable fields:
    - designation: Job title (e.g., "Manager" → "प्रबंधक")
    - notes: Additional notes about the contact
    """
    fields = ('designation', 'notes')

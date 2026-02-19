"""
Inventory Model Translations

Registers translatable fields for inventory models using django-modeltranslation.
"""
from modeltranslation.translator import TranslationOptions, register

from .models import (
    BinLabelType,
    InventoryItem,
    ItemCategory,
    StorageBinTemplate,
    StorageLocation,
)


@register(StorageLocation)
class StorageLocationTranslationOptions(TranslationOptions):
    """Translation options for StorageLocation model."""
    fields = ('notes',)


@register(BinLabelType)
class BinLabelTypeTranslationOptions(TranslationOptions):
    """Translation options for BinLabelType model."""
    fields = ('name',)


@register(StorageBinTemplate)
class StorageBinTemplateTranslationOptions(TranslationOptions):
    """Translation options for StorageBinTemplate model."""
    fields = ('name', 'description')


@register(ItemCategory)
class ItemCategoryTranslationOptions(TranslationOptions):
    """Translation options for ItemCategory model."""
    fields = ('name', 'description')


@register(InventoryItem)
class InventoryItemTranslationOptions(TranslationOptions):
    """Translation options for InventoryItem model."""
    fields = ('name', 'description')

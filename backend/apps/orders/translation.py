"""
Orders Model Translations

Registers translatable fields for order models using django-modeltranslation.
"""

from modeltranslation.translator import TranslationOptions, register

from .models import PickOrder, PickOrderBatch, PickOrderLine


@register(PickOrder)
class PickOrderTranslationOptions(TranslationOptions):
    """Translation options for PickOrder model."""

    fields = ("notes", "internal_notes", "cancellation_reason")


@register(PickOrderLine)
class PickOrderLineTranslationOptions(TranslationOptions):
    """Translation options for PickOrderLine model."""

    fields = ("notes", "pick_notes")


@register(PickOrderBatch)
class PickOrderBatchTranslationOptions(TranslationOptions):
    """Translation options for PickOrderBatch model."""

    fields = ("name", "description", "notes")

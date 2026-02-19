"""
Jobs Model Translations

Registers translatable fields for job models using django-modeltranslation.
"""

from modeltranslation.translator import TranslationOptions, register

from .models import DroneJob, DroneJobEvent


@register(DroneJob)
class DroneJobTranslationOptions(TranslationOptions):
    """Translation options for DroneJob model."""

    fields = ("notes", "internal_notes", "error_message")


@register(DroneJobEvent)
class DroneJobEventTranslationOptions(TranslationOptions):
    """Translation options for DroneJobEvent model."""

    fields = ("description",)

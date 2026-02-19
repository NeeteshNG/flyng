"""
Battery Model Translations

Registers translatable fields for battery models using django-modeltranslation.
"""

from modeltranslation.translator import TranslationOptions, register

from .models import DroneBattery


@register(DroneBattery)
class DroneBatteryTranslationOptions(TranslationOptions):
    """Translation options for DroneBattery model."""

    fields = ("name", "notes")


# Note: BatteryChargingSession and BatterySwapRecord are ReadOnlyModels
# with primarily technical data that doesn't require translation.
# Only the 'notes' field could potentially be translated, but since
# these are immutable records, translation is not applicable.

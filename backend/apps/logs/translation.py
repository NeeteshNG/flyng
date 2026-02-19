"""
Logs Model Translations

Registers translatable fields for log models using django-modeltranslation.
"""

from modeltranslation.translator import TranslationOptions, register

from .models import DroneFlightLog, FlightGraphTemplate, FlightLogGraph


@register(DroneFlightLog)
class DroneFlightLogTranslationOptions(TranslationOptions):
    """Translation options for DroneFlightLog model."""

    fields = ("description", "notes", "processing_error")


@register(FlightGraphTemplate)
class FlightGraphTemplateTranslationOptions(TranslationOptions):
    """Translation options for FlightGraphTemplate model."""

    fields = ("name", "description", "x_axis_label", "y_axis_label", "z_axis_label")


@register(FlightLogGraph)
class FlightLogGraphTranslationOptions(TranslationOptions):
    """Translation options for FlightLogGraph model."""

    fields = ("title", "generation_error")

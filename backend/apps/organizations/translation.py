"""
Model Translation Configuration for Organizations App

Uses django-modeltranslation to provide multi-language support for
user-facing content fields. Adds language-suffixed columns (e.g., name_en, name_hi)
to the database.

Translatable fields:
- Plan: name, description
- Organization: name, description
- OrganizationAPIKey: name, description
"""
from modeltranslation.translator import TranslationOptions, register

from apps.organizations.models import Organization, OrganizationAPIKey, Plan


@register(Plan)
class PlanTranslationOptions(TranslationOptions):
    """
    Translation options for Plan model.

    Translatable fields:
    - name: Plan display name (e.g., "Professional" → "प्रोफेशनल")
    - description: Plan feature description
    """
    fields = ('name', 'description')


@register(Organization)
class OrganizationTranslationOptions(TranslationOptions):
    """
    Translation options for Organization model.

    Translatable fields:
    - name: Organization display name
    - description: Organization description
    """
    fields = ('name', 'description')


@register(OrganizationAPIKey)
class OrganizationAPIKeyTranslationOptions(TranslationOptions):
    """
    Translation options for OrganizationAPIKey model.

    Translatable fields:
    - name: API key friendly name
    - description: API key usage description
    """
    fields = ('name', 'description')

"""
Core Views
"""

from django.conf import settings
from django.http import HttpResponseForbidden
from django.views.generic import TemplateView


class ArchitectureView(TemplateView):
    """
    View for displaying model architecture diagrams.
    Only available in DEBUG mode.
    """

    template_name = "docs/architecture.html"

    def dispatch(self, request, *args, **kwargs):
        if not settings.DEBUG:
            return HttpResponseForbidden("Architecture docs only available in DEBUG mode")
        return super().dispatch(request, *args, **kwargs)

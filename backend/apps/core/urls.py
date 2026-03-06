"""
Core URLs
"""

from django.urls import path

from .views import ArchitectureView, ExportView, ImportJobViewSet

app_name = "core"

# Debug/docs URLs (included under /docs/)
doc_urlpatterns = [
    path("architecture/", ArchitectureView.as_view(), name="architecture"),
]

# API URLs (included under /api/v1/)
api_urlpatterns = [
    # Import jobs
    path(
        "imports/",
        ImportJobViewSet.as_view({"get": "list"}),
        name="import-list",
    ),
    path(
        "imports/upload/",
        ImportJobViewSet.as_view({"post": "upload"}),
        name="import-upload",
    ),
    path(
        "imports/template/<str:import_type>/",
        ImportJobViewSet.as_view({"get": "template"}),
        name="import-template",
    ),
    path(
        "imports/<uuid:uuid>/",
        ImportJobViewSet.as_view({"get": "retrieve"}),
        name="import-detail",
    ),
    path(
        "imports/<uuid:uuid>/errors/",
        ImportJobViewSet.as_view({"get": "download_errors"}),
        name="import-errors",
    ),
    # Exports
    path(
        "exports/<str:export_type>/",
        ExportView.as_view(),
        name="export",
    ),
]

# Default urlpatterns for backward compat (docs/)
urlpatterns = doc_urlpatterns

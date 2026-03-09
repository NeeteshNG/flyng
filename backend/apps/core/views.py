"""
Core Views
"""

import csv
import importlib

from django.conf import settings
from django.core.exceptions import FieldError
from django.http import HttpResponse, HttpResponseForbidden
from django.views.generic import TemplateView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from apps.organizations.views import get_user_organization

from .mixins import ActivityLoggingMixin
from .models import ImportJob
from .permissions import IsAdminOrManager
from .serializers import (
    ImportJobDetailSerializer,
    ImportJobListSerializer,
    ImportJobUploadSerializer,
)
from .services.csv_export import EXPORT_REGISTRY
from .services.csv_import import IMPORTER_REGISTRY


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


class ImportJobViewSet(ActivityLoggingMixin, GenericViewSet):
    """
    ViewSet for managing CSV import jobs.

    list:    GET  /api/v1/imports/
    upload:  POST /api/v1/imports/upload/
    retrieve: GET /api/v1/imports/{uuid}/
    download_errors: GET /api/v1/imports/{uuid}/errors/
    template: GET /api/v1/imports/template/{import_type}/
    """

    permission_classes = [IsAuthenticated, IsAdminOrManager]
    lookup_field = "uuid"

    def get_queryset(self):
        org = get_user_organization(self.request.user)
        if not org:
            return ImportJob.objects.none()
        return ImportJob.objects.filter(organization=org).select_related("created_by")

    def get_serializer_class(self):
        if self.action == "list":
            return ImportJobListSerializer
        return ImportJobDetailSerializer

    def list(self, request):
        """List import jobs for the user's organization."""
        queryset = self.get_queryset().order_by("-created_at")

        import_type = request.query_params.get("import_type")
        if import_type:
            queryset = queryset.filter(import_type=import_type)

        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ImportJobListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ImportJobListSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data})

    def retrieve(self, request, uuid=None):
        """Get import job details."""
        instance = self.get_object()
        serializer = ImportJobDetailSerializer(instance)
        return Response({"success": True, "data": serializer.data})

    def upload(self, request):
        """Upload and process a CSV file."""
        serializer = ImportJobUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        org = get_user_organization(request.user)
        if not org:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        import_type = serializer.validated_data["import_type"]
        uploaded_file = serializer.validated_data["file"]

        # Resolve warehouse if provided
        warehouse = None
        warehouse_uuid = serializer.validated_data.get("warehouse")
        if warehouse_uuid:
            from apps.warehouses.models import Warehouse

            try:
                warehouse = Warehouse.objects.get(uuid=warehouse_uuid, organization=org)
            except Warehouse.DoesNotExist:
                return Response(
                    {"success": False, "message": "Warehouse not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Create ImportJob
        import_job = ImportJob.objects.create(
            organization=org,
            warehouse=warehouse,
            import_type=import_type,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            created_by=request.user,
        )

        # Process synchronously
        importer_class = IMPORTER_REGISTRY.get(import_type)
        if not importer_class:
            import_job.fail(f"Unsupported import type: {import_type}")
            return Response(
                {"success": False, "message": f"Unsupported import type: {import_type}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        importer = importer_class(import_job, org, warehouse)
        import_job.file.seek(0)
        importer.process(import_job.file)

        # Return result
        import_job.refresh_from_db()
        result_serializer = ImportJobDetailSerializer(import_job)
        return Response(
            {"success": True, "data": result_serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def download_errors(self, request, uuid=None):
        """Download the error CSV for an import job."""
        instance = self.get_object()
        if not instance.error_file:
            return Response(
                {"success": False, "message": "No error file available"},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = HttpResponse(instance.error_file.read(), content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="{instance.uuid}_errors.csv"'
        )
        return response

    def template(self, request, import_type=None):
        """Download a CSV template for the given import type."""
        importer_class = IMPORTER_REGISTRY.get(import_type)
        if not importer_class:
            return Response(
                {"success": False, "message": f"Unknown import type: {import_type}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        headers = importer_class.REQUIRED_HEADERS + importer_class.OPTIONAL_HEADERS

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="{import_type}_template.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(headers)
        return response


class ExportView(APIView):
    """
    Export data in multiple formats.

    GET /api/v1/exports/{export_type}/?export_format=csv|json|xml|pdf
    """

    permission_classes = [IsAuthenticated]

    SUPPORTED_FORMATS = ("csv", "json", "xml", "pdf")

    def get(self, request, export_type=None):
        config = EXPORT_REGISTRY.get(export_type)
        if not config:
            return Response(
                {"success": False, "message": f"Unknown export type: {export_type}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        export_format = request.query_params.get("export_format", "csv")
        if export_format not in self.SUPPORTED_FORMATS:
            return Response(
                {"success": False, "message": f"Unsupported format: {export_format}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        org = get_user_organization(request.user)
        if not org:
            return Response(
                {"success": False, "message": "No organization found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Dynamically import model
        module_path, class_name = config["model_path"].rsplit(".", 1)
        module = importlib.import_module(module_path)
        model_class = getattr(module, class_name)

        # Build queryset filtered by organization
        queryset = model_class.objects.filter(**{config["org_field"]: org})

        # Apply query params as filters
        for key, value in request.query_params.items():
            if key in ("format", "export_format"):
                continue
            try:
                queryset = queryset.filter(**{key: value})
            except (FieldError, ValueError, TypeError):
                pass  # Ignore invalid filter params

        # CSV: use existing export functions for backward compatibility
        if export_format == "csv":
            return config["export_fn"](queryset)

        # JSON/XML/PDF: use data-driven field definitions + renderers
        from apps.core.services.export_fields import EXPORT_FIELDS
        from apps.core.services.export_renderers import render_json, render_pdf, render_xml

        field_config = EXPORT_FIELDS.get(export_type)
        if not field_config:
            return Response(
                {"success": False, "message": f"Format not available for: {export_type}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if export_format == "json":
            return render_json(field_config, queryset)
        elif export_format == "xml":
            return render_xml(field_config, queryset)
        elif export_format == "pdf":
            return render_pdf(field_config, queryset, request)

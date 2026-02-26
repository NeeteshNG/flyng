"""
Inventory Views

API views for storage locations, bins, items, and stock.
"""

from django.db.models import Count, Q
from django_filters import rest_framework as django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdminOrManagerOrReadOnly

from .models import BinLabelType, StorageLocation, StorageBin, StorageBinTemplate
from .serializers import (
    BinLabelTypeCreateUpdateSerializer,
    BinLabelTypeDetailSerializer,
    BinLabelTypeListSerializer,
    StorageLocationCreateUpdateSerializer,
    StorageLocationDetailSerializer,
    StorageLocationListSerializer,
    StorageBinCreateUpdateSerializer,
    StorageBinDetailSerializer,
    StorageBinListSerializer,
    StorageBinTemplateCreateUpdateSerializer,
    StorageBinTemplateDetailSerializer,
    StorageBinTemplateListSerializer,
)


class StorageLocationFilter(django_filters.FilterSet):
    """Filter for storage locations."""

    zone = django_filters.NumberFilter(field_name="zone")
    warehouse = django_filters.NumberFilter(field_name="zone__warehouse")
    location_type = django_filters.CharFilter(field_name="location_type")
    aisle = django_filters.CharFilter(field_name="aisle")
    is_active = django_filters.BooleanFilter(field_name="is_active")
    is_accessible = django_filters.BooleanFilter(field_name="is_accessible")
    is_full = django_filters.BooleanFilter(field_name="is_full")

    class Meta:
        model = StorageLocation
        fields = [
            "zone",
            "warehouse",
            "location_type",
            "aisle",
            "is_active",
            "is_accessible",
            "is_full",
        ]


class StorageLocationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for storage locations.

    list: Get all storage locations
    create: Create a new storage location
    retrieve: Get a storage location by UUID
    update: Update a storage location
    partial_update: Partially update a storage location
    destroy: Soft delete a storage location
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = StorageLocationFilter
    search_fields = ["code", "aisle", "rack", "level", "notes"]
    ordering_fields = ["code", "aisle", "rack", "level", "created_at"]
    ordering = ["zone__warehouse__name", "aisle", "rack", "level"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return storage locations with annotated bin count to avoid N+1 queries."""
        return (
            StorageLocation.objects.select_related("zone", "zone__warehouse")
            .annotate(
                bin_count=Count("bins", filter=Q(bins__is_active=True)),
            )
            .order_by("zone__warehouse__name", "aisle", "rack", "level")
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return StorageLocationListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return StorageLocationCreateUpdateSerializer
        return StorageLocationDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(
            {"success": True, "message": "Storage location deactivated successfully"},
            status=status.HTTP_200_OK,
        )


class StorageBinFilter(django_filters.FilterSet):
    """Filter for storage bins."""

    location = django_filters.NumberFilter(field_name="location")
    zone = django_filters.NumberFilter(field_name="location__zone")
    warehouse = django_filters.NumberFilter(field_name="location__zone__warehouse")
    template = django_filters.NumberFilter(field_name="template")
    is_active = django_filters.BooleanFilter(field_name="is_active")
    is_full = django_filters.BooleanFilter(field_name="is_full")

    class Meta:
        model = StorageBin
        fields = [
            "location",
            "zone",
            "warehouse",
            "template",
            "is_active",
            "is_full",
        ]


class StorageBinViewSet(viewsets.ModelViewSet):
    """
    ViewSet for storage bins.

    list: Get all storage bins
    create: Create a new storage bin
    retrieve: Get a storage bin by UUID
    update: Update a storage bin
    partial_update: Partially update a storage bin
    destroy: Soft delete a storage bin
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = StorageBinFilter
    search_fields = ["code", "label_value", "notes"]
    ordering_fields = ["code", "position_index", "created_at"]
    ordering = ["location__zone__warehouse__name", "location__code", "position_index"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return all storage bins with related data."""
        return StorageBin.objects.select_related(
            "location",
            "location__zone",
            "location__zone__warehouse",
            "template",
        ).order_by(
            "location__zone__warehouse__name", "location__code", "position_index"
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return StorageBinListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return StorageBinCreateUpdateSerializer
        return StorageBinDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(
            {"success": True, "message": "Storage bin deactivated successfully"},
            status=status.HTTP_200_OK,
        )


class StorageBinTemplateFilter(django_filters.FilterSet):
    """Filter for bin templates."""

    organization = django_filters.NumberFilter(field_name="organization")
    label_type = django_filters.NumberFilter(field_name="label_type")
    is_active = django_filters.BooleanFilter(field_name="is_active")
    coordinate_type = django_filters.NumberFilter(field_name="coordinate_type")

    class Meta:
        model = StorageBinTemplate
        fields = [
            "organization",
            "label_type",
            "is_active",
            "coordinate_type",
        ]


class StorageBinTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for bin templates.

    list: Get all bin templates
    create: Create a new bin template
    retrieve: Get a bin template by UUID
    update: Update a bin template
    partial_update: Partially update a bin template
    destroy: Soft delete a bin template
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = StorageBinTemplateFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "max_weight_kg"]
    ordering = ["name"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return bin templates with annotated bin count to avoid N+1 queries."""
        return (
            StorageBinTemplate.objects.select_related("organization", "label_type")
            .annotate(
                bin_count=Count("bins", filter=Q(bins__is_active=True)),
            )
            .order_by("name")
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return StorageBinTemplateListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return StorageBinTemplateCreateUpdateSerializer
        return StorageBinTemplateDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(
            {"success": True, "message": "Bin template deactivated successfully"},
            status=status.HTTP_200_OK,
        )


class BinLabelTypeFilter(django_filters.FilterSet):
    """Filter for bin label types."""

    organization = django_filters.NumberFilter(field_name="organization")
    label_type = django_filters.NumberFilter(field_name="label_type")
    is_active = django_filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = BinLabelType
        fields = [
            "organization",
            "label_type",
            "is_active",
        ]


class BinLabelTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for bin label types.

    list: Get all bin label types
    create: Create a new bin label type
    retrieve: Get a bin label type by UUID
    update: Update a bin label type
    partial_update: Partially update a bin label type
    destroy: Soft delete a bin label type
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = BinLabelTypeFilter
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return bin label types with annotated template count to avoid N+1 queries."""
        return (
            BinLabelType.objects.select_related("organization")
            .annotate(
                template_count=Count("templates", filter=Q(templates__is_active=True)),
            )
            .order_by("name")
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return BinLabelTypeListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return BinLabelTypeCreateUpdateSerializer
        return BinLabelTypeDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(
            {"success": True, "message": "Label type deactivated successfully"},
            status=status.HTTP_200_OK,
        )

"""
Inventory Views

API views for storage locations, bins, items, and stock.
"""

from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsAdminOrManagerOrReadOnly

from .models import StorageLocation, StorageBin, StorageBinTemplate
from .serializers import (
    StorageLocationCreateUpdateSerializer,
    StorageLocationDetailSerializer,
    StorageLocationListSerializer,
    StorageBinCreateUpdateSerializer,
    StorageBinDetailSerializer,
    StorageBinListSerializer,
    StorageBinTemplateListSerializer,
)


class StorageLocationFilter(filters.FilterSet):
    """Filter for storage locations."""

    zone = filters.NumberFilter(field_name="zone")
    warehouse = filters.NumberFilter(field_name="zone__warehouse")
    location_type = filters.CharFilter(field_name="location_type")
    aisle = filters.CharFilter(field_name="aisle")
    is_active = filters.BooleanFilter(field_name="is_active")
    is_accessible = filters.BooleanFilter(field_name="is_accessible")
    is_full = filters.BooleanFilter(field_name="is_full")

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
    destroy: Delete a storage location
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filterset_class = StorageLocationFilter
    search_fields = ["code", "aisle", "rack", "level", "notes"]
    ordering_fields = ["code", "aisle", "rack", "level", "created_at"]
    ordering = ["zone__warehouse__name", "aisle", "rack", "level"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return all storage locations with related data."""
        return StorageLocation.objects.select_related(
            "zone", "zone__warehouse"
        ).order_by("zone__warehouse__name", "aisle", "rack", "level")

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return StorageLocationListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return StorageLocationCreateUpdateSerializer
        return StorageLocationDetailSerializer


class StorageBinFilter(filters.FilterSet):
    """Filter for storage bins."""

    location = filters.NumberFilter(field_name="location")
    zone = filters.NumberFilter(field_name="location__zone")
    warehouse = filters.NumberFilter(field_name="location__zone__warehouse")
    template = filters.NumberFilter(field_name="template")
    is_active = filters.BooleanFilter(field_name="is_active")
    is_full = filters.BooleanFilter(field_name="is_full")

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
    destroy: Delete a storage bin
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
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


class StorageBinTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for bin templates (read-only).

    list: Get all bin templates
    retrieve: Get a bin template by UUID
    """

    permission_classes = [IsAuthenticated]
    serializer_class = StorageBinTemplateListSerializer
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return all bin templates."""
        return StorageBinTemplate.objects.all().order_by("name")

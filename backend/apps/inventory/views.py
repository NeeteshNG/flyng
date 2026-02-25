"""
Inventory Views

API views for storage locations, bins, items, and stock.
"""

from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsAdminOrManagerOrReadOnly

from .models import StorageLocation
from .serializers import (
    StorageLocationCreateUpdateSerializer,
    StorageLocationDetailSerializer,
    StorageLocationListSerializer,
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

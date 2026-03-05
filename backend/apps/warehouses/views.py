"""
Warehouse API Views
"""

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.choices import ActivityAction
from apps.core.mixins import ActivityLoggingMixin
from apps.core.permissions import IsAdminOrManager, IsAdminOrManagerOrReadOnly
from apps.warehouses.models import (
    DroneWorkArea,
    GroundControlStation,
    Warehouse,
    WarehouseContact,
    WarehouseZone,
)
from apps.warehouses.serializers import (
    DroneWorkAreaCreateUpdateSerializer,
    DroneWorkAreaDetailSerializer,
    DroneWorkAreaListSerializer,
    GroundControlStationCreateUpdateSerializer,
    GroundControlStationDetailSerializer,
    GroundControlStationListSerializer,
    WarehouseContactSerializer,
    WarehouseCreateUpdateSerializer,
    WarehouseDetailSerializer,
    WarehouseListSerializer,
    WarehouseZoneCreateUpdateSerializer,
    WarehouseZoneDetailSerializer,
    WarehouseZoneListSerializer,
)


class WarehouseViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for Warehouse CRUD operations.

    list: Get all warehouses
    retrieve: Get a specific warehouse by UUID
    create: Create a new warehouse (Admin/Manager only)
    update: Update a warehouse (Admin/Manager only)
    partial_update: Partial update a warehouse (Admin/Manager only)
    destroy: Soft delete a warehouse (Admin/Manager only)
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["organization", "is_active", "city", "state", "country"]
    search_fields = ["name", "code", "city", "state"]
    ordering_fields = ["name", "code", "city", "created_at"]
    ordering = ["name"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return warehouses with annotated counts to avoid N+1 queries."""
        return (
            Warehouse.objects.select_related("organization", "profile")
            .prefetch_related("contacts", "zones")
            .annotate(
                zone_count=Count("zones", filter=Q(zones__is_active=True)),
                contact_count=Count("contacts", filter=Q(contacts__is_active=True)),
            )
        )

    def get_serializer_class(self):
        if self.action == "list":
            return WarehouseListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return WarehouseCreateUpdateSerializer
        return WarehouseDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
        self.log_activity(ActivityAction.CREATE, serializer.instance, "Created warehouse")

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
        self.log_activity(ActivityAction.UPDATE, serializer.instance, "Updated warehouse")

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        self.log_activity(ActivityAction.DELETE, instance, "Deactivated warehouse")
        return Response(
            {"success": True, "message": "Warehouse deactivated successfully"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def contacts(self, request, uuid=None):
        """Get all contacts for a warehouse."""
        warehouse = self.get_object()
        contacts = warehouse.contacts.filter(is_active=True)
        serializer = WarehouseContactSerializer(contacts, many=True)
        return Response({"success": True, "data": serializer.data})

    @action(detail=True, methods=["post"])
    def add_contact(self, request, uuid=None):
        """Add a contact to a warehouse."""
        warehouse = self.get_object()
        serializer = WarehouseContactSerializer(data={**request.data, "warehouse": warehouse.id})
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"success": True, "message": "Contact added successfully", "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"success": False, "message": "Validation error", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["get"])
    def zones(self, request, uuid=None):
        """Get all zones for a warehouse."""
        warehouse = self.get_object()
        zones = warehouse.zones.filter(is_active=True)
        serializer = WarehouseZoneListSerializer(zones, many=True)
        return Response({"success": True, "data": serializer.data})


class WarehouseContactViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """ViewSet for WarehouseContact CRUD operations."""

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["warehouse", "is_primary", "is_emergency", "is_active"]
    search_fields = ["name", "email", "designation"]
    lookup_field = "uuid"

    def get_queryset(self):
        return WarehouseContact.objects.select_related("warehouse")

    def get_serializer_class(self):
        return WarehouseContactSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        self.log_activity(ActivityAction.DELETE, instance, "Deactivated contact")
        return Response(
            {"success": True, "message": "Contact deactivated successfully"},
            status=status.HTTP_200_OK,
        )


class WarehouseZoneViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for WarehouseZone CRUD operations.
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["warehouse", "zone_type", "floor_level", "is_active", "is_no_fly_zone"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "code", "floor_level", "priority", "created_at"]
    ordering = ["floor_level", "name"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return zones with annotated GCS count to avoid N+1 queries."""
        return (
            WarehouseZone.objects.select_related("warehouse")
            .prefetch_related("ground_control_stations")
            .annotate(
                gcs_count=Count(
                    "ground_control_stations",
                    filter=Q(ground_control_stations__is_active=True),
                )
            )
        )

    def get_serializer_class(self):
        if self.action == "list":
            return WarehouseZoneListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return WarehouseZoneCreateUpdateSerializer
        return WarehouseZoneDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
        self.log_activity(ActivityAction.CREATE, serializer.instance, "Created zone")

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
        self.log_activity(ActivityAction.UPDATE, serializer.instance, "Updated zone")

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        self.log_activity(ActivityAction.DELETE, instance, "Deactivated zone")
        return Response(
            {"success": True, "message": "Zone deactivated successfully"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def ground_control_stations(self, request, uuid=None):
        """Get all GCS for a zone."""
        zone = self.get_object()
        gcs_list = zone.ground_control_stations.filter(is_active=True)
        serializer = GroundControlStationListSerializer(gcs_list, many=True)
        return Response({"success": True, "data": serializer.data})


class GroundControlStationViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for GroundControlStation CRUD operations.
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["zone", "status", "is_active"]
    search_fields = ["name", "code", "hardware_id", "ip_address"]
    ordering_fields = ["name", "code", "status", "created_at"]
    ordering = ["name"]
    lookup_field = "uuid"

    def get_queryset(self):
        """Return GCS with annotated work area count to avoid N+1 queries."""
        return (
            GroundControlStation.objects.select_related("zone", "zone__warehouse")
            .prefetch_related("work_areas")
            .annotate(
                work_area_count=Count("work_areas", filter=Q(work_areas__is_active=True))
            )
        )

    def get_serializer_class(self):
        if self.action == "list":
            return GroundControlStationListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return GroundControlStationCreateUpdateSerializer
        return GroundControlStationDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
        self.log_activity(ActivityAction.CREATE, serializer.instance, "Created GCS")

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
        self.log_activity(ActivityAction.UPDATE, serializer.instance, "Updated GCS")

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        self.log_activity(ActivityAction.DELETE, instance, "Deactivated GCS")
        return Response(
            {"success": True, "message": "GCS deactivated successfully"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def work_areas(self, request, uuid=None):
        """Get all work areas for a GCS."""
        gcs = self.get_object()
        work_areas = gcs.work_areas.filter(is_active=True)
        serializer = DroneWorkAreaListSerializer(work_areas, many=True)
        return Response({"success": True, "data": serializer.data})


class DroneWorkAreaViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    ViewSet for DroneWorkArea CRUD operations.
    """

    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["ground_control_station", "area_type", "is_active"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "code", "area_type", "created_at"]
    ordering = ["name"]
    lookup_field = "uuid"

    def get_queryset(self):
        return DroneWorkArea.objects.select_related(
            "ground_control_station",
            "ground_control_station__zone",
            "ground_control_station__zone__warehouse",
        )

    def get_serializer_class(self):
        if self.action == "list":
            return DroneWorkAreaListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return DroneWorkAreaCreateUpdateSerializer
        return DroneWorkAreaDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
        self.log_activity(ActivityAction.CREATE, serializer.instance, "Created work area")

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
        self.log_activity(ActivityAction.UPDATE, serializer.instance, "Updated work area")

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        self.log_activity(ActivityAction.DELETE, instance, "Deactivated work area")
        return Response(
            {"success": True, "message": "Work area deactivated successfully"},
            status=status.HTTP_200_OK,
        )

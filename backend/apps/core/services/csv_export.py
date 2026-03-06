"""
CSV Export Functions

Each function accepts a queryset and returns an HttpResponse with CSV data.
"""

import csv

from django.db import models
from django.http import HttpResponse


def _csv_response(filename):
    """Create an HttpResponse configured for CSV download."""
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def export_categories_csv(queryset):
    """Export item categories to CSV."""
    response = _csv_response("categories.csv")
    writer = csv.writer(response)
    writer.writerow(["code", "name", "parent_code", "description", "display_order", "is_active"])

    queryset = queryset.select_related("parent")
    for cat in queryset.iterator():
        writer.writerow([
            cat.code,
            cat.name,
            cat.parent.code if cat.parent else "",
            cat.description,
            cat.display_order,
            cat.is_active,
        ])
    return response


def export_items_csv(queryset):
    """Export inventory items to CSV."""
    response = _csv_response("items.csv")
    writer = csv.writer(response)
    writer.writerow([
        "sku", "name", "category_code", "description", "barcode",
        "weight_kg", "length_cm", "width_cm", "height_cm",
        "unit_of_measure", "unit_price",
        "min_stock_level", "reorder_point", "reorder_quantity", "is_active",
    ])

    queryset = queryset.select_related("category")
    for item in queryset.iterator():
        writer.writerow([
            item.sku,
            item.name,
            item.category.code if item.category else "",
            item.description,
            item.barcode,
            item.weight_kg,
            item.length_cm,
            item.width_cm,
            item.height_cm,
            item.unit_of_measure,
            item.unit_price,
            item.min_stock_level,
            item.reorder_point,
            item.reorder_quantity,
            item.is_active,
        ])
    return response


def export_locations_csv(queryset):
    """Export storage locations to CSV."""
    response = _csv_response("locations.csv")
    writer = csv.writer(response)
    writer.writerow([
        "zone_code", "code", "aisle", "rack", "level", "position",
        "location_type", "x_coordinate", "y_coordinate", "z_coordinate",
        "max_bins", "is_accessible", "is_active",
    ])

    queryset = queryset.select_related("zone")
    for loc in queryset.iterator():
        writer.writerow([
            loc.zone.code,
            loc.code,
            loc.aisle,
            loc.rack,
            loc.level,
            loc.position,
            loc.location_type,
            loc.x_coordinate,
            loc.y_coordinate,
            loc.z_coordinate,
            loc.max_bins,
            loc.is_accessible,
            loc.is_active,
        ])
    return response


def export_stock_csv(queryset):
    """Export inventory stock to CSV."""
    response = _csv_response("stock.csv")
    writer = csv.writer(response)
    writer.writerow([
        "item_sku", "bin_code", "quantity", "reserved_quantity",
        "lot_number", "expiry_date", "manufacture_date",
    ])

    queryset = queryset.select_related("item", "bin")
    for stock in queryset.iterator():
        writer.writerow([
            stock.item.sku,
            stock.bin.code,
            stock.quantity,
            stock.reserved_quantity,
            stock.lot_number,
            stock.expiry_date or "",
            stock.manufacture_date or "",
        ])
    return response


def export_orders_csv(queryset):
    """Export pick orders with lines to CSV."""
    response = _csv_response("orders.csv")
    writer = csv.writer(response)
    writer.writerow([
        "order_number", "warehouse_code", "status", "priority",
        "customer_name", "customer_code",
        "order_date", "due_date",
        "item_sku", "bin_code", "line_number",
        "quantity", "picked_quantity", "is_picked", "lot_number",
    ])

    queryset = queryset.select_related("warehouse").prefetch_related(
        "lines__item", "lines__source_bin"
    )
    for order in queryset:
        for line in order.lines.all():
            writer.writerow([
                order.order_number,
                order.warehouse.code if order.warehouse else "",
                order.status,
                order.priority,
                order.customer_name,
                order.customer_code,
                order.order_date,
                order.due_date or "",
                line.item.sku if line.item else "",
                line.source_bin.code if line.source_bin else "",
                line.line_number,
                line.quantity,
                line.picked_quantity,
                line.is_picked,
                line.lot_number,
            ])
    return response


def export_warehouses_csv(queryset):
    """Export warehouses to CSV."""
    response = _csv_response("warehouses.csv")
    writer = csv.writer(response)
    writer.writerow([
        "code", "name", "description",
        "address_line_1", "address_line_2", "city", "state", "postal_code", "country",
        "latitude", "longitude", "timezone", "is_active",
    ])

    for wh in queryset.iterator():
        writer.writerow([
            wh.code,
            wh.name,
            wh.description,
            wh.address_line_1,
            wh.address_line_2,
            wh.city,
            wh.state,
            wh.postal_code,
            wh.country,
            wh.latitude or "",
            wh.longitude or "",
            wh.timezone,
            wh.is_active,
        ])
    return response


def export_zones_csv(queryset):
    """Export warehouse zones to CSV."""
    response = _csv_response("zones.csv")
    writer = csv.writer(response)
    writer.writerow([
        "warehouse_code", "code", "name", "zone_type", "floor_level",
        "area_sqft", "max_drones_allowed", "priority",
        "is_active", "is_no_fly_zone",
    ])

    queryset = queryset.select_related("warehouse")
    for zone in queryset.iterator():
        writer.writerow([
            zone.warehouse.code,
            zone.code,
            zone.name,
            zone.zone_type,
            zone.floor_level,
            zone.area_sqft or "",
            zone.max_drones_allowed,
            zone.priority,
            zone.is_active,
            zone.is_no_fly_zone,
        ])
    return response


def export_ground_stations_csv(queryset):
    """Export ground control stations to CSV."""
    response = _csv_response("ground_stations.csv")
    writer = csv.writer(response)
    writer.writerow([
        "zone_code", "code", "name", "hardware_id",
        "ip_address", "firmware_version", "max_drones",
        "status", "is_active", "last_heartbeat",
    ])

    queryset = queryset.select_related("zone")
    for gcs in queryset.iterator():
        writer.writerow([
            gcs.zone.code,
            gcs.code,
            gcs.name,
            gcs.hardware_id,
            gcs.ip_address or "",
            gcs.firmware_version,
            gcs.max_drones,
            gcs.status,
            gcs.is_active,
            gcs.last_heartbeat or "",
        ])
    return response


def export_work_areas_csv(queryset):
    """Export drone work areas to CSV."""
    response = _csv_response("work_areas.csv")
    writer = csv.writer(response)
    writer.writerow([
        "gcs_code", "code", "name", "area_type",
        "min_x", "max_x", "min_y", "max_y", "min_z", "max_z",
        "tether_length_m", "max_flight_speed_mps", "max_drones", "is_active",
    ])

    queryset = queryset.select_related("ground_control_station")
    for wa in queryset.iterator():
        writer.writerow([
            wa.ground_control_station.code,
            wa.code,
            wa.name,
            wa.area_type,
            wa.min_x or "",
            wa.max_x or "",
            wa.min_y or "",
            wa.max_y or "",
            wa.min_z,
            wa.max_z,
            wa.tether_length_m or "",
            wa.max_flight_speed_mps,
            wa.max_drones,
            wa.is_active,
        ])
    return response


def export_drones_csv(queryset):
    """Export drones to CSV."""
    response = _csv_response("drones.csv")
    writer = csv.writer(response)
    writer.writerow([
        "serial_number", "name", "work_area_code",
        "model", "manufacturer", "firmware_version", "hardware_version",
        "status", "autonomy_mode",
        "total_flight_hours", "total_flights", "total_distance_km",
        "max_payload_kg", "max_flight_time_min", "is_active",
    ])

    queryset = queryset.select_related("work_area")
    for drone in queryset.iterator():
        writer.writerow([
            drone.serial_number,
            drone.name,
            drone.work_area.code if drone.work_area else "",
            drone.model,
            drone.manufacturer,
            drone.firmware_version,
            drone.hardware_version,
            drone.status,
            drone.autonomy_mode,
            drone.total_flight_hours,
            drone.total_flights,
            drone.total_distance_km,
            drone.max_payload_kg or "",
            drone.max_flight_time_min or "",
            drone.is_active,
        ])
    return response


def export_batteries_csv(queryset):
    """Export batteries to CSV."""
    response = _csv_response("batteries.csv")
    writer = csv.writer(response)
    writer.writerow([
        "serial_number", "name", "warehouse_code",
        "manufacturer", "model_number", "chemistry",
        "capacity_mah", "current_capacity_mah", "voltage_nominal", "cell_count",
        "status", "health_status", "current_charge_percent",
        "cycle_count", "max_cycles",
        "purchase_date", "warranty_expires_at", "is_active",
    ])

    queryset = queryset.select_related("warehouse")
    for bat in queryset.iterator():
        writer.writerow([
            bat.serial_number,
            bat.name,
            bat.warehouse.code if bat.warehouse else "",
            bat.manufacturer,
            bat.model_number,
            bat.chemistry,
            bat.capacity_mah,
            bat.current_capacity_mah or "",
            bat.voltage_nominal,
            bat.cell_count,
            bat.status,
            bat.health_status,
            bat.current_charge_percent,
            bat.cycle_count,
            bat.max_cycles,
            bat.purchase_date or "",
            bat.warranty_expires_at or "",
            bat.is_active,
        ])
    return response


def export_bins_csv(queryset):
    """Export storage bins to CSV."""
    response = _csv_response("bins.csv")
    writer = csv.writer(response)
    writer.writerow([
        "code", "location_code", "template_name", "label_value",
        "position_index", "current_weight_kg", "item_count",
        "is_full", "is_active",
    ])

    queryset = queryset.select_related("location", "template")
    for b in queryset.iterator():
        writer.writerow([
            b.code,
            b.location.code if b.location else "",
            b.template.name if b.template else "",
            b.label_value,
            b.position_index,
            b.current_weight_kg,
            b.item_count,
            b.is_full,
            b.is_active,
        ])
    return response


def export_jobs_csv(queryset):
    """Export drone jobs to CSV."""
    response = _csv_response("jobs.csv")
    writer = csv.writer(response)
    writer.writerow([
        "job_number", "job_type", "status", "priority",
        "warehouse_code", "drone_serial", "order_number",
        "item_sku", "source_bin_code", "destination_bin_code",
        "quantity", "picked_quantity",
        "queued_at", "started_at", "completed_at",
        "error_code", "error_message",
    ])

    queryset = queryset.select_related(
        "warehouse", "drone", "order", "item", "source_bin", "destination_bin"
    )
    for job in queryset.iterator():
        writer.writerow([
            job.job_number,
            job.job_type,
            job.status,
            job.priority,
            job.warehouse.code if job.warehouse else "",
            job.drone.serial_number if job.drone else "",
            job.order.order_number if job.order else "",
            job.item.sku if job.item else "",
            job.source_bin.code if job.source_bin else "",
            job.destination_bin.code if job.destination_bin else "",
            job.quantity,
            job.picked_quantity,
            job.queued_at or "",
            job.started_at or "",
            job.completed_at or "",
            job.error_code,
            job.error_message,
        ])
    return response


def export_low_stock_csv(queryset):
    """Export low stock items to CSV with deficit info."""
    from django.db.models import IntegerField, Sum, Value
    from django.db.models.functions import Coalesce

    response = _csv_response("low_stock.csv")
    writer = csv.writer(response)
    writer.writerow([
        "sku", "name", "category", "current_stock",
        "min_stock_level", "deficit", "reorder_point", "reorder_quantity",
    ])

    queryset = (
        queryset.filter(is_active=True, min_stock_level__gt=0)
        .select_related("category")
        .annotate(
            total_stock=Coalesce(
                Sum("stocks__quantity"), Value(0), output_field=IntegerField()
            ),
        )
        .filter(total_stock__lt=models.F("min_stock_level"))
        .annotate(deficit=models.F("min_stock_level") - models.F("total_stock"))
        .order_by("-deficit")
    )

    for item in queryset.iterator():
        writer.writerow([
            item.sku,
            item.name,
            item.category.name if item.category else "",
            item.total_stock,
            item.min_stock_level,
            item.deficit,
            item.reorder_point,
            item.reorder_quantity,
        ])
    return response


# Registry mapping export type slugs to model paths, export functions, and org filter fields
EXPORT_REGISTRY = {
    "categories": {
        "model_path": "apps.inventory.models.ItemCategory",
        "export_fn": export_categories_csv,
        "org_field": "organization",
    },
    "items": {
        "model_path": "apps.inventory.models.InventoryItem",
        "export_fn": export_items_csv,
        "org_field": "organization",
    },
    "locations": {
        "model_path": "apps.inventory.models.StorageLocation",
        "export_fn": export_locations_csv,
        "org_field": "zone__warehouse__organization",
    },
    "stock": {
        "model_path": "apps.inventory.models.InventoryStock",
        "export_fn": export_stock_csv,
        "org_field": "bin__location__zone__warehouse__organization",
    },
    "orders": {
        "model_path": "apps.orders.models.PickOrder",
        "export_fn": export_orders_csv,
        "org_field": "organization",
    },
    "warehouses": {
        "model_path": "apps.warehouses.models.Warehouse",
        "export_fn": export_warehouses_csv,
        "org_field": "organization",
    },
    "zones": {
        "model_path": "apps.warehouses.models.WarehouseZone",
        "export_fn": export_zones_csv,
        "org_field": "warehouse__organization",
    },
    "ground-stations": {
        "model_path": "apps.warehouses.models.GroundControlStation",
        "export_fn": export_ground_stations_csv,
        "org_field": "zone__warehouse__organization",
    },
    "work-areas": {
        "model_path": "apps.warehouses.models.DroneWorkArea",
        "export_fn": export_work_areas_csv,
        "org_field": "ground_control_station__zone__warehouse__organization",
    },
    "drones": {
        "model_path": "apps.drones.models.Drone",
        "export_fn": export_drones_csv,
        "org_field": "work_area__ground_control_station__zone__warehouse__organization",
    },
    "batteries": {
        "model_path": "apps.batteries.models.DroneBattery",
        "export_fn": export_batteries_csv,
        "org_field": "warehouse__organization",
    },
    "bins": {
        "model_path": "apps.inventory.models.StorageBin",
        "export_fn": export_bins_csv,
        "org_field": "location__zone__warehouse__organization",
    },
    "jobs": {
        "model_path": "apps.jobs.models.DroneJob",
        "export_fn": export_jobs_csv,
        "org_field": "organization",
    },
    "low-stock": {
        "model_path": "apps.inventory.models.InventoryItem",
        "export_fn": export_low_stock_csv,
        "org_field": "organization",
    },
}

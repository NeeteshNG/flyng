"""
Export Field Definitions

Data-driven field definitions for multi-format export (JSON, XML, PDF).
Each export type defines its fields once; format-specific renderers
consume these definitions to produce output.
"""

from django.db import models
from django.db.models import IntegerField, Sum, Value
from django.db.models.functions import Coalesce


def _flatten_orders(queryset):
    """Flatten orders with their lines into individual rows."""
    rows = []
    queryset = queryset.select_related("warehouse").prefetch_related(
        "lines__item", "lines__source_bin"
    )
    for order in queryset:
        for line in order.lines.all():
            rows.append({
                "order_number": order.order_number,
                "warehouse.code": order.warehouse.code if order.warehouse else "",
                "status": order.status,
                "priority": order.priority,
                "customer_name": order.customer_name,
                "customer_code": order.customer_code,
                "order_date": order.order_date,
                "due_date": order.due_date or "",
                "line.item.sku": line.item.sku if line.item else "",
                "line.source_bin.code": line.source_bin.code if line.source_bin else "",
                "line.line_number": line.line_number,
                "line.quantity": line.quantity,
                "line.picked_quantity": line.picked_quantity,
                "line.is_picked": line.is_picked,
                "line.lot_number": line.lot_number,
            })
    return rows


def _prepare_low_stock_queryset(queryset):
    """Apply low stock annotations and filtering."""
    return (
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


EXPORT_FIELDS = {
    "categories": {
        "title": "Categories",
        "filename": "categories",
        "select_related": ["parent"],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("Code", "code"),
            ("Name", "name"),
            ("Parent Code", "parent.code"),
            ("Description", "description"),
            ("Display Order", "display_order"),
            ("Active", "is_active"),
        ],
    },
    "items": {
        "title": "Inventory Items",
        "filename": "items",
        "select_related": ["category"],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("SKU", "sku"),
            ("Name", "name"),
            ("Category Code", "category.code"),
            ("Description", "description"),
            ("Barcode", "barcode"),
            ("Weight (kg)", "weight_kg"),
            ("Length (cm)", "length_cm"),
            ("Width (cm)", "width_cm"),
            ("Height (cm)", "height_cm"),
            ("Unit of Measure", "unit_of_measure"),
            ("Unit Price", "unit_price"),
            ("Min Stock Level", "min_stock_level"),
            ("Reorder Point", "reorder_point"),
            ("Reorder Quantity", "reorder_quantity"),
            ("Active", "is_active"),
        ],
    },
    "locations": {
        "title": "Storage Locations",
        "filename": "locations",
        "select_related": ["zone"],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("Zone Code", "zone.code"),
            ("Code", "code"),
            ("Aisle", "aisle"),
            ("Rack", "rack"),
            ("Level", "level"),
            ("Position", "position"),
            ("Location Type", "location_type"),
            ("X Coordinate", "x_coordinate"),
            ("Y Coordinate", "y_coordinate"),
            ("Z Coordinate", "z_coordinate"),
            ("Max Bins", "max_bins"),
            ("Accessible", "is_accessible"),
            ("Active", "is_active"),
        ],
    },
    "stock": {
        "title": "Inventory Stock",
        "filename": "stock",
        "select_related": ["item", "bin"],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("Item SKU", "item.sku"),
            ("Bin Code", "bin.code"),
            ("Quantity", "quantity"),
            ("Reserved Quantity", "reserved_quantity"),
            ("Lot Number", "lot_number"),
            ("Expiry Date", "expiry_date"),
            ("Manufacture Date", "manufacture_date"),
        ],
    },
    "orders": {
        "title": "Pick Orders",
        "filename": "orders",
        "select_related": ["warehouse"],
        "prefetch_related": ["lines__item", "lines__source_bin"],
        "use_iterator": False,
        "flatten_fn": _flatten_orders,
        "fields": [
            ("Order Number", "order_number"),
            ("Warehouse Code", "warehouse.code"),
            ("Status", "status"),
            ("Priority", "priority"),
            ("Customer Name", "customer_name"),
            ("Customer Code", "customer_code"),
            ("Order Date", "order_date"),
            ("Due Date", "due_date"),
            ("Item SKU", "line.item.sku"),
            ("Bin Code", "line.source_bin.code"),
            ("Line Number", "line.line_number"),
            ("Quantity", "line.quantity"),
            ("Picked Quantity", "line.picked_quantity"),
            ("Picked", "line.is_picked"),
            ("Lot Number", "line.lot_number"),
        ],
    },
    "warehouses": {
        "title": "Warehouses",
        "filename": "warehouses",
        "select_related": [],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("Code", "code"),
            ("Name", "name"),
            ("Description", "description"),
            ("Address Line 1", "address_line_1"),
            ("Address Line 2", "address_line_2"),
            ("City", "city"),
            ("State", "state"),
            ("Postal Code", "postal_code"),
            ("Country", "country"),
            ("Latitude", "latitude"),
            ("Longitude", "longitude"),
            ("Timezone", "timezone"),
            ("Active", "is_active"),
        ],
    },
    "zones": {
        "title": "Warehouse Zones",
        "filename": "zones",
        "select_related": ["warehouse"],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("Warehouse Code", "warehouse.code"),
            ("Code", "code"),
            ("Name", "name"),
            ("Zone Type", "zone_type"),
            ("Floor Level", "floor_level"),
            ("Area (sqft)", "area_sqft"),
            ("Max Drones Allowed", "max_drones_allowed"),
            ("Priority", "priority"),
            ("Active", "is_active"),
            ("No Fly Zone", "is_no_fly_zone"),
        ],
    },
    "ground-stations": {
        "title": "Ground Control Stations",
        "filename": "ground_stations",
        "select_related": ["zone"],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("Zone Code", "zone.code"),
            ("Code", "code"),
            ("Name", "name"),
            ("Hardware ID", "hardware_id"),
            ("IP Address", "ip_address"),
            ("Firmware Version", "firmware_version"),
            ("Max Drones", "max_drones"),
            ("Status", "status"),
            ("Active", "is_active"),
            ("Last Heartbeat", "last_heartbeat"),
        ],
    },
    "work-areas": {
        "title": "Drone Work Areas",
        "filename": "work_areas",
        "select_related": ["ground_control_station"],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("GCS Code", "ground_control_station.code"),
            ("Code", "code"),
            ("Name", "name"),
            ("Area Type", "area_type"),
            ("Min X", "min_x"),
            ("Max X", "max_x"),
            ("Min Y", "min_y"),
            ("Max Y", "max_y"),
            ("Min Z", "min_z"),
            ("Max Z", "max_z"),
            ("Tether Length (m)", "tether_length_m"),
            ("Max Flight Speed (m/s)", "max_flight_speed_mps"),
            ("Max Drones", "max_drones"),
            ("Active", "is_active"),
        ],
    },
    "drones": {
        "title": "Drones",
        "filename": "drones",
        "select_related": ["work_area"],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("Serial Number", "serial_number"),
            ("Name", "name"),
            ("Work Area Code", "work_area.code"),
            ("Model", "model"),
            ("Manufacturer", "manufacturer"),
            ("Firmware Version", "firmware_version"),
            ("Hardware Version", "hardware_version"),
            ("Status", "status"),
            ("Autonomy Mode", "autonomy_mode"),
            ("Total Flight Hours", "total_flight_hours"),
            ("Total Flights", "total_flights"),
            ("Total Distance (km)", "total_distance_km"),
            ("Max Payload (kg)", "max_payload_kg"),
            ("Max Flight Time (min)", "max_flight_time_min"),
            ("Active", "is_active"),
        ],
    },
    "batteries": {
        "title": "Batteries",
        "filename": "batteries",
        "select_related": ["warehouse"],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("Serial Number", "serial_number"),
            ("Name", "name"),
            ("Warehouse Code", "warehouse.code"),
            ("Manufacturer", "manufacturer"),
            ("Model Number", "model_number"),
            ("Chemistry", "chemistry"),
            ("Capacity (mAh)", "capacity_mah"),
            ("Current Capacity (mAh)", "current_capacity_mah"),
            ("Voltage Nominal", "voltage_nominal"),
            ("Cell Count", "cell_count"),
            ("Status", "status"),
            ("Health Status", "health_status"),
            ("Current Charge (%)", "current_charge_percent"),
            ("Cycle Count", "cycle_count"),
            ("Max Cycles", "max_cycles"),
            ("Purchase Date", "purchase_date"),
            ("Warranty Expires", "warranty_expires_at"),
            ("Active", "is_active"),
        ],
    },
    "bins": {
        "title": "Storage Bins",
        "filename": "bins",
        "select_related": ["location", "template"],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("Code", "code"),
            ("Location Code", "location.code"),
            ("Template Name", "template.name"),
            ("Label Value", "label_value"),
            ("Position Index", "position_index"),
            ("Current Weight (kg)", "current_weight_kg"),
            ("Item Count", "item_count"),
            ("Full", "is_full"),
            ("Active", "is_active"),
        ],
    },
    "jobs": {
        "title": "Drone Jobs",
        "filename": "jobs",
        "select_related": [
            "warehouse", "drone", "order", "item", "source_bin", "destination_bin",
        ],
        "prefetch_related": [],
        "use_iterator": True,
        "fields": [
            ("Job Number", "job_number"),
            ("Job Type", "job_type"),
            ("Status", "status"),
            ("Priority", "priority"),
            ("Warehouse Code", "warehouse.code"),
            ("Drone Serial", "drone.serial_number"),
            ("Order Number", "order.order_number"),
            ("Item SKU", "item.sku"),
            ("Source Bin Code", "source_bin.code"),
            ("Destination Bin Code", "destination_bin.code"),
            ("Quantity", "quantity"),
            ("Picked Quantity", "picked_quantity"),
            ("Queued At", "queued_at"),
            ("Started At", "started_at"),
            ("Completed At", "completed_at"),
            ("Error Code", "error_code"),
            ("Error Message", "error_message"),
        ],
    },
    "low-stock": {
        "title": "Low Stock Items",
        "filename": "low_stock",
        "select_related": ["category"],
        "prefetch_related": [],
        "use_iterator": True,
        "queryset_fn": _prepare_low_stock_queryset,
        "fields": [
            ("SKU", "sku"),
            ("Name", "name"),
            ("Category", "category.name"),
            ("Current Stock", "total_stock"),
            ("Min Stock Level", "min_stock_level"),
            ("Deficit", "deficit"),
            ("Reorder Point", "reorder_point"),
            ("Reorder Quantity", "reorder_quantity"),
        ],
    },
}

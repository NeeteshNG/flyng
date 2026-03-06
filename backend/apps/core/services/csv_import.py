"""
CSV Import Processors

Each processor class handles importing a specific data type from CSV.
Uses the existing ImportJob model for progress tracking and error reporting.
"""

import csv
import io
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from django.core.files.base import ContentFile
from django.db import transaction

from apps.core.choices import (
    ImportStatus,
    ImportType,
    OrderPriority,
    StorageLocationType,
    UnitOfMeasure,
)


class BaseCSVImporter:
    """Base class for all CSV import processors."""

    REQUIRED_HEADERS: list[str] = []
    OPTIONAL_HEADERS: list[str] = []
    IMPORT_TYPE: str = ""

    def __init__(self, import_job, organization, warehouse=None):
        self.import_job = import_job
        self.organization = organization
        self.warehouse = warehouse
        self.errors = []  # List of (row_num, row_data, error_msg)

    def get_template_headers(self):
        """Return all headers for CSV template."""
        return self.REQUIRED_HEADERS + self.OPTIONAL_HEADERS

    def validate_headers(self, headers):
        """Check that required headers are present."""
        headers_lower = [h.strip().lower() for h in headers]
        missing = []
        for req in self.REQUIRED_HEADERS:
            if req.lower() not in headers_lower:
                missing.append(req)
        if missing:
            return False, f"Missing required columns: {', '.join(missing)}"
        return True, ""

    def process(self, file_obj):
        """Main processing loop."""
        try:
            content = file_obj.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            self.import_job.fail("File encoding error. Please use UTF-8 encoded CSV.")
            return

        reader = csv.DictReader(io.StringIO(content))
        if not reader.fieldnames:
            self.import_job.fail("Empty CSV file or no headers found.")
            return

        valid, error_msg = self.validate_headers(reader.fieldnames)
        if not valid:
            self.import_job.fail(error_msg)
            return

        # Normalize field names
        rows = []
        for row in reader:
            normalized = {k.strip().lower(): v.strip() if v else "" for k, v in row.items()}
            rows.append(normalized)

        self.import_job.total_rows = len(rows)
        self.import_job.status = ImportStatus.PROCESSING
        self.import_job.save(update_fields=["total_rows", "status", "updated_at"])

        if not rows:
            self.import_job.complete()
            return

        self.import_job.start()
        success_count = 0
        error_count = 0
        skipped_count = 0

        for row_num, row in enumerate(rows, start=2):  # Row 2 = first data row
            try:
                result = self.process_row(row, row_num)
                if result == "success":
                    success_count += 1
                elif result == "skipped":
                    skipped_count += 1
                else:
                    error_count += 1
                    self.errors.append(
                        {"row": row_num, "data": row, "error": result}
                    )
            except Exception as e:
                error_count += 1
                self.errors.append(
                    {"row": row_num, "data": row, "error": str(e)}
                )

            self.import_job.processed_rows = row_num - 1
            self.import_job.success_count = success_count
            self.import_job.error_count = error_count
            self.import_job.skipped_count = skipped_count

        # Save final counts
        self.import_job.processed_rows = len(rows)
        self.import_job.success_count = success_count
        self.import_job.error_count = error_count
        self.import_job.skipped_count = skipped_count
        self.import_job.save(
            update_fields=[
                "processed_rows",
                "success_count",
                "error_count",
                "skipped_count",
                "updated_at",
            ]
        )

        # Generate error report
        if self.errors:
            self._generate_error_csv()
            self.import_job.error_summary = [
                {"row": e["row"], "error": e["error"]} for e in self.errors[:100]
            ]
            self.import_job.save(update_fields=["error_summary", "updated_at"])

        self.import_job.complete()

    def process_row(self, row, row_num):
        """Process a single row. Override in subclasses.

        Returns:
            'success' - row was imported
            'skipped' - row was skipped (duplicate, unchanged)
            str - error message
        """
        raise NotImplementedError

    def _generate_error_csv(self):
        """Generate a CSV file with error rows and error messages."""
        output = io.StringIO()
        all_headers = self.get_template_headers()
        writer = csv.DictWriter(
            output,
            fieldnames=[*[h.lower() for h in all_headers], "error"],
        )
        writer.writeheader()
        for err in self.errors:
            row_with_error = {**err["data"], "error": err["error"]}
            writer.writerow(row_with_error)

        content = output.getvalue().encode("utf-8")
        filename = f"{self.import_job.uuid}_errors.csv"
        self.import_job.error_file.save(filename, ContentFile(content), save=True)

    # -- Parsing helpers --

    @staticmethod
    def parse_decimal(value, field_name, required=False):
        if not value:
            if required:
                return None, f"{field_name} is required"
            return None, None
        try:
            d = Decimal(value)
            if d < 0:
                return None, f"{field_name} must be non-negative"
            return d, None
        except InvalidOperation:
            return None, f"{field_name}: invalid number '{value}'"

    @staticmethod
    def parse_int(value, field_name, required=False, min_val=0):
        if not value:
            if required:
                return None, f"{field_name} is required"
            return None, None
        try:
            i = int(value)
            if i < min_val:
                return None, f"{field_name} must be >= {min_val}"
            return i, None
        except ValueError:
            return None, f"{field_name}: invalid integer '{value}'"

    @staticmethod
    def parse_bool(value, default=True):
        if not value:
            return default
        return value.lower() in ("true", "1", "yes", "y")

    @staticmethod
    def parse_date(value, field_name):
        if not value:
            return None, None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                return datetime.strptime(value, fmt).date(), None
            except ValueError:
                continue
        return None, f"{field_name}: invalid date '{value}' (use YYYY-MM-DD)"


class ItemCategoryImporter(BaseCSVImporter):
    """Import item categories from CSV."""

    REQUIRED_HEADERS = ["code", "name"]
    OPTIONAL_HEADERS = ["parent_code", "description", "display_order"]
    IMPORT_TYPE = ImportType.CATEGORIES

    def process_row(self, row, row_num):
        from apps.inventory.models import ItemCategory

        code = row.get("code", "")
        name = row.get("name", "")

        if not code:
            return "code is required"
        if not name:
            return "name is required"

        parent = None
        parent_code = row.get("parent_code", "")
        if parent_code:
            try:
                parent = ItemCategory.objects.get(
                    organization=self.organization, code=parent_code
                )
            except ItemCategory.DoesNotExist:
                return f"Parent category '{parent_code}' not found"

        display_order, err = self.parse_int(row.get("display_order", ""), "display_order")
        if err:
            return err

        with transaction.atomic():
            obj, created = ItemCategory.objects.update_or_create(
                organization=self.organization,
                code=code,
                defaults={
                    "name": name,
                    "parent": parent,
                    "description": row.get("description", ""),
                    "display_order": display_order or 0,
                    "is_active": True,
                },
            )
        return "success" if created else "skipped"


class InventoryItemImporter(BaseCSVImporter):
    """Import inventory items (SKUs) from CSV."""

    REQUIRED_HEADERS = ["sku", "name"]
    OPTIONAL_HEADERS = [
        "category_code",
        "description",
        "barcode",
        "weight_kg",
        "length_cm",
        "width_cm",
        "height_cm",
        "unit_of_measure",
        "unit_price",
        "min_stock_level",
        "reorder_point",
        "reorder_quantity",
    ]
    IMPORT_TYPE = ImportType.ITEMS

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._valid_uom = {c.value.upper() for c in UnitOfMeasure}

    def process_row(self, row, row_num):
        from apps.inventory.models import InventoryItem, ItemCategory

        sku = row.get("sku", "")
        name = row.get("name", "")

        if not sku:
            return "sku is required"
        if not name:
            return "name is required"

        # Resolve category
        category = None
        category_code = row.get("category_code", "")
        if category_code:
            try:
                category = ItemCategory.objects.get(
                    organization=self.organization, code=category_code
                )
            except ItemCategory.DoesNotExist:
                return f"Category '{category_code}' not found"

        # Validate unit_of_measure
        uom = row.get("unit_of_measure", "").upper() or "EACH"
        if uom not in self._valid_uom:
            return f"Invalid unit_of_measure '{uom}'. Valid: {', '.join(sorted(self._valid_uom))}"

        # Parse numeric fields
        defaults = {"name": name, "category": category, "unit_of_measure": uom, "is_active": True}

        desc = row.get("description", "")
        if desc:
            defaults["description"] = desc

        barcode = row.get("barcode", "")
        if barcode:
            defaults["barcode"] = barcode

        for field in ["weight_kg", "length_cm", "width_cm", "height_cm", "unit_price"]:
            val, err = self.parse_decimal(row.get(field, ""), field)
            if err:
                return err
            if val is not None:
                defaults[field] = val

        for field in ["min_stock_level", "reorder_point", "reorder_quantity"]:
            val, err = self.parse_int(row.get(field, ""), field)
            if err:
                return err
            if val is not None:
                defaults[field] = val

        with transaction.atomic():
            obj, created = InventoryItem.objects.update_or_create(
                organization=self.organization,
                sku=sku,
                defaults=defaults,
            )
        return "success" if created else "skipped"


class StorageLocationImporter(BaseCSVImporter):
    """Import storage locations from CSV."""

    REQUIRED_HEADERS = ["zone_code", "code"]
    OPTIONAL_HEADERS = [
        "aisle",
        "rack",
        "level",
        "position",
        "location_type",
        "x_coordinate",
        "y_coordinate",
        "z_coordinate",
        "max_bins",
        "is_accessible",
    ]
    IMPORT_TYPE = ImportType.LOCATIONS

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._valid_types = {c.value.upper() for c in StorageLocationType}
        self._zone_cache = {}

    def _get_zone(self, zone_code):
        if zone_code in self._zone_cache:
            return self._zone_cache[zone_code]

        from apps.warehouses.models import WarehouseZone

        try:
            zone = WarehouseZone.objects.get(
                warehouse=self.warehouse, code=zone_code
            )
            self._zone_cache[zone_code] = zone
            return zone
        except WarehouseZone.DoesNotExist:
            return None

    def process_row(self, row, row_num):
        from apps.inventory.models import StorageLocation

        zone_code = row.get("zone_code", "")
        code = row.get("code", "")

        if not zone_code:
            return "zone_code is required"
        if not code:
            return "code is required"

        zone = self._get_zone(zone_code)
        if not zone:
            return f"Zone '{zone_code}' not found in warehouse"

        # Validate location_type
        loc_type = row.get("location_type", "").upper() or "RACK"
        if loc_type not in self._valid_types:
            return f"Invalid location_type '{loc_type}'. Valid: {', '.join(sorted(self._valid_types))}"

        defaults = {
            "aisle": row.get("aisle", ""),
            "rack": row.get("rack", ""),
            "level": row.get("level", ""),
            "position": row.get("position", ""),
            "location_type": loc_type,
            "is_accessible": self.parse_bool(row.get("is_accessible", "")),
            "is_active": True,
        }

        for field in ["x_coordinate", "y_coordinate", "z_coordinate"]:
            val, err = self.parse_decimal(row.get(field, ""), field)
            if err:
                return err
            if val is not None:
                defaults[field] = val

        max_bins, err = self.parse_int(row.get("max_bins", ""), "max_bins", min_val=1)
        if err:
            return err
        if max_bins is not None:
            defaults["max_bins"] = max_bins

        with transaction.atomic():
            obj, created = StorageLocation.objects.update_or_create(
                zone=zone,
                code=code,
                defaults=defaults,
            )
        return "success" if created else "skipped"


class InventoryStockImporter(BaseCSVImporter):
    """Import inventory stock from CSV."""

    REQUIRED_HEADERS = ["item_sku", "bin_code", "quantity"]
    OPTIONAL_HEADERS = ["lot_number", "expiry_date", "manufacture_date"]
    IMPORT_TYPE = ImportType.INVENTORY

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._item_cache = {}
        self._bin_cache = {}

    def _get_item(self, sku):
        if sku in self._item_cache:
            return self._item_cache[sku]

        from apps.inventory.models import InventoryItem

        try:
            item = InventoryItem.objects.get(
                organization=self.organization, sku=sku
            )
            self._item_cache[sku] = item
            return item
        except InventoryItem.DoesNotExist:
            return None

    def _get_bin(self, bin_code):
        if bin_code in self._bin_cache:
            return self._bin_cache[bin_code]

        from apps.inventory.models import StorageBin

        try:
            bin_obj = StorageBin.objects.get(
                code=bin_code,
                location__zone__warehouse=self.warehouse,
            )
            self._bin_cache[bin_code] = bin_obj
            return bin_obj
        except StorageBin.DoesNotExist:
            return None
        except StorageBin.MultipleObjectsReturned:
            return None

    def process_row(self, row, row_num):
        from apps.inventory.models import InventoryStock

        item_sku = row.get("item_sku", "")
        bin_code = row.get("bin_code", "")
        qty_str = row.get("quantity", "")

        if not item_sku:
            return "item_sku is required"
        if not bin_code:
            return "bin_code is required"

        quantity, err = self.parse_int(qty_str, "quantity", required=True, min_val=0)
        if err:
            return err

        item = self._get_item(item_sku)
        if not item:
            return f"Item with SKU '{item_sku}' not found"

        bin_obj = self._get_bin(bin_code)
        if not bin_obj:
            return f"Bin '{bin_code}' not found in warehouse"

        expiry_date, err = self.parse_date(row.get("expiry_date", ""), "expiry_date")
        if err:
            return err

        manufacture_date, err = self.parse_date(
            row.get("manufacture_date", ""), "manufacture_date"
        )
        if err:
            return err

        lot_number = row.get("lot_number", "")

        with transaction.atomic():
            if lot_number:
                # With lot_number, upsert by (bin, item, lot_number)
                obj, created = InventoryStock.objects.update_or_create(
                    bin=bin_obj,
                    item=item,
                    lot_number=lot_number,
                    defaults={
                        "quantity": quantity,
                        "expiry_date": expiry_date,
                        "manufacture_date": manufacture_date,
                    },
                )
            else:
                # Without lot_number, upsert by (bin, item)
                obj, created = InventoryStock.objects.update_or_create(
                    bin=bin_obj,
                    item=item,
                    defaults={
                        "quantity": quantity,
                        "lot_number": "",
                        "expiry_date": expiry_date,
                        "manufacture_date": manufacture_date,
                    },
                )
        return "success" if created else "skipped"


class PickOrderImporter(BaseCSVImporter):
    """Import pick orders from CSV.

    Each row represents an order line. Multiple rows with the same
    order_number are grouped into a single PickOrder.
    """

    REQUIRED_HEADERS = ["order_number", "item_sku", "quantity"]
    OPTIONAL_HEADERS = [
        "warehouse_code",
        "priority",
        "customer_name",
        "customer_code",
        "order_date",
        "due_date",
        "notes",
        "bin_code",
        "line_lot_number",
    ]
    IMPORT_TYPE = ImportType.ORDERS

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._order_cache = {}
        self._item_cache = {}
        self._warehouse_cache = {}
        self._line_counters = {}  # order_number -> next line_number
        self._valid_priorities = {c.value.upper() for c in OrderPriority}

    def _get_item(self, sku):
        if sku in self._item_cache:
            return self._item_cache[sku]

        from apps.inventory.models import InventoryItem

        try:
            item = InventoryItem.objects.get(organization=self.organization, sku=sku)
            self._item_cache[sku] = item
            return item
        except InventoryItem.DoesNotExist:
            return None

    def _get_warehouse(self, code):
        if code in self._warehouse_cache:
            return self._warehouse_cache[code]

        from apps.warehouses.models import Warehouse

        try:
            wh = Warehouse.objects.get(organization=self.organization, code=code)
            self._warehouse_cache[code] = wh
            return wh
        except Warehouse.DoesNotExist:
            return None

    def _get_bin(self, bin_code, warehouse):
        from apps.inventory.models import StorageBin

        try:
            return StorageBin.objects.get(
                code=bin_code,
                location__zone__warehouse=warehouse,
            )
        except (StorageBin.DoesNotExist, StorageBin.MultipleObjectsReturned):
            return None

    def process_row(self, row, row_num):
        from apps.orders.models import PickOrder, PickOrderLine

        order_number = row.get("order_number", "")
        item_sku = row.get("item_sku", "")
        qty_str = row.get("quantity", "")

        if not order_number:
            return "order_number is required"
        if not item_sku:
            return "item_sku is required"

        quantity, err = self.parse_int(qty_str, "quantity", required=True, min_val=1)
        if err:
            return err

        item = self._get_item(item_sku)
        if not item:
            return f"Item with SKU '{item_sku}' not found"

        # Get or create the order
        if order_number not in self._order_cache:
            # Determine warehouse
            warehouse = self.warehouse
            warehouse_code = row.get("warehouse_code", "")
            if warehouse_code:
                warehouse = self._get_warehouse(warehouse_code)
                if not warehouse:
                    return f"Warehouse '{warehouse_code}' not found"

            if not warehouse:
                return "warehouse is required (set warehouse_code or select warehouse)"

            # Parse priority
            priority = row.get("priority", "").upper() or "NORMAL"
            if priority not in self._valid_priorities:
                return f"Invalid priority '{priority}'. Valid: {', '.join(sorted(self._valid_priorities))}"

            order_date, err = self.parse_date(row.get("order_date", ""), "order_date")
            if err:
                return err

            due_date, err = self.parse_date(row.get("due_date", ""), "due_date")
            if err:
                return err

            with transaction.atomic():
                order, created = PickOrder.objects.get_or_create(
                    order_number=order_number,
                    defaults={
                        "organization": self.organization,
                        "warehouse": warehouse,
                        "priority": priority,
                        "customer_name": row.get("customer_name", ""),
                        "customer_code": row.get("customer_code", ""),
                        "order_date": order_date or date.today(),
                        "due_date": due_date,
                        "notes": row.get("notes", ""),
                    },
                )
            self._order_cache[order_number] = order
            self._line_counters[order_number] = (
                order.lines.count() + 1 if not created else 1
            )
        else:
            order = self._order_cache[order_number]

        # Resolve bin
        source_bin = None
        bin_code = row.get("bin_code", "")
        if bin_code:
            source_bin = self._get_bin(bin_code, order.warehouse)
            if not source_bin:
                return f"Bin '{bin_code}' not found in warehouse"

        if not source_bin:
            # Try to find a bin with stock for this item
            from apps.inventory.models import InventoryStock

            stock = (
                InventoryStock.objects.filter(
                    item=item,
                    bin__location__zone__warehouse=order.warehouse,
                    quantity__gt=0,
                )
                .select_related("bin")
                .first()
            )
            if stock:
                source_bin = stock.bin
            else:
                return f"No bin with stock found for item '{item_sku}' in warehouse"

        line_number = self._line_counters[order_number]
        self._line_counters[order_number] = line_number + 1

        with transaction.atomic():
            PickOrderLine.objects.create(
                order=order,
                item=item,
                source_bin=source_bin,
                quantity=quantity,
                line_number=line_number,
                lot_number=row.get("line_lot_number", ""),
            )

        return "success"


# Registry mapping import types to processor classes
IMPORTER_REGISTRY = {
    ImportType.CATEGORIES: ItemCategoryImporter,
    ImportType.ITEMS: InventoryItemImporter,
    ImportType.LOCATIONS: StorageLocationImporter,
    ImportType.INVENTORY: InventoryStockImporter,
    ImportType.ORDERS: PickOrderImporter,
}

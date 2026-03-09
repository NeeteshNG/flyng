"""
Granular Permission Matrix

Maps UserRole → set of permission codes.
Permission codes follow the convention: {app_label}.{resource}.{action}

Standard CRUD actions: list, retrieve, create, update, partial_update, destroy
Custom actions use their function name: confirm, start_picking, pick, etc.

Wildcard patterns:
  "*"              → all permissions (ADMIN only)
  "app.resource.*" → all actions on a resource
  "*.*.action"     → an action across all resources (e.g., *.*.list)
"""

# All permission codes in the system, grouped by app/resource.
# This serves as documentation and is used by get_all_permissions().
ALL_PERMISSIONS = [
    # ── Inventory ──
    "inventory.storagelocation.list",
    "inventory.storagelocation.retrieve",
    "inventory.storagelocation.create",
    "inventory.storagelocation.update",
    "inventory.storagelocation.partial_update",
    "inventory.storagelocation.destroy",

    "inventory.storagebin.list",
    "inventory.storagebin.retrieve",
    "inventory.storagebin.create",
    "inventory.storagebin.update",
    "inventory.storagebin.partial_update",
    "inventory.storagebin.destroy",

    "inventory.storagebintemplate.list",
    "inventory.storagebintemplate.retrieve",
    "inventory.storagebintemplate.create",
    "inventory.storagebintemplate.update",
    "inventory.storagebintemplate.partial_update",
    "inventory.storagebintemplate.destroy",

    "inventory.binlabeltype.list",
    "inventory.binlabeltype.retrieve",
    "inventory.binlabeltype.create",
    "inventory.binlabeltype.update",
    "inventory.binlabeltype.partial_update",
    "inventory.binlabeltype.destroy",

    "inventory.itemcategory.list",
    "inventory.itemcategory.retrieve",
    "inventory.itemcategory.create",
    "inventory.itemcategory.update",
    "inventory.itemcategory.partial_update",
    "inventory.itemcategory.destroy",

    "inventory.inventoryitem.list",
    "inventory.inventoryitem.retrieve",
    "inventory.inventoryitem.create",
    "inventory.inventoryitem.update",
    "inventory.inventoryitem.partial_update",
    "inventory.inventoryitem.destroy",
    "inventory.inventoryitem.stats",
    "inventory.inventoryitem.low_stock_alerts",
    "inventory.inventoryitem.low_stock_stats",

    "inventory.inventorystock.list",
    "inventory.inventorystock.retrieve",
    "inventory.inventorystock.create",
    "inventory.inventorystock.update",
    "inventory.inventorystock.partial_update",
    "inventory.inventorystock.destroy",

    # ── Orders ──
    "orders.pickorder.list",
    "orders.pickorder.retrieve",
    "orders.pickorder.create",
    "orders.pickorder.update",
    "orders.pickorder.partial_update",
    "orders.pickorder.destroy",
    "orders.pickorder.confirm",
    "orders.pickorder.start_picking",
    "orders.pickorder.complete_picking",
    "orders.pickorder.pack",
    "orders.pickorder.ship",
    "orders.pickorder.deliver",
    "orders.pickorder.hold",

    "orders.pickorderline.list",
    "orders.pickorderline.retrieve",
    "orders.pickorderline.create",
    "orders.pickorderline.update",
    "orders.pickorderline.partial_update",
    "orders.pickorderline.destroy",
    "orders.pickorderline.pick",

    "orders.pickorderbatch.list",
    "orders.pickorderbatch.retrieve",
    "orders.pickorderbatch.create",
    "orders.pickorderbatch.update",
    "orders.pickorderbatch.partial_update",
    "orders.pickorderbatch.destroy",
    "orders.pickorderbatch.complete",

    # ── Warehouses ──
    "warehouses.warehouse.list",
    "warehouses.warehouse.retrieve",
    "warehouses.warehouse.create",
    "warehouses.warehouse.update",
    "warehouses.warehouse.partial_update",
    "warehouses.warehouse.destroy",
    "warehouses.warehouse.contacts",
    "warehouses.warehouse.add_contact",
    "warehouses.warehouse.zones",

    "warehouses.warehousecontact.list",
    "warehouses.warehousecontact.retrieve",
    "warehouses.warehousecontact.create",
    "warehouses.warehousecontact.update",
    "warehouses.warehousecontact.partial_update",
    "warehouses.warehousecontact.destroy",

    "warehouses.warehousezone.list",
    "warehouses.warehousezone.retrieve",
    "warehouses.warehousezone.create",
    "warehouses.warehousezone.update",
    "warehouses.warehousezone.partial_update",
    "warehouses.warehousezone.destroy",
    "warehouses.warehousezone.ground_control_stations",
    "warehouses.warehousezone.work_areas",

    "warehouses.groundcontrolstation.list",
    "warehouses.groundcontrolstation.retrieve",
    "warehouses.groundcontrolstation.create",
    "warehouses.groundcontrolstation.update",
    "warehouses.groundcontrolstation.partial_update",
    "warehouses.groundcontrolstation.destroy",

    "warehouses.droneworkarea.list",
    "warehouses.droneworkarea.retrieve",
    "warehouses.droneworkarea.create",
    "warehouses.droneworkarea.update",
    "warehouses.droneworkarea.partial_update",
    "warehouses.droneworkarea.destroy",

    # ── Drones ──
    "drones.drone.list",
    "drones.drone.retrieve",
    "drones.drone.create",
    "drones.drone.update",
    "drones.drone.partial_update",
    "drones.drone.destroy",
    "drones.drone.telemetry",
    "drones.drone.maintenance",

    "drones.dronemaintenancerecord.list",
    "drones.dronemaintenancerecord.retrieve",
    "drones.dronemaintenancerecord.create",
    "drones.dronemaintenancerecord.update",
    "drones.dronemaintenancerecord.partial_update",
    "drones.dronemaintenancerecord.destroy",
    "drones.dronemaintenancerecord.complete",

    # ── Batteries ──
    "batteries.dronebattery.list",
    "batteries.dronebattery.retrieve",
    "batteries.dronebattery.create",
    "batteries.dronebattery.update",
    "batteries.dronebattery.partial_update",
    "batteries.dronebattery.destroy",
    "batteries.dronebattery.charging_history",
    "batteries.dronebattery.swap_history",

    # ── Jobs ──
    "jobs.dronejob.list",
    "jobs.dronejob.retrieve",
    "jobs.dronejob.create",
    "jobs.dronejob.update",
    "jobs.dronejob.partial_update",
    "jobs.dronejob.destroy",
    "jobs.dronejob.events",
    "jobs.dronejob.queue",
    "jobs.dronejob.assign",
    "jobs.dronejob.start",
    "jobs.dronejob.complete",
    "jobs.dronejob.fail",
    "jobs.dronejob.pause",
    "jobs.dronejob.resume",
    "jobs.dronejob.retry",

    # ── Core ──
    "core.importjob.list",
    "core.importjob.retrieve",
    "core.importjob.create",
    "core.importjob.update",
    "core.importjob.partial_update",
    "core.importjob.destroy",

    "core.export.list",  # ExportView uses GET
]


# ── Role → Permission Mapping ──

ROLE_PERMISSIONS: dict[str, set[str]] = {
    # Admin: full access (wildcard)
    "ADMIN": {"*"},

    # Manager: full CRUD on all resources, minus a few admin-only things
    "MANAGER": {
        # Inventory — full CRUD
        "inventory.storagelocation.*",
        "inventory.storagebin.*",
        "inventory.storagebintemplate.*",
        "inventory.binlabeltype.*",
        "inventory.itemcategory.*",
        "inventory.inventoryitem.*",
        "inventory.inventorystock.*",
        # Orders — full CRUD + all transitions
        "orders.pickorder.*",
        "orders.pickorderline.*",
        "orders.pickorderbatch.*",
        # Warehouses — full CRUD
        "warehouses.warehouse.*",
        "warehouses.warehousecontact.*",
        "warehouses.warehousezone.*",
        "warehouses.groundcontrolstation.*",
        "warehouses.droneworkarea.*",
        # Drones — full CRUD
        "drones.drone.*",
        "drones.dronemaintenancerecord.*",
        # Batteries — full CRUD
        "batteries.dronebattery.*",
        # Jobs — full CRUD + transitions
        "jobs.dronejob.*",
        # Core — imports + exports
        "core.importjob.list",
        "core.importjob.retrieve",
        "core.importjob.create",
        "core.export.list",
    },

    # Operator: read all, write orders/stock, pick lines, run jobs
    "OPERATOR": {
        # Read all resources
        "*.*.list",
        "*.*.retrieve",
        # Orders — create, update, state transitions
        "orders.pickorder.create",
        "orders.pickorder.update",
        "orders.pickorder.partial_update",
        "orders.pickorder.confirm",
        "orders.pickorder.start_picking",
        "orders.pickorder.complete_picking",
        "orders.pickorder.pack",
        "orders.pickorder.ship",
        "orders.pickorder.deliver",
        "orders.pickorder.hold",
        "orders.pickorderline.create",
        "orders.pickorderline.update",
        "orders.pickorderline.partial_update",
        "orders.pickorderline.pick",
        "orders.pickorderbatch.create",
        "orders.pickorderbatch.update",
        "orders.pickorderbatch.partial_update",
        "orders.pickorderbatch.complete",
        # Stock — create and update
        "inventory.inventorystock.create",
        "inventory.inventorystock.update",
        "inventory.inventorystock.partial_update",
        # Jobs — queue, assign, transitions
        "jobs.dronejob.create",
        "jobs.dronejob.update",
        "jobs.dronejob.partial_update",
        "jobs.dronejob.queue",
        "jobs.dronejob.assign",
        "jobs.dronejob.start",
        "jobs.dronejob.complete",
        "jobs.dronejob.fail",
        "jobs.dronejob.pause",
        "jobs.dronejob.resume",
        "jobs.dronejob.retry",
        # Drone telemetry/maintenance read (already covered by *.*.retrieve)
        "drones.drone.telemetry",
        "drones.drone.maintenance",
        "batteries.dronebattery.charging_history",
        "batteries.dronebattery.swap_history",
        # Inventory read-only custom actions
        "inventory.inventoryitem.stats",
        "inventory.inventoryitem.low_stock_alerts",
        "inventory.inventoryitem.low_stock_stats",
        # Warehouse read-only nested actions
        "warehouses.warehouse.contacts",
        "warehouses.warehouse.zones",
        "warehouses.warehousezone.ground_control_stations",
        "warehouses.warehousezone.work_areas",
        # Jobs events read
        "jobs.dronejob.events",
        # Core — imports + exports
        "core.importjob.create",
        "core.export.list",
    },

    # Viewer: read-only access + exports
    "VIEWER": {
        "*.*.list",
        "*.*.retrieve",
        # Read-only custom actions
        "drones.drone.telemetry",
        "drones.drone.maintenance",
        "batteries.dronebattery.charging_history",
        "batteries.dronebattery.swap_history",
        "inventory.inventoryitem.stats",
        "inventory.inventoryitem.low_stock_alerts",
        "inventory.inventoryitem.low_stock_stats",
        "warehouses.warehouse.contacts",
        "warehouses.warehouse.zones",
        "warehouses.warehousezone.ground_control_stations",
        "warehouses.warehousezone.work_areas",
        "jobs.dronejob.events",
        # Exports
        "core.export.list",
    },
}


def has_permission(role: str, permission_code: str) -> bool:
    """
    Check if a role has a specific permission.

    Supports wildcard patterns:
      "*"              — matches everything (ADMIN)
      "app.resource.*" — matches any action on a specific resource
      "*.*.action"     — matches a specific action on any resource
    """
    perms = ROLE_PERMISSIONS.get(role, set())

    # Full wildcard (ADMIN)
    if "*" in perms:
        return True

    # Exact match
    if permission_code in perms:
        return True

    # Wildcard matching
    parts = permission_code.split(".")
    if len(parts) == 3:
        app, resource, action = parts
        # Check "app.resource.*"
        if f"{app}.{resource}.*" in perms:
            return True
        # Check "*.*.action"
        if f"*.*.{action}" in perms:
            return True

    return False


def get_permissions_for_role(role: str) -> list[str]:
    """
    Get all expanded permission codes for a role.

    Expands wildcards against ALL_PERMISSIONS for frontend consumption.
    """
    perms = ROLE_PERMISSIONS.get(role, set())

    # ADMIN gets everything
    if "*" in perms:
        return sorted(ALL_PERMISSIONS)

    result = set()
    for code in ALL_PERMISSIONS:
        if has_permission(role, code):
            result.add(code)

    return sorted(result)

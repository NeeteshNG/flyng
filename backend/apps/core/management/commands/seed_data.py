"""
Management command to seed the database with comprehensive sample data.

Usage:
    python manage.py seed_data          # Seed everything
    python manage.py seed_data --flush  # Clear existing data first, then seed
"""

import random
from contextlib import contextmanager
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction


@contextmanager
def disable_history():
    """Temporarily disable django-simple-history to avoid modeltranslation field conflicts."""
    from django.db.models.signals import post_save, pre_save

    # Snapshot current receivers and filter out simple_history ones
    pre_save_original = pre_save.receivers[:]
    post_save_original = post_save.receivers[:]

    pre_save.receivers = [
        r for r in pre_save.receivers
        if not _is_history_receiver(r)
    ]
    post_save.receivers = [
        r for r in post_save.receivers
        if not _is_history_receiver(r)
    ]

    # Clear sender caches so Django uses the filtered list
    pre_save.sender_receivers_cache.clear()
    post_save.sender_receivers_cache.clear()

    try:
        yield
    finally:
        pre_save.receivers = pre_save_original
        post_save.receivers = post_save_original
        pre_save.sender_receivers_cache.clear()
        post_save.sender_receivers_cache.clear()


def _is_history_receiver(receiver_entry):
    """Check if a signal receiver entry is from simple_history."""
    # receiver_entry is a tuple: (dispatch_uid_or_key, receiver_weakref_or_func, ...)
    # In Django 5.x the format may vary; inspect all tuple elements
    for item in receiver_entry:
        s = str(item)
        if 'simple_history' in s or 'HistoricalRecords' in s:
            return True
    return False

from apps.users.models import User
from apps.organizations.models import (
    Plan,
    Organization,
    OrganizationSettings,
    OrganizationMembership,
    Subscription,
)
from apps.warehouses.models import (
    Warehouse,
    WarehouseProfile,
    WarehouseContact,
    WarehouseZone,
    GroundControlStation,
    DroneWorkArea,
)
from apps.drones.models import Drone
from apps.batteries.models import DroneBattery
from apps.inventory.models import (
    StorageLocation,
    BinLabelType,
    StorageBinTemplate,
    StorageBin,
    ItemCategory,
    InventoryItem,
    InventoryStock,
)
from apps.orders.models import PickOrder, PickOrderLine
from apps.jobs.models import DroneJob
from apps.logs.models import DroneFlightLog, FlightGraphTemplate, FlightLogGraph


def uoc(manager, defaults=None, **lookup):
    """
    Workaround for update_or_create failing with modeltranslation + select_for_update.
    Same signature as Django's update_or_create but avoids SELECT ... FOR UPDATE.
    """
    defaults = defaults or {}
    try:
        obj = manager.get(**lookup)
        for key, val in defaults.items():
            setattr(obj, key, val)
        obj.save()
        return obj, False
    except manager.model.DoesNotExist:
        return manager.create(**lookup, **defaults), True


class Command(BaseCommand):
    help = "Seed the database with comprehensive sample data for development and testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing data before seeding (keeps superusers).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # Disable simple_history signals to avoid modeltranslation field conflicts
        with disable_history():
            if options["flush"]:
                self.stdout.write(self.style.WARNING("Flushing existing data..."))
                self._flush()

            self.stdout.write(self.style.NOTICE("Seeding database..."))
            self._seed_all()

        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))

    def _seed_all(self):

        now = timezone.now()

        # 1. Plans
        plans = self._seed_plans()

        # 2. Users
        users = self._seed_users()

        # 3. Organization
        org = self._seed_organization(plans["professional"], users["admin"])

        # 4. Memberships
        self._seed_memberships(org, users)

        # 5. Subscription
        self._seed_subscription(org, plans["professional"], now)

        # 6. Warehouses
        warehouses = self._seed_warehouses(org)

        # 7. Zones
        zones = self._seed_zones(warehouses)

        # 8. GCS
        gcs_list = self._seed_gcs(zones)

        # 9. Work Areas
        work_areas = self._seed_work_areas(gcs_list)

        # 10. Batteries
        batteries = self._seed_batteries(warehouses)

        # 11. Drones
        drones = self._seed_drones(work_areas, batteries)

        # 12. Inventory infrastructure
        label_type = self._seed_label_type(org)
        bin_template = self._seed_bin_template(org, label_type)
        categories = self._seed_categories(org)
        items = self._seed_items(org, categories)

        # 13. Storage locations, bins, stock
        self._seed_storage(zones, bin_template, items, now)

        # 14. Orders & Jobs
        self._seed_orders(org, warehouses[0], items, users, now)

        # 15. Flight Logs & Graph Templates
        flight_logs = self._seed_flight_logs(org, warehouses, drones, users["admin"], now)
        templates = self._seed_graph_templates(org, users["admin"])
        self._seed_flight_log_graphs(flight_logs, templates, now)

    def _flush(self):
        """Remove seeded data while keeping superusers. Uses TRUNCATE CASCADE to bypass safedelete."""
        from django.db import connection

        models_to_flush = [
            FlightLogGraph, FlightGraphTemplate, DroneFlightLog,
            DroneJob, PickOrderLine, PickOrder,
            InventoryStock, StorageBin, StorageLocation,
            StorageBinTemplate, BinLabelType, InventoryItem, ItemCategory,
            Drone, DroneBattery, DroneWorkArea, GroundControlStation,
            WarehouseZone, WarehouseContact, WarehouseProfile,
            Subscription, OrganizationMembership, OrganizationSettings,
            Organization, Plan,
        ]
        table_names = [f'"{m._meta.db_table}"' for m in models_to_flush]
        with connection.cursor() as cursor:
            cursor.execute(f"TRUNCATE TABLE {', '.join(table_names)} CASCADE")

        User.objects.filter(is_superuser=False).delete()
        self.stdout.write("  Flushed all seeded data.")

    # ── Plans ───────────────────────────────────────────────────────

    def _seed_plans(self):
        self.stdout.write("  Creating plans...")
        data = [
            {
                "name": "Free",
                "plan_type": "FREE",
                "description": "Get started with basic warehouse management.",
                "monthly_price": Decimal("0"),
                "annual_price": Decimal("0"),
                "max_users": 2,
                "max_warehouses": 1,
                "max_drones": 1,
                "max_storage_locations": 50,
                "max_orders_per_month": 100,
                "analytics_enabled": False,
                "api_access_enabled": False,
                "priority_support": False,
                "custom_branding": False,
                "audit_logs_enabled": False,
                "export_enabled": False,
                "api_rate_limit_per_minute": 10,
                "data_retention_days": 30,
                "display_order": 1,
            },
            {
                "name": "Starter",
                "plan_type": "STARTER",
                "description": "For small teams getting started with drone automation.",
                "monthly_price": Decimal("4999"),
                "annual_price": Decimal("49990"),
                "max_users": 10,
                "max_warehouses": 2,
                "max_drones": 5,
                "max_storage_locations": 500,
                "max_orders_per_month": 1000,
                "analytics_enabled": True,
                "api_access_enabled": False,
                "priority_support": False,
                "custom_branding": False,
                "audit_logs_enabled": True,
                "export_enabled": True,
                "api_rate_limit_per_minute": 30,
                "data_retention_days": 90,
                "display_order": 2,
            },
            {
                "name": "Professional",
                "plan_type": "PROFESSIONAL",
                "description": "For growing businesses with multiple warehouses.",
                "monthly_price": Decimal("14999"),
                "annual_price": Decimal("149990"),
                "max_users": 50,
                "max_warehouses": 10,
                "max_drones": 25,
                "max_storage_locations": 5000,
                "max_orders_per_month": 10000,
                "analytics_enabled": True,
                "api_access_enabled": True,
                "priority_support": True,
                "custom_branding": False,
                "audit_logs_enabled": True,
                "export_enabled": True,
                "api_rate_limit_per_minute": 100,
                "data_retention_days": 365,
                "display_order": 3,
            },
            {
                "name": "Enterprise",
                "plan_type": "ENTERPRISE",
                "description": "Unlimited access for large-scale operations.",
                "monthly_price": Decimal("49999"),
                "annual_price": Decimal("499990"),
                "max_users": 999,
                "max_warehouses": 100,
                "max_drones": 200,
                "max_storage_locations": 99999,
                "max_orders_per_month": 99999,
                "analytics_enabled": True,
                "api_access_enabled": True,
                "priority_support": True,
                "custom_branding": True,
                "audit_logs_enabled": True,
                "export_enabled": True,
                "api_rate_limit_per_minute": 500,
                "data_retention_days": 730,
                "display_order": 4,
            },
        ]
        plans = {}
        for item in data:
            plan, _ = uoc(Plan.objects,
                plan_type=item.pop("plan_type"), defaults=item
            )
            plans[plan.plan_type.lower()] = plan
        return plans

    # ── Users ───────────────────────────────────────────────────────

    def _seed_users(self):
        self.stdout.write("  Creating users...")
        users = {}

        # Ensure admin superuser exists
        admin, created = uoc(User.objects,
            email="admin@flyng.local",
            defaults={
                "first_name": "Admin",
                "last_name": "User",
                "role": "ADMIN",
                "is_staff": True,
                "is_superuser": True,
                "is_verified": True,
            },
        )
        if created:
            admin.set_password("admin123")
            admin.save()
        users["admin"] = admin

        test_users = [
            ("manager@flyng.local", "Priya", "Sharma", "MANAGER"),
            ("operator@flyng.local", "Rahul", "Kumar", "OPERATOR"),
            ("viewer@flyng.local", "Anita", "Patel", "VIEWER"),
            ("operator2@flyng.local", "Vikram", "Singh", "OPERATOR"),
        ]
        for email, first, last, role in test_users:
            user, created = uoc(User.objects,
                email=email,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "is_verified": True,
                },
            )
            if created:
                user.set_password("test1234")
                user.save()
            users[role.lower()] = user

        return users

    # ── Organization ────────────────────────────────────────────────

    def _seed_organization(self, plan, owner):
        self.stdout.write("  Creating organization...")
        org, _ = uoc(Organization.objects,
            slug="flyng-demo",
            defaults={
                "name": "FlyNG Demo Pvt Ltd",
                "description": "Demo organization for FlyNG drone warehouse management.",
                "email": "contact@flyng.local",
                "phone": "+919876543210",
                "website": "https://flyng.local",
                "address_line1": "123, Tech Park",
                "city": "Bengaluru",
                "state": "Karnataka",
                "postal_code": "560001",
                "country": "India",
                "gst_number": "29AABCT1332L1ZZ",
                "pan_number": "AABCT1332L",
                "plan": plan,
                "owner": owner,
                "is_active": True,
                "is_verified": True,
                "verified_at": timezone.now(),
            },
        )
        # Settings
        uoc(OrganizationSettings.objects,
            organization=org,
            defaults={
                "timezone": "Asia/Kolkata",
                "date_format": "DD/MM/YYYY",
                "language": "en",
                "currency": "INR",
            },
        )
        # Set active org for owner
        owner.active_organization = org
        owner.save(update_fields=["active_organization"])
        return org

    # ── Memberships ─────────────────────────────────────────────────

    def _seed_memberships(self, org, users):
        self.stdout.write("  Creating memberships...")
        membership_data = {
            "admin": ("OWNER", "ADMIN"),
            "manager": ("ADMIN", "MANAGER"),
            "operator": ("MEMBER", "OPERATOR"),
            "viewer": ("MEMBER", "VIEWER"),
        }
        for key, (m_role, u_role) in membership_data.items():
            if key in users:
                uoc(OrganizationMembership.objects,
                    organization=org,
                    user=users[key],
                    defaults={
                        "membership_role": m_role,
                        "user_role": u_role,
                        "is_active": True,
                        "joined_at": timezone.now(),
                    },
                )
                users[key].active_organization = org
                users[key].save(update_fields=["active_organization"])

    # ── Subscription ────────────────────────────────────────────────

    def _seed_subscription(self, org, plan, now):
        self.stdout.write("  Creating subscription...")
        uoc(Subscription.objects,
            organization=org,
            defaults={
                "plan": plan,
                "status": "ACTIVE",
                "billing_cycle": "ANNUAL",
                "amount": plan.annual_price,
                "currency": "INR",
                "started_at": now - timedelta(days=30),
                "current_period_start": now - timedelta(days=30),
                "current_period_end": now + timedelta(days=335),
            },
        )

    # ── Warehouses ──────────────────────────────────────────────────

    def _seed_warehouses(self, org):
        self.stdout.write("  Creating warehouses...")
        wh_data = [
            {
                "name": "Bengaluru Central Warehouse",
                "code": "BLR-C01",
                "description": "Main distribution center in Bengaluru.",
                "address_line_1": "45, Industrial Layout, Peenya",
                "city": "Bengaluru",
                "state": "Karnataka",
                "postal_code": "560058",
                "country": "India",
                "latitude": Decimal("13.0285"),
                "longitude": Decimal("77.5192"),
                "timezone": "Asia/Kolkata",
                "is_active": True,
            },
            {
                "name": "Mumbai Fulfillment Hub",
                "code": "MUM-F01",
                "description": "High-throughput fulfillment center in Mumbai.",
                "address_line_1": "Plot 78, MIDC, Andheri East",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postal_code": "400093",
                "country": "India",
                "latitude": Decimal("19.1136"),
                "longitude": Decimal("72.8697"),
                "timezone": "Asia/Kolkata",
                "is_active": True,
            },
            {
                "name": "Delhi NCR Warehouse",
                "code": "DEL-W01",
                "description": "Northern distribution warehouse.",
                "address_line_1": "Sector 63, Noida",
                "city": "Noida",
                "state": "Uttar Pradesh",
                "postal_code": "201301",
                "country": "India",
                "latitude": Decimal("28.6271"),
                "longitude": Decimal("77.3749"),
                "timezone": "Asia/Kolkata",
                "is_active": True,
            },
        ]
        warehouses = []
        for item in wh_data:
            wh, _ = uoc(Warehouse.objects,
                organization=org, code=item.pop("code"), defaults=item
            )
            # Profile
            uoc(WarehouseProfile.objects,
                warehouse=wh,
                defaults={
                    "operating_hours_start": "08:00",
                    "operating_hours_end": "20:00",
                    "total_area_sqft": Decimal("25000"),
                    "ceiling_height_ft": Decimal("35"),
                    "max_drone_capacity": 10,
                },
            )
            # Contacts
            uoc(WarehouseContact.objects,
                warehouse=wh,
                name=f"{wh.city} Manager",
                defaults={
                    "designation": "Warehouse Manager",
                    "email": f"manager.{wh.code.lower().replace('-', '')}@flyng.local",
                    "phone_primary": "+919876543210",
                    "is_primary": True,
                    "is_active": True,
                },
            )
            warehouses.append(wh)
        return warehouses

    # ── Zones ───────────────────────────────────────────────────────

    def _seed_zones(self, warehouses):
        self.stdout.write("  Creating zones...")
        zone_templates = [
            ("Storage Zone A", "STOR-A", "STORAGE", 0, Decimal("8000")),
            ("Storage Zone B", "STOR-B", "STORAGE", 0, Decimal("6000")),
            ("Picking Zone", "PICK-01", "PICKING", 0, Decimal("4000")),
            ("Staging Area", "STAG-01", "STAGING", 0, Decimal("2000")),
            ("Shipping Dock", "SHIP-01", "SHIPPING", 0, Decimal("3000")),
            ("Receiving Bay", "RECV-01", "RECEIVING", 0, Decimal("2000")),
        ]
        all_zones = {}
        for wh in warehouses:
            zones = []
            for name, code, ztype, floor, area in zone_templates:
                zone, _ = uoc(WarehouseZone.objects,
                    warehouse=wh,
                    code=code,
                    defaults={
                        "name": name,
                        "zone_type": ztype,
                        "floor_level": floor,
                        "area_sqft": area,
                        "max_drones_allowed": 3,
                        "priority": 1,
                        "is_active": True,
                    },
                )
                zones.append(zone)
            all_zones[wh.pk] = zones
        return all_zones

    # ── Ground Control Stations ─────────────────────────────────────

    def _seed_gcs(self, zones_by_wh):
        self.stdout.write("  Creating ground control stations...")
        all_gcs = {}
        for wh_pk, zones in zones_by_wh.items():
            gcs_list = []
            # Put GCS in storage and picking zones
            for i, zone in enumerate(zones[:3]):
                gcs, _ = uoc(GroundControlStation.objects,
                    zone=zone,
                    code=f"GCS-{zone.code}-01",
                    defaults={
                        "name": f"GCS {zone.name}",
                        "description": f"Ground control station for {zone.name}",
                        "hardware_id": f"HW-{zone.warehouse.code}-{i + 1:02d}",
                        "ip_address": f"192.168.{i + 1}.10",
                        "firmware_version": "2.4.1",
                        "max_drones": 3,
                        "status": "ONLINE",
                        "is_active": True,
                        "last_heartbeat": timezone.now(),
                    },
                )
                gcs_list.append(gcs)
            all_gcs[wh_pk] = gcs_list
        return all_gcs

    # ── Work Areas ──────────────────────────────────────────────────

    def _seed_work_areas(self, gcs_by_wh):
        self.stdout.write("  Creating drone work areas...")
        all_work_areas = {}
        for wh_pk, gcs_list in gcs_by_wh.items():
            work_areas = []
            for gcs in gcs_list:
                wa, _ = uoc(DroneWorkArea.objects,
                    ground_control_station=gcs,
                    code=f"WA-{gcs.code}-01",
                    defaults={
                        "name": f"Work Area {gcs.zone.name}",
                        "description": f"Drone work area in {gcs.zone.name}",
                        "area_type": "UNTETHERED",
                        "min_x": Decimal("0"),
                        "max_x": Decimal("50"),
                        "min_y": Decimal("0"),
                        "max_y": Decimal("50"),
                        "min_z": Decimal("0"),
                        "max_z": Decimal("15"),
                        "max_flight_speed_mps": Decimal("3.0"),
                        "max_drones": 2,
                        "is_active": True,
                    },
                )
                work_areas.append(wa)
            all_work_areas[wh_pk] = work_areas
        return all_work_areas

    # ── Batteries ───────────────────────────────────────────────────

    def _seed_batteries(self, warehouses):
        self.stdout.write("  Creating batteries...")
        all_batteries = {}
        for wh in warehouses:
            batteries = []
            for i in range(1, 7):
                charge = random.randint(40, 100)
                cycles = random.randint(10, 200)
                bat, _ = uoc(DroneBattery.objects,
                    serial_number=f"BAT-{wh.code}-{i:03d}",
                    defaults={
                        "name": f"Battery {wh.code}-{i:03d}",
                        "warehouse": wh,
                        "chemistry": "LIPO",
                        "capacity_mah": 5200,
                        "current_capacity_mah": max(4000, 5200 - cycles * 3),
                        "voltage_nominal": Decimal("22.2"),
                        "cell_count": 6,
                        "status": "AVAILABLE" if charge > 30 else "CHARGING",
                        "health_status": "EXCELLENT" if cycles < 50 else ("GOOD" if cycles < 150 else "FAIR"),
                        "current_charge_percent": charge,
                        "cycle_count": cycles,
                        "max_cycles": 500,
                        "purchase_date": (timezone.now() - timedelta(days=random.randint(30, 365))).date(),
                        "manufacturer": "Tattu",
                        "model_number": "TA-6S-5200",
                        "is_active": True,
                    },
                )
                batteries.append(bat)
            all_batteries[wh.pk] = batteries
        return all_batteries

    # ── Drones ──────────────────────────────────────────────────────

    def _seed_drones(self, work_areas_by_wh, batteries_by_wh):
        self.stdout.write("  Creating drones...")
        drone_models = [
            ("DJI", "Matrice 350 RTK", Decimal("2.7"), 55),
            ("DJI", "Mavic 3 Enterprise", Decimal("0.8"), 45),
            ("Skydio", "X10", Decimal("1.0"), 35),
        ]
        all_drones = []
        drone_idx = 0
        for wh_pk, work_areas in work_areas_by_wh.items():
            batteries = batteries_by_wh.get(wh_pk, [])
            bat_idx = 0
            for wa in work_areas:
                for j in range(2):
                    mfg, model, payload, flight_time = drone_models[drone_idx % len(drone_models)]
                    bat = batteries[bat_idx] if bat_idx < len(batteries) else None
                    if bat:
                        bat.status = "IN_USE"
                        bat.save(update_fields=["status"])
                        bat_idx += 1

                    drone, _ = uoc(Drone.objects,
                        serial_number=f"DRN-{drone_idx + 1:04d}",
                        defaults={
                            "name": f"Drone {drone_idx + 1:04d}",
                            "work_area": wa,
                            "current_battery": bat,
                            "model": model,
                            "manufacturer": mfg,
                            "firmware_version": "4.2.0",
                            "hardware_version": "2.0",
                            "status": random.choice(["AVAILABLE", "IDLE", "AVAILABLE"]),
                            "home_x": Decimal("5"),
                            "home_y": Decimal("5"),
                            "home_z": Decimal("0"),
                            "total_flight_hours": Decimal(str(random.randint(10, 500))),
                            "total_flights": random.randint(50, 2000),
                            "total_distance_km": Decimal(str(random.randint(20, 1000))),
                            "max_payload_kg": payload,
                            "max_flight_time_min": flight_time,
                            "is_active": True,
                            "last_heartbeat": timezone.now(),
                            "ip_address": f"192.168.10.{drone_idx + 20}",
                        },
                    )
                    all_drones.append(drone)
                    drone_idx += 1
        return all_drones

    # ── Inventory infrastructure ────────────────────────────────────

    def _seed_label_type(self, org):
        self.stdout.write("  Creating bin label types...")
        lt, _ = uoc(BinLabelType.objects,
            organization=org,
            name="ArUco 6x6",
            defaults={
                "label_type": 1,  # ARUCO
                "dictionary_size": "DICT_6X6_250",
                "marker_size_mm": 100,
                "is_active": True,
            },
        )
        return lt

    def _seed_bin_template(self, org, label_type):
        self.stdout.write("  Creating bin templates...")
        bt, _ = uoc(StorageBinTemplate.objects,
            organization=org,
            name="Standard Bin",
            defaults={
                "label_type": label_type,
                "description": "Standard storage bin (40x30x25 cm)",
                "width": Decimal("40"),
                "height": Decimal("25"),
                "depth": Decimal("30"),
                "max_weight_kg": Decimal("25"),
                "coordinate_type": 0,
                "is_active": True,
            },
        )
        return bt

    def _seed_categories(self, org):
        self.stdout.write("  Creating item categories...")
        cat_data = [
            ("Electronics", "ELEC"),
            ("Mechanical Parts", "MECH"),
            ("Packaging", "PKG"),
            ("Safety Equipment", "SAFE"),
            ("Consumables", "CONS"),
        ]
        categories = []
        for name, code in cat_data:
            cat, _ = uoc(ItemCategory.objects,
                organization=org,
                code=code,
                defaults={"name": name, "is_active": True, "display_order": len(categories) + 1},
            )
            categories.append(cat)
        return categories

    def _seed_items(self, org, categories):
        self.stdout.write("  Creating inventory items...")
        items_data = [
            ("Propeller Set (CW+CCW)", "PROP-SET-01", categories[1], Decimal("0.12"), Decimal("450")),
            ("Motor 2212 920KV", "MOT-2212-01", categories[1], Decimal("0.065"), Decimal("890")),
            ("ESC 30A BLHeli", "ESC-30A-01", categories[0], Decimal("0.028"), Decimal("650")),
            ("Flight Controller FC F7", "FC-F7-01", categories[0], Decimal("0.035"), Decimal("3200")),
            ("GPS Module M10", "GPS-M10-01", categories[0], Decimal("0.020"), Decimal("1800")),
            ("FPV Camera 1200TVL", "CAM-FPV-01", categories[0], Decimal("0.015"), Decimal("1100")),
            ("Landing Gear Set", "LG-SET-01", categories[1], Decimal("0.180"), Decimal("750")),
            ("Hex Bolt M3x10 (100pk)", "BOLT-M3-10", categories[1], Decimal("0.300"), Decimal("120")),
            ("Zip Ties 200mm (100pk)", "ZIP-200-01", categories[2], Decimal("0.150"), Decimal("80")),
            ("Bubble Wrap Roll 10m", "BW-ROLL-01", categories[2], Decimal("0.500"), Decimal("250")),
            ("Safety Goggles", "SAFE-GOG-01", categories[3], Decimal("0.120"), Decimal("350")),
            ("Heat Shrink Tubes (50pk)", "HST-ASST-01", categories[4], Decimal("0.050"), Decimal("95")),
            ("Soldering Wire 100g", "SOLDER-01", categories[4], Decimal("0.100"), Decimal("180")),
            ("LiPo Battery Bag", "BATT-BAG-01", categories[3], Decimal("0.200"), Decimal("450")),
            ("Drone Frame 450mm", "FRAME-450", categories[1], Decimal("0.350"), Decimal("1500")),
            ("Antenna 5.8GHz", "ANT-58-01", categories[0], Decimal("0.010"), Decimal("320")),
            ("Vibration Damper Set", "VIB-DAMP-01", categories[1], Decimal("0.025"), Decimal("150")),
            ("LED Strip 1m RGB", "LED-RGB-01", categories[0], Decimal("0.030"), Decimal("200")),
            ("Servo Motor SG90", "SRV-SG90-01", categories[1], Decimal("0.009"), Decimal("75")),
            ("Power Distribution Board", "PDB-01", categories[0], Decimal("0.040"), Decimal("420")),
        ]
        items = []
        for name, sku, cat, weight, price in items_data:
            item, _ = uoc(InventoryItem.objects,
                organization=org,
                sku=sku,
                defaults={
                    "name": name,
                    "category": cat,
                    "weight_kg": weight,
                    "length_cm": Decimal("15"),
                    "width_cm": Decimal("10"),
                    "height_cm": Decimal("5"),
                    "unit_of_measure": "EACH",
                    "unit_price": price,
                    "min_stock_level": 5,
                    "reorder_point": 10,
                    "reorder_quantity": 25,
                    "is_active": True,
                },
            )
            items.append(item)
        return items

    # ── Storage Locations, Bins, Stock ───────────────────────────────

    def _seed_storage(self, zones_by_wh, bin_template, items, now):
        self.stdout.write("  Creating storage locations, bins, and stock...")
        aruco_id = 1
        for wh_pk, zones in zones_by_wh.items():
            # Use first storage zone
            storage_zones = [z for z in zones if z.zone_type == "STORAGE"]
            if not storage_zones:
                continue

            for zone in storage_zones[:2]:
                for aisle_num in range(1, 4):
                    for rack_num in range(1, 4):
                        loc_code = f"{zone.code}-A{aisle_num}-R{rack_num}"
                        loc, _ = uoc(StorageLocation.objects,
                            zone=zone,
                            code=loc_code,
                            defaults={
                                "aisle": f"A{aisle_num}",
                                "rack": f"R{rack_num}",
                                "level": "L1",
                                "position": "P1",
                                "location_type": "RACK",
                                "max_bins": 4,
                                "is_accessible": True,
                                "is_active": True,
                            },
                        )
                        # Create 2-3 bins per location
                        for bin_idx in range(1, random.randint(3, 5)):
                            bin_code = f"{loc_code}-B{bin_idx}"
                            sbin, _ = uoc(StorageBin.objects,
                                location=loc,
                                code=bin_code,
                                defaults={
                                    "template": bin_template,
                                    "label_value": str(aruco_id),
                                    "position_index": bin_idx,
                                    "current_weight_kg": Decimal("0"),
                                    "item_count": 0,
                                    "is_active": True,
                                },
                            )
                            aruco_id += 1

                            # Add stock to ~60% of bins
                            if random.random() < 0.6:
                                item = random.choice(items)
                                qty = random.randint(5, 50)
                                uoc(InventoryStock.objects,
                                    bin=sbin,
                                    item=item,
                                    defaults={
                                        "quantity": qty,
                                        "reserved_quantity": 0,
                                        "received_at": now - timedelta(days=random.randint(1, 60)),
                                        "last_counted_at": now - timedelta(days=random.randint(0, 14)),
                                    },
                                )
                                sbin.item_count = 1
                                sbin.current_weight_kg = item.weight_kg * qty
                                sbin.save(update_fields=["item_count", "current_weight_kg"])

    # ── Orders & Jobs ───────────────────────────────────────────────

    def _seed_orders(self, org, warehouse, items, users, now):
        self.stdout.write("  Creating orders and jobs...")
        statuses = ["PENDING", "CONFIRMED", "PICKING", "PICKED", "PACKED", "SHIPPED"]
        customers = [
            ("Reliance Industries", "REL-001"),
            ("Tata Motors", "TATA-002"),
            ("Infosys Ltd", "INFY-003"),
            ("Wipro Technologies", "WIPRO-004"),
            ("HCL Technologies", "HCL-005"),
            ("Mahindra & Mahindra", "MAH-006"),
            ("Bajaj Auto", "BAJ-007"),
            ("Godrej Consumer", "GOD-008"),
        ]

        # Get bins with stock for order lines
        stocked_bins = list(
            StorageBin.objects.filter(
                location__zone__warehouse=warehouse,
                item_count__gt=0,
                is_active=True,
            ).select_related("location__zone")[:30]
        )

        for i in range(1, 13):
            customer_name, customer_code = random.choice(customers)
            status = statuses[min(i - 1, len(statuses) - 1)] if i <= 6 else random.choice(statuses[:3])
            order_date = (now - timedelta(days=random.randint(0, 30))).date()

            order, created = uoc(PickOrder.objects,
                organization=org,
                order_number=f"ORD-{i:05d}",
                defaults={
                    "warehouse": warehouse,
                    "status": status,
                    "priority": random.choice(["LOW", "NORMAL", "NORMAL", "HIGH"]),
                    "customer_name": customer_name,
                    "customer_code": customer_code,
                    "shipping_address_line1": f"{random.randint(1, 999)}, MG Road",
                    "shipping_city": random.choice(["Bengaluru", "Mumbai", "Delhi", "Chennai"]),
                    "shipping_state": "Karnataka",
                    "shipping_postal_code": f"{random.randint(100000, 999999)}",
                    "shipping_country": "India",
                    "order_date": order_date,
                    "due_date": order_date + timedelta(days=random.randint(3, 14)),
                    "created_by": users.get("admin"),
                    "notes": f"Sample order #{i}",
                },
            )

            if created and stocked_bins:
                # Add 2-4 order lines
                num_lines = min(random.randint(2, 4), len(stocked_bins))
                selected_bins = random.sample(stocked_bins, num_lines)
                for line_num, sbin in enumerate(selected_bins, 1):
                    stock = InventoryStock.objects.filter(bin=sbin).first()
                    if stock:
                        qty = min(random.randint(1, 5), stock.quantity)
                        uoc(PickOrderLine.objects,
                            order=order,
                            line_number=line_num,
                            defaults={
                                "item": stock.item,
                                "source_bin": sbin,
                                "stock": stock,
                                "quantity": qty,
                                "picked_quantity": qty if status in ("PICKED", "PACKED", "SHIPPED") else 0,
                                "is_picked": status in ("PICKED", "PACKED", "SHIPPED"),
                            },
                        )

        # Create some jobs for the first warehouse
        self.stdout.write("  Creating drone jobs...")
        drones = list(Drone.objects.filter(work_area__ground_control_station__zone__warehouse=warehouse, is_active=True)[:4])
        job_statuses = ["NEW", "QUEUED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "COMPLETED", "COMPLETED"]

        for i in range(1, 9):
            jstatus = job_statuses[min(i - 1, len(job_statuses) - 1)]
            drone = drones[i % len(drones)] if drones else None
            qty = random.randint(1, 10)

            uoc(DroneJob.objects,
                organization=org,
                job_number=f"JOB-{i:05d}",
                defaults={
                    "warehouse": warehouse,
                    "drone": drone if jstatus not in ("NEW", "QUEUED") else None,
                    "job_type": random.choice(["PICK", "SCAN", "MOVE"]),
                    "status": jstatus,
                    "priority": random.choice(["NORMAL", "HIGH"]),
                    "quantity": qty,
                    "picked_quantity": qty if jstatus == "COMPLETED" else 0,
                    "notes": f"Sample job #{i}",
                },
            )

    # ── Flight Logs ──────────────────────────────────────────────

    def _seed_flight_logs(self, org, warehouses, drones, admin_user, now):
        self.stdout.write("  Creating flight logs...")
        flight_logs = []

        for log_idx in range(1, 16):
            drone = drones[(log_idx - 1) % len(drones)] if drones else None
            wh = warehouses[(log_idx - 1) % len(warehouses)]
            days_ago = random.randint(1, 60)
            flight_date = (now - timedelta(days=days_ago)).date()
            duration = random.uniform(120, 1800)  # 2-30 minutes
            distance = random.uniform(200, 5000)
            start_bat = random.uniform(85, 100)
            bat_used = random.uniform(5, 30)
            end_bat = start_bat - bat_used

            # Realistic coordinates near warehouse
            base_lat = float(wh.latitude) if wh.latitude else 13.0285
            base_lon = float(wh.longitude) if wh.longitude else 77.5192

            log, _ = uoc(DroneFlightLog.objects,
                organization=org,
                filename=f"flight_{log_idx:03d}.ulg",
                defaults={
                    "warehouse": wh,
                    "drone": drone,
                    "file": f"flight_logs/{org.pk}/flight_{log_idx:03d}.ulg",
                    "file_size_bytes": random.randint(500_000, 50_000_000),
                    "file_hash": f"{'a' * 60}{log_idx:04d}",
                    "flight_date": flight_date,
                    "flight_duration_seconds": round(duration, 2),
                    "flight_distance_meters": round(distance, 2),
                    "start_latitude": round(base_lat + random.uniform(-0.005, 0.005), 6),
                    "start_longitude": round(base_lon + random.uniform(-0.005, 0.005), 6),
                    "start_altitude": round(random.uniform(0, 5), 2),
                    "end_latitude": round(base_lat + random.uniform(-0.005, 0.005), 6),
                    "end_longitude": round(base_lon + random.uniform(-0.005, 0.005), 6),
                    "end_altitude": round(random.uniform(0, 5), 2),
                    "max_altitude": round(random.uniform(8, 30), 2),
                    "max_speed": round(random.uniform(2, 8), 2),
                    "avg_speed": round(random.uniform(1, 4), 2),
                    "start_battery_percent": round(start_bat, 1),
                    "end_battery_percent": round(end_bat, 1),
                    "battery_used_percent": round(bat_used, 1),
                    "is_processed": True,
                    "processed_at": now - timedelta(days=days_ago - 1),
                    "extracted_data": {
                        "topics": ["sensor_accel", "sensor_gyro", "vehicle_gps_position", "battery_status"],
                        "sample_count": random.randint(10000, 100000),
                        "firmware": "PX4 v1.14.0" if log_idx % 2 == 0 else "ArduPilot v4.4.3",
                    },
                    "description": f"Routine {'inventory scan' if log_idx % 3 == 0 else 'pick operation'} flight at {wh.name}",
                    "uploaded_by": admin_user,
                },
            )
            flight_logs.append(log)

        return flight_logs

    # ── Graph Templates ──────────────────────────────────────────

    def _seed_graph_templates(self, org, admin_user):
        self.stdout.write("  Creating graph templates...")
        templates_data = [
            {
                "name": "Altitude Over Time",
                "description": "Shows altitude variation throughout the flight.",
                "graph_type": "LINE",
                "x_axis_field": "timestamp",
                "y_axis_field": "altitude",
                "x_axis_label": "Time (s)",
                "y_axis_label": "Altitude (m)",
                "chart_config": {"smooth": True, "color": "#3b82f6"},
                "display_order": 1,
            },
            {
                "name": "Speed Profile",
                "description": "Ground speed during the flight.",
                "graph_type": "LINE",
                "x_axis_field": "timestamp",
                "y_axis_field": "ground_speed",
                "x_axis_label": "Time (s)",
                "y_axis_label": "Speed (m/s)",
                "chart_config": {"smooth": True, "color": "#10b981"},
                "display_order": 2,
            },
            {
                "name": "Battery Discharge",
                "description": "Battery percentage over flight duration.",
                "graph_type": "AREA",
                "x_axis_field": "timestamp",
                "y_axis_field": "battery_percent",
                "x_axis_label": "Time (s)",
                "y_axis_label": "Battery (%)",
                "chart_config": {"color": "#f59e0b", "areaOpacity": 0.3},
                "display_order": 3,
            },
            {
                "name": "GPS Scatter",
                "description": "GPS position scatter plot showing flight path.",
                "graph_type": "SCATTER",
                "x_axis_field": "longitude",
                "y_axis_field": "latitude",
                "x_axis_label": "Longitude",
                "y_axis_label": "Latitude",
                "chart_config": {"symbolSize": 4, "color": "#8b5cf6"},
                "display_order": 4,
            },
            {
                "name": "3D Flight Path",
                "description": "Three-dimensional visualization of the flight path.",
                "graph_type": "PATH_3D",
                "x_axis_field": "longitude",
                "y_axis_field": "latitude",
                "z_axis_field": "altitude",
                "x_axis_label": "Longitude",
                "y_axis_label": "Latitude",
                "z_axis_label": "Altitude (m)",
                "chart_config": {"color": "#ef4444"},
                "display_order": 5,
            },
            {
                "name": "Vibration Histogram",
                "description": "Distribution of accelerometer vibration levels.",
                "graph_type": "HISTOGRAM",
                "x_axis_field": "accel_vibration",
                "y_axis_field": "count",
                "x_axis_label": "Vibration (m/s²)",
                "y_axis_label": "Frequency",
                "chart_config": {"bins": 50, "color": "#ec4899"},
                "display_order": 6,
            },
            {
                "name": "Motor RPM Comparison",
                "description": "Bar chart comparing average RPM across motors.",
                "graph_type": "BAR",
                "x_axis_field": "motor_id",
                "y_axis_field": "avg_rpm",
                "x_axis_label": "Motor",
                "y_axis_label": "Average RPM",
                "chart_config": {"color": "#06b6d4"},
                "display_order": 7,
            },
            {
                "name": "Temperature Heatmap",
                "description": "Component temperature over time as a heatmap.",
                "graph_type": "HEATMAP",
                "x_axis_field": "timestamp",
                "y_axis_field": "component",
                "x_axis_label": "Time (s)",
                "y_axis_label": "Component",
                "chart_config": {"colorRange": ["#22c55e", "#f59e0b", "#ef4444"]},
                "display_order": 8,
            },
        ]

        templates = []
        for item in templates_data:
            tpl, _ = uoc(FlightGraphTemplate.objects,
                organization=org,
                name=item.pop("name"),
                defaults={
                    **item,
                    "is_active": True,
                    "created_by": admin_user,
                },
            )
            templates.append(tpl)

        # Also create 2 system-wide templates (no org)
        system_templates = [
            {
                "name": "Altitude vs Speed",
                "description": "Correlation between altitude and speed.",
                "graph_type": "SCATTER",
                "x_axis_field": "altitude",
                "y_axis_field": "ground_speed",
                "x_axis_label": "Altitude (m)",
                "y_axis_label": "Speed (m/s)",
                "chart_config": {"symbolSize": 6, "color": "#6366f1"},
                "display_order": 1,
            },
            {
                "name": "Battery Box Plot",
                "description": "Statistical summary of battery levels across flights.",
                "graph_type": "BOX",
                "x_axis_field": "flight_id",
                "y_axis_field": "battery_percent",
                "x_axis_label": "Flight",
                "y_axis_label": "Battery (%)",
                "chart_config": {"color": "#14b8a6"},
                "display_order": 2,
            },
        ]

        for item in system_templates:
            tpl, _ = uoc(FlightGraphTemplate.objects,
                organization=None,
                name=item.pop("name"),
                defaults={
                    **item,
                    "is_active": True,
                    "created_by": admin_user,
                },
            )
            templates.append(tpl)

        return templates

    # ── Flight Log Graphs ────────────────────────────────────────

    def _seed_flight_log_graphs(self, flight_logs, templates, now):
        self.stdout.write("  Creating flight log graphs...")
        # Generate graphs for the first 5 logs using the first 4 templates
        for log in flight_logs[:5]:
            for tpl in templates[:4]:
                sample_points = random.randint(100, 500)
                uoc(FlightLogGraph.objects,
                    log=log,
                    template=tpl,
                    defaults={
                        "title": "",
                        "graph_data": {
                            "x": list(range(sample_points)),
                            "y": [round(random.uniform(0, 30), 2) for _ in range(sample_points)],
                            "points": sample_points,
                        },
                        "is_generated": True,
                        "generated_at": now - timedelta(hours=random.randint(1, 48)),
                    },
                )

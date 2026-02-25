"""
Management command to seed sample warehouse data with contacts and zones.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.organizations.models import Organization
from apps.warehouses.models import Warehouse, WarehouseContact, WarehouseZone

User = get_user_model()


class Command(BaseCommand):
    help = "Seed sample warehouse data for testing"

    def handle(self, *args, **options):
        # Get superuser (admin)
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            self.stdout.write(self.style.ERROR("No superuser found. Please create one first."))
            return

        # Get existing organization or create one
        org = Organization.objects.first()
        if not org:
            self.stdout.write(
                self.style.ERROR(
                    "No organization found. Please create one via the admin panel first."
                )
            )
            return
        else:
            self.stdout.write(f"Using existing organization: {org.name}")

        # Sample warehouses with contacts and zones
        warehouses_data = [
            {
                "warehouse": {
                    "name": "Mumbai Central Warehouse",
                    "code": "WH-MUM-01",
                    "description": "Main distribution center for western India operations",
                    "address_line_1": "Plot No. 45, MIDC Industrial Area",
                    "address_line_2": "Near Bhiwandi Bypass",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "postal_code": "400001",
                    "country": "India",
                    "latitude": "19.0760",
                    "longitude": "72.8777",
                    "timezone": "Asia/Kolkata",
                    "is_active": True,
                },
                "contacts": [
                    {
                        "name": "Rajesh Kumar",
                        "designation": "Warehouse Manager",
                        "email": "rajesh.kumar@flyng.io",
                        "phone_primary": "+919876543210",
                        "is_primary": True,
                        "is_emergency": True,
                    },
                    {
                        "name": "Priya Sharma",
                        "designation": "Operations Supervisor",
                        "email": "priya.sharma@flyng.io",
                        "phone_primary": "+919876543211",
                        "is_primary": False,
                        "is_emergency": False,
                    },
                ],
                "zones": [
                    {
                        "name": "Storage Zone A",
                        "code": "MUM-STOR-A",
                        "description": "Primary storage area for electronics",
                        "zone_type": "STORAGE",
                        "floor_level": 0,
                        "area_sqft": "5000.00",
                    },
                    {
                        "name": "Storage Zone B",
                        "code": "MUM-STOR-B",
                        "description": "Secondary storage for general goods",
                        "zone_type": "STORAGE",
                        "floor_level": 0,
                        "area_sqft": "4500.00",
                    },
                    {
                        "name": "Picking Zone",
                        "code": "MUM-PICK-01",
                        "description": "Order picking and consolidation area",
                        "zone_type": "PICKING",
                        "floor_level": 0,
                        "area_sqft": "2000.00",
                    },
                    {
                        "name": "Shipping Dock",
                        "code": "MUM-SHIP-01",
                        "description": "Loading and unloading dock",
                        "zone_type": "SHIPPING",
                        "floor_level": 0,
                        "area_sqft": "1500.00",
                    },
                ],
            },
            {
                "warehouse": {
                    "name": "Delhi NCR Hub",
                    "code": "WH-DEL-01",
                    "description": "Northern region fulfillment center",
                    "address_line_1": "Sector 63, Industrial Estate",
                    "address_line_2": "Noida",
                    "city": "Delhi",
                    "state": "Delhi",
                    "postal_code": "110001",
                    "country": "India",
                    "latitude": "28.6139",
                    "longitude": "77.2090",
                    "timezone": "Asia/Kolkata",
                    "is_active": True,
                },
                "contacts": [
                    {
                        "name": "Amit Verma",
                        "designation": "Hub Manager",
                        "email": "amit.verma@flyng.io",
                        "phone_primary": "+919812345678",
                        "is_primary": True,
                        "is_emergency": True,
                    },
                    {
                        "name": "Neha Singh",
                        "designation": "Inventory Controller",
                        "email": "neha.singh@flyng.io",
                        "phone_primary": "+919812345679",
                        "is_primary": False,
                        "is_emergency": False,
                    },
                ],
                "zones": [
                    {
                        "name": "Main Storage",
                        "code": "DEL-STOR-01",
                        "description": "Primary storage facility",
                        "zone_type": "STORAGE",
                        "floor_level": 0,
                        "area_sqft": "8000.00",
                    },
                    {
                        "name": "Mezzanine Storage",
                        "code": "DEL-STOR-02",
                        "description": "Upper level storage",
                        "zone_type": "STORAGE",
                        "floor_level": 1,
                        "area_sqft": "3000.00",
                    },
                    {
                        "name": "Receiving Area",
                        "code": "DEL-RECV-01",
                        "description": "Inbound goods receiving",
                        "zone_type": "RECEIVING",
                        "floor_level": 0,
                        "area_sqft": "1200.00",
                    },
                ],
            },
            {
                "warehouse": {
                    "name": "Bangalore Tech Park Warehouse",
                    "code": "WH-BLR-01",
                    "description": "South India distribution hub for electronics",
                    "address_line_1": "Electronic City Phase 1",
                    "address_line_2": "Hosur Road",
                    "city": "Bangalore",
                    "state": "Karnataka",
                    "postal_code": "560100",
                    "country": "India",
                    "latitude": "12.9716",
                    "longitude": "77.5946",
                    "timezone": "Asia/Kolkata",
                    "is_active": True,
                },
                "contacts": [
                    {
                        "name": "Suresh Reddy",
                        "designation": "Facility Director",
                        "email": "suresh.reddy@flyng.io",
                        "phone_primary": "+919845123456",
                        "is_primary": True,
                        "is_emergency": True,
                    },
                ],
                "zones": [
                    {
                        "name": "High-Value Storage",
                        "code": "BLR-HVS-01",
                        "description": "Secure storage for high-value electronics",
                        "zone_type": "STORAGE",
                        "floor_level": 0,
                        "area_sqft": "3000.00",
                    },
                    {
                        "name": "General Storage",
                        "code": "BLR-STOR-01",
                        "description": "General merchandise storage",
                        "zone_type": "STORAGE",
                        "floor_level": 0,
                        "area_sqft": "6000.00",
                    },
                    {
                        "name": "Staging Area",
                        "code": "BLR-STAG-01",
                        "description": "Order staging before dispatch",
                        "zone_type": "STAGING",
                        "floor_level": 0,
                        "area_sqft": "1500.00",
                    },
                ],
            },
            {
                "warehouse": {
                    "name": "Chennai Port Warehouse",
                    "code": "WH-CHN-01",
                    "description": "Import/Export handling facility near Chennai port",
                    "address_line_1": "Ambattur Industrial Estate",
                    "address_line_2": "Near Chennai Port",
                    "city": "Chennai",
                    "state": "Tamil Nadu",
                    "postal_code": "600053",
                    "country": "India",
                    "latitude": "13.0827",
                    "longitude": "80.2707",
                    "timezone": "Asia/Kolkata",
                    "is_active": True,
                },
                "contacts": [
                    {
                        "name": "Karthik Subramanian",
                        "designation": "Port Operations Manager",
                        "email": "karthik.s@flyng.io",
                        "phone_primary": "+919841234567",
                        "is_primary": True,
                        "is_emergency": True,
                    },
                    {
                        "name": "Lakshmi Devi",
                        "designation": "Customs Coordinator",
                        "email": "lakshmi.devi@flyng.io",
                        "phone_primary": "+919841234568",
                        "is_primary": False,
                        "is_emergency": False,
                    },
                ],
                "zones": [
                    {
                        "name": "Import Storage",
                        "code": "CHN-IMP-01",
                        "description": "Storage for imported goods",
                        "zone_type": "STORAGE",
                        "floor_level": 0,
                        "area_sqft": "4000.00",
                    },
                    {
                        "name": "Export Staging",
                        "code": "CHN-EXP-01",
                        "description": "Staging area for export shipments",
                        "zone_type": "STAGING",
                        "floor_level": 0,
                        "area_sqft": "2500.00",
                    },
                ],
            },
            {
                "warehouse": {
                    "name": "Kolkata Eastern Hub",
                    "code": "WH-KOL-01",
                    "description": "Eastern region distribution center (Currently under maintenance)",
                    "address_line_1": "Salt Lake Sector V",
                    "address_line_2": "IT Park Area",
                    "city": "Kolkata",
                    "state": "West Bengal",
                    "postal_code": "700091",
                    "country": "India",
                    "latitude": "22.5726",
                    "longitude": "88.3639",
                    "timezone": "Asia/Kolkata",
                    "is_active": False,
                },
                "contacts": [
                    {
                        "name": "Debashish Banerjee",
                        "designation": "Regional Manager",
                        "email": "debashish.b@flyng.io",
                        "phone_primary": "+919830123456",
                        "is_primary": True,
                        "is_emergency": True,
                    },
                ],
                "zones": [
                    {
                        "name": "Main Storage",
                        "code": "KOL-STOR-01",
                        "description": "Primary storage area",
                        "zone_type": "STORAGE",
                        "floor_level": 0,
                        "area_sqft": "5500.00",
                    },
                ],
            },
        ]

        wh_created = 0
        contact_created = 0
        zone_created = 0

        for data in warehouses_data:
            wh_data = data["warehouse"]

            # Get or create warehouse
            wh = Warehouse.objects.filter(code=wh_data["code"]).first()
            if not wh:
                wh = Warehouse(**wh_data, organization=org)
                wh.skip_history_when_saving = True
                wh.save()
                wh_created += 1
                self.stdout.write(self.style.SUCCESS(f"Created warehouse: {wh.name}"))
            else:
                self.stdout.write(f"Warehouse exists: {wh.name}")

            # Create contacts
            for contact_data in data.get("contacts", []):
                if not WarehouseContact.objects.filter(
                    warehouse=wh, email=contact_data["email"]
                ).exists():
                    contact = WarehouseContact(warehouse=wh, **contact_data)
                    contact.save()
                    contact_created += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"  + Contact: {contact_data['name']}")
                    )

            # Create zones
            for zone_data in data.get("zones", []):
                if not WarehouseZone.objects.filter(code=zone_data["code"]).exists():
                    zone = WarehouseZone(warehouse=wh, **zone_data)
                    zone.skip_history_when_saving = True
                    zone.save()
                    zone_created += 1
                    self.stdout.write(self.style.SUCCESS(f"  + Zone: {zone_data['name']}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone! Created {wh_created} warehouses, {contact_created} contacts, {zone_created} zones."
            )
        )
        self.stdout.write(
            f"Totals: {Warehouse.objects.count()} warehouses, "
            f"{WarehouseContact.objects.count()} contacts, "
            f"{WarehouseZone.objects.count()} zones"
        )

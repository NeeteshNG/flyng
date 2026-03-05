"""
Centralized Choices for FlyNG

All model choices are defined here with i18n support for English and Hindi.
Uses Django's gettext_lazy for lazy translation.

Usage:
    from apps.core.choices import UserRole, PlanType, TimezoneChoices

    class MyModel(models.Model):
        role = models.CharField(choices=UserRole.choices, ...)
"""

from django.db import models
from django.utils.translation import gettext_lazy as _

# =============================================================================
# User Choices
# =============================================================================


class UserRole(models.TextChoices):
    """User roles within an organization."""

    # Translators: Administrator role with full access
    ADMIN = "ADMIN", _("Administrator")
    # Translators: Manager role with management access
    MANAGER = "MANAGER", _("Manager")
    # Translators: Operator role with operational access
    OPERATOR = "OPERATOR", _("Operator")
    # Translators: Viewer role with read-only access
    VIEWER = "VIEWER", _("Viewer")


class OTPType(models.TextChoices):
    """Types of One-Time Passwords."""

    # Translators: OTP for verifying email address
    EMAIL_VERIFICATION = "EMAIL_VERIFICATION", _("Email Verification")
    # Translators: OTP for password reset
    PASSWORD_RESET = "PASSWORD_RESET", _("Password Reset")
    # Translators: OTP for verifying phone number
    PHONE_VERIFICATION = "PHONE_VERIFICATION", _("Phone Verification")
    # Translators: OTP for changing email address
    EMAIL_CHANGE = "EMAIL_CHANGE", _("Email Change Verification")


# =============================================================================
# Organization Choices
# =============================================================================


class PlanType(models.TextChoices):
    """Subscription plan types."""

    # Translators: Free tier plan
    FREE = "FREE", _("Free")
    # Translators: Starter tier plan for small businesses
    STARTER = "STARTER", _("Starter")
    # Translators: Professional tier plan for growing businesses
    PROFESSIONAL = "PROFESSIONAL", _("Professional")
    # Translators: Enterprise tier plan for large organizations
    ENTERPRISE = "ENTERPRISE", _("Enterprise")


class TimezoneChoices(models.TextChoices):
    """Supported timezones."""

    # Translators: India Standard Time
    IST = "Asia/Kolkata", _("India Standard Time (IST)")
    # Translators: Coordinated Universal Time
    UTC = "UTC", _("Coordinated Universal Time (UTC)")
    # Translators: Gulf Standard Time (Dubai)
    DUBAI = "Asia/Dubai", _("Gulf Standard Time (GST)")
    # Translators: Singapore Time
    SINGAPORE = "Asia/Singapore", _("Singapore Time (SGT)")
    # Translators: British Time
    LONDON = "Europe/London", _("British Time (GMT/BST)")
    # Translators: Eastern Time (US)
    NEW_YORK = "America/New_York", _("Eastern Time (ET)")


class DateFormatChoices(models.TextChoices):
    """Date format preferences."""

    # Translators: Day/Month/Year format (common in India, UK)
    DMY = "DD/MM/YYYY", _("DD/MM/YYYY")
    # Translators: Month/Day/Year format (common in US)
    MDY = "MM/DD/YYYY", _("MM/DD/YYYY")
    # Translators: Year-Month-Day format (ISO standard)
    YMD = "YYYY-MM-DD", _("YYYY-MM-DD")


class CurrencyChoices(models.TextChoices):
    """Supported currencies."""

    # Translators: Indian Rupee currency
    INR = "INR", _("Indian Rupee (INR)")
    # Translators: US Dollar currency
    USD = "USD", _("US Dollar (USD)")


class LanguageChoices(models.TextChoices):
    """Supported languages."""

    # Translators: English language
    ENGLISH = "en", _("English")
    # Translators: Hindi language
    HINDI = "hi", _("Hindi")


# =============================================================================
# Warehouse Choices (for future use)
# =============================================================================


class WarehouseZoneType(models.TextChoices):
    """Types of warehouse zones."""

    # Translators: Storage zone for keeping inventory
    STORAGE = "STORAGE", _("Storage")
    # Translators: Picking zone for order fulfillment
    PICKING = "PICKING", _("Picking")
    # Translators: Staging zone for preparation
    STAGING = "STAGING", _("Staging")
    # Translators: Shipping zone for dispatch
    SHIPPING = "SHIPPING", _("Shipping")
    # Translators: Receiving zone for incoming goods
    RECEIVING = "RECEIVING", _("Receiving")
    # Translators: Returns processing zone
    RETURNS = "RETURNS", _("Returns")


class MeasurementStandard(models.TextChoices):
    """Measurement standards."""

    # Translators: Metric system (meters, kilograms)
    METRIC = "METRIC", _("Metric")
    # Translators: Imperial system (feet, pounds)
    IMPERIAL = "IMPERIAL", _("Imperial")


# =============================================================================
# Drone Choices (for future use)
# =============================================================================


class DroneStatus(models.TextChoices):
    """Drone operational status."""

    # Translators: Drone is available for jobs
    AVAILABLE = "AVAILABLE", _("Available")
    # Translators: Drone is currently in flight
    IN_FLIGHT = "IN_FLIGHT", _("In Flight")
    # Translators: Drone is charging
    CHARGING = "CHARGING", _("Charging")
    # Translators: Drone is idle but connected
    IDLE = "IDLE", _("Idle")
    # Translators: Drone is offline or disconnected
    OFFLINE = "OFFLINE", _("Offline")
    # Translators: Drone is under maintenance
    MAINTENANCE = "MAINTENANCE", _("Maintenance")
    # Translators: Drone has an error
    ERROR = "ERROR", _("Error")


class DroneAutonomyStatus(models.IntegerChoices):
    """Drone autonomy modes."""

    # Translators: Manual control mode
    MANUAL = 0, _("Manual")
    # Translators: Semi-autonomous mode
    SEMI_AUTO = 1, _("Semi-Autonomous")
    # Translators: Fully autonomous mode
    AUTONOMOUS = 2, _("Autonomous")


class MaintenanceType(models.TextChoices):
    """Types of drone maintenance."""

    # Translators: Scheduled preventive maintenance
    SCHEDULED = "SCHEDULED", _("Scheduled")
    # Translators: Unscheduled corrective maintenance
    CORRECTIVE = "CORRECTIVE", _("Corrective")
    # Translators: Emergency repair
    EMERGENCY = "EMERGENCY", _("Emergency")
    # Translators: Firmware/software update
    FIRMWARE_UPDATE = "FIRMWARE_UPDATE", _("Firmware Update")
    # Translators: Calibration and testing
    CALIBRATION = "CALIBRATION", _("Calibration")
    # Translators: Battery replacement
    BATTERY_REPLACEMENT = "BATTERY_REPLACEMENT", _("Battery Replacement")
    # Translators: Motor/propeller replacement
    MOTOR_REPLACEMENT = "MOTOR_REPLACEMENT", _("Motor Replacement")
    # Translators: Sensor replacement or repair
    SENSOR_REPAIR = "SENSOR_REPAIR", _("Sensor Repair")
    # Translators: General inspection
    INSPECTION = "INSPECTION", _("Inspection")


class FlightMode(models.TextChoices):
    """Drone flight modes for telemetry."""

    # Translators: Drone is grounded
    GROUNDED = "GROUNDED", _("Grounded")
    # Translators: Manual control flight
    MANUAL = "MANUAL", _("Manual")
    # Translators: Stabilized/altitude hold mode
    STABILIZED = "STABILIZED", _("Stabilized")
    # Translators: Position hold mode
    POSITION_HOLD = "POSITION_HOLD", _("Position Hold")
    # Translators: Autonomous waypoint navigation
    AUTONOMOUS = "AUTONOMOUS", _("Autonomous")
    # Translators: Return to home
    RTH = "RTH", _("Return to Home")
    # Translators: Emergency landing
    EMERGENCY = "EMERGENCY", _("Emergency")


# =============================================================================
# Battery Choices (for future use)
# =============================================================================


class BatteryStatus(models.TextChoices):
    """Battery status."""

    # Translators: Battery is available for use
    AVAILABLE = "AVAILABLE", _("Available")
    # Translators: Battery is currently in use (attached to drone)
    IN_USE = "IN_USE", _("In Use")
    # Translators: Battery is currently charging
    CHARGING = "CHARGING", _("Charging")
    # Translators: Battery has low charge
    LOW = "LOW", _("Low")
    # Translators: Battery is faulty and needs replacement
    FAULTY = "FAULTY", _("Faulty")
    # Translators: Battery is retired from service
    RETIRED = "RETIRED", _("Retired")


class BatteryHealthStatus(models.TextChoices):
    """Battery health status."""

    # Translators: Battery is in excellent condition
    EXCELLENT = "EXCELLENT", _("Excellent")
    # Translators: Battery is in good condition
    GOOD = "GOOD", _("Good")
    # Translators: Battery is in fair condition
    FAIR = "FAIR", _("Fair")
    # Translators: Battery is in poor condition
    POOR = "POOR", _("Poor")
    # Translators: Battery needs replacement
    REPLACE = "REPLACE", _("Needs Replacement")


class BatteryChemistry(models.TextChoices):
    """Battery chemistry types."""

    # Translators: Lithium Polymer battery
    LIPO = "LIPO", _("Lithium Polymer (LiPo)")
    # Translators: Lithium Ion battery
    LIION = "LIION", _("Lithium Ion (Li-Ion)")
    # Translators: Lithium Iron Phosphate battery
    LIFEPO4 = "LIFEPO4", _("Lithium Iron Phosphate (LiFePO4)")
    # Translators: Nickel Metal Hydride battery
    NIMH = "NIMH", _("Nickel Metal Hydride (NiMH)")


class ChargingStatus(models.TextChoices):
    """Battery charging session status."""

    # Translators: Charging session has started
    STARTED = "STARTED", _("Started")
    # Translators: Battery is currently charging
    CHARGING = "CHARGING", _("Charging")
    # Translators: Charging is complete
    COMPLETED = "COMPLETED", _("Completed")
    # Translators: Charging was interrupted
    INTERRUPTED = "INTERRUPTED", _("Interrupted")
    # Translators: Charging failed due to error
    FAILED = "FAILED", _("Failed")


class SwapReason(models.TextChoices):
    """Reasons for battery swap."""

    # Translators: Low battery level
    LOW_BATTERY = "LOW_BATTERY", _("Low Battery")
    # Translators: Scheduled maintenance swap
    SCHEDULED = "SCHEDULED", _("Scheduled Maintenance")
    # Translators: Battery malfunction
    MALFUNCTION = "MALFUNCTION", _("Battery Malfunction")
    # Translators: Preventive replacement
    PREVENTIVE = "PREVENTIVE", _("Preventive Replacement")
    # Translators: Performance degradation
    DEGRADATION = "DEGRADATION", _("Performance Degradation")
    # Translators: Emergency swap
    EMERGENCY = "EMERGENCY", _("Emergency")


# =============================================================================
# Inventory Choices (for future use)
# =============================================================================


class BinLabelTypeChoices(models.IntegerChoices):
    """Types of bin labels."""

    # Translators: ArUco marker label type
    ARUCO = 0, _("ArUco")
    # Translators: QR code label type
    QR = 1, _("QR Code")


class BinCoordinateType(models.IntegerChoices):
    """Bin coordinate reference type."""

    # Translators: Center of the bin
    CENTER = 0, _("Center")
    # Translators: Left side of the bin
    LEFT = 1, _("Left")
    # Translators: Right side of the bin
    RIGHT = 2, _("Right")


class InventoryAdjustmentReason(models.TextChoices):
    """Reasons for inventory adjustments."""

    # Translators: Manual count adjustment
    COUNT = "COUNT", _("Physical Count")
    # Translators: Damaged item adjustment
    DAMAGE = "DAMAGE", _("Damaged")
    # Translators: Lost item adjustment
    LOST = "LOST", _("Lost")
    # Translators: Found item adjustment
    FOUND = "FOUND", _("Found")
    # Translators: Return from customer
    RETURN = "RETURN", _("Customer Return")
    # Translators: Transfer between locations
    TRANSFER = "TRANSFER", _("Transfer")
    # Translators: Other adjustment reason
    OTHER = "OTHER", _("Other")


class StorageLocationType(models.TextChoices):
    """Types of storage locations."""

    # Translators: Standard rack storage
    RACK = "RACK", _("Rack")
    # Translators: Floor/pallet storage
    FLOOR = "FLOOR", _("Floor")
    # Translators: Shelf storage
    SHELF = "SHELF", _("Shelf")
    # Translators: Bin storage
    BIN = "BIN", _("Bin")
    # Translators: Bulk storage area
    BULK = "BULK", _("Bulk")
    # Translators: Cold storage
    COLD = "COLD", _("Cold Storage")
    # Translators: Staging area
    STAGING = "STAGING", _("Staging")
    # Translators: Pick station
    PICK_STATION = "PICK_STATION", _("Pick Station")


class UnitOfMeasure(models.TextChoices):
    """Units of measure for inventory items."""

    # Translators: Each/piece
    EACH = "EACH", _("Each")
    # Translators: Box
    BOX = "BOX", _("Box")
    # Translators: Case
    CASE = "CASE", _("Case")
    # Translators: Pallet
    PALLET = "PALLET", _("Pallet")
    # Translators: Kilogram
    KG = "KG", _("Kilogram")
    # Translators: Gram
    GRAM = "GRAM", _("Gram")
    # Translators: Liter
    LITER = "LITER", _("Liter")
    # Translators: Milliliter
    ML = "ML", _("Milliliter")
    # Translators: Meter
    METER = "METER", _("Meter")
    # Translators: Pack
    PACK = "PACK", _("Pack")


class InventoryMovementType(models.TextChoices):
    """Types of inventory movements."""

    # Translators: Inbound/receiving
    INBOUND = "INBOUND", _("Inbound")
    # Translators: Outbound/shipping
    OUTBOUND = "OUTBOUND", _("Outbound")
    # Translators: Internal transfer
    TRANSFER = "TRANSFER", _("Transfer")
    # Translators: Adjustment
    ADJUSTMENT = "ADJUSTMENT", _("Adjustment")
    # Translators: Return
    RETURN = "RETURN", _("Return")
    # Translators: Cycle count
    CYCLE_COUNT = "CYCLE_COUNT", _("Cycle Count")


# =============================================================================
# Order Choices (for future use)
# =============================================================================


class OrderStatus(models.TextChoices):
    """Pick order status."""

    # Translators: Order is pending processing
    PENDING = "PENDING", _("Pending")
    # Translators: Order is confirmed
    CONFIRMED = "CONFIRMED", _("Confirmed")
    # Translators: Order is being picked
    PICKING = "PICKING", _("Picking")
    # Translators: Order picking is complete
    PICKED = "PICKED", _("Picked")
    # Translators: Order is being packed
    PACKING = "PACKING", _("Packing")
    # Translators: Order is packed and ready
    PACKED = "PACKED", _("Packed")
    # Translators: Order has been shipped
    SHIPPED = "SHIPPED", _("Shipped")
    # Translators: Order has been delivered
    DELIVERED = "DELIVERED", _("Delivered")
    # Translators: Order was cancelled
    CANCELLED = "CANCELLED", _("Cancelled")
    # Translators: Order is on hold
    ON_HOLD = "ON_HOLD", _("On Hold")


class OrderPriority(models.TextChoices):
    """Order priority levels."""

    # Translators: Low priority order
    LOW = "LOW", _("Low")
    # Translators: Normal/standard priority order
    NORMAL = "NORMAL", _("Normal")
    # Translators: High priority order
    HIGH = "HIGH", _("High")
    # Translators: Urgent priority order
    URGENT = "URGENT", _("Urgent")


# =============================================================================
# Job Choices (for future use)
# =============================================================================


class JobStatus(models.TextChoices):
    """Drone job status."""

    # Translators: Job is newly created
    NEW = "NEW", _("New")
    # Translators: Job is in queue
    QUEUED = "QUEUED", _("Queued")
    # Translators: Job is assigned to a drone
    ASSIGNED = "ASSIGNED", _("Assigned")
    # Translators: Job is in progress
    IN_PROGRESS = "IN_PROGRESS", _("In Progress")
    # Translators: Job is completed successfully
    COMPLETED = "COMPLETED", _("Completed")
    # Translators: Job has failed
    FAILED = "FAILED", _("Failed")
    # Translators: Job was cancelled
    CANCELLED = "CANCELLED", _("Cancelled")
    # Translators: Job is paused
    PAUSED = "PAUSED", _("Paused")


class JobType(models.TextChoices):
    """Types of drone jobs."""

    # Translators: Pick item from location
    PICK = "PICK", _("Pick")
    # Translators: Scan barcode/label
    SCAN = "SCAN", _("Scan")
    # Translators: Count inventory
    COUNT = "COUNT", _("Count")
    # Translators: Move item to location
    MOVE = "MOVE", _("Move")
    # Translators: Return to base station
    RETURN_HOME = "RETURN_HOME", _("Return Home")


class JobEventType(models.TextChoices):
    """Types of job events."""

    # Translators: Job was created
    CREATED = "CREATED", _("Created")
    # Translators: Job was queued
    QUEUED = "QUEUED", _("Queued")
    # Translators: Job was assigned
    ASSIGNED = "ASSIGNED", _("Assigned")
    # Translators: Job was started
    STARTED = "STARTED", _("Started")
    # Translators: Drone is navigating to location
    NAVIGATING = "NAVIGATING", _("Navigating")
    # Translators: Drone arrived at location
    ARRIVED = "ARRIVED", _("Arrived")
    # Translators: Scan was completed
    SCANNED = "SCANNED", _("Scanned")
    # Translators: Item was picked
    PICKED = "PICKED", _("Picked")
    # Translators: Job was completed
    COMPLETED = "COMPLETED", _("Completed")
    # Translators: Job failed
    FAILED = "FAILED", _("Failed")
    # Translators: Job was cancelled
    CANCELLED = "CANCELLED", _("Cancelled")
    # Translators: Job was paused
    PAUSED = "PAUSED", _("Paused")
    # Translators: Job was resumed
    RESUMED = "RESUMED", _("Resumed")
    # Translators: Error occurred
    ERROR = "ERROR", _("Error")


# =============================================================================
# Ground Control Station Choices (for future use)
# =============================================================================


class GCSStatus(models.TextChoices):
    """Ground Control Station status."""

    # Translators: GCS is online and operational
    ONLINE = "ONLINE", _("Online")
    # Translators: GCS is offline
    OFFLINE = "OFFLINE", _("Offline")
    # Translators: GCS is in maintenance mode
    MAINTENANCE = "MAINTENANCE", _("Maintenance")
    # Translators: GCS has an error
    ERROR = "ERROR", _("Error")


class DroneWorkAreaType(models.TextChoices):
    """Types of drone work areas."""

    # Translators: Tethered work area (drone connected by cable)
    TETHERED = "TETHERED", _("Tethered")
    # Translators: Untethered/free-flying work area
    UNTETHERED = "UNTETHERED", _("Untethered")
    # Translators: Hybrid work area supporting both modes
    HYBRID = "HYBRID", _("Hybrid")


# =============================================================================
# Organization Membership Choices (for Day 3)
# =============================================================================


class MembershipRole(models.TextChoices):
    """Roles within organization membership."""

    # Translators: Organization owner
    OWNER = "OWNER", _("Owner")
    # Translators: Organization administrator
    ADMIN = "ADMIN", _("Administrator")
    # Translators: Organization member
    MEMBER = "MEMBER", _("Member")


class InvitationStatus(models.TextChoices):
    """Status of organization invitations."""

    # Translators: Invitation is pending response
    PENDING = "PENDING", _("Pending")
    # Translators: Invitation was accepted
    ACCEPTED = "ACCEPTED", _("Accepted")
    # Translators: Invitation was declined
    DECLINED = "DECLINED", _("Declined")
    # Translators: Invitation has expired
    EXPIRED = "EXPIRED", _("Expired")
    # Translators: Invitation was revoked
    REVOKED = "REVOKED", _("Revoked")


class SubscriptionStatus(models.TextChoices):
    """Subscription status for billing."""

    # Translators: Subscription is active
    ACTIVE = "ACTIVE", _("Active")
    # Translators: Subscription is on trial
    TRIALING = "TRIALING", _("Trialing")
    # Translators: Subscription payment is past due
    PAST_DUE = "PAST_DUE", _("Past Due")
    # Translators: Subscription is cancelled
    CANCELLED = "CANCELLED", _("Cancelled")
    # Translators: Subscription has expired
    EXPIRED = "EXPIRED", _("Expired")
    # Translators: Subscription is paused
    PAUSED = "PAUSED", _("Paused")


class BillingCycle(models.TextChoices):
    """Billing cycle choices."""

    # Translators: Monthly billing cycle
    MONTHLY = "MONTHLY", _("Monthly")
    # Translators: Annual billing cycle
    ANNUAL = "ANNUAL", _("Annual")


# =============================================================================
# Import Job Choices
# =============================================================================


class ImportType(models.TextChoices):
    """Types of bulk imports."""

    # Translators: Import inventory items (products/SKUs)
    ITEMS = "ITEMS", _("Inventory Items")
    # Translators: Import storage locations (bins)
    LOCATIONS = "LOCATIONS", _("Storage Locations")
    # Translators: Import inventory stock quantities
    INVENTORY = "INVENTORY", _("Inventory Stock")
    # Translators: Import orders
    ORDERS = "ORDERS", _("Orders")
    # Translators: Import item categories
    CATEGORIES = "CATEGORIES", _("Item Categories")


class ImportStatus(models.TextChoices):
    """Status of import jobs."""

    # Translators: Import job is pending processing
    PENDING = "PENDING", _("Pending")
    # Translators: Import job is validating data
    VALIDATING = "VALIDATING", _("Validating")
    # Translators: Import job is currently processing
    PROCESSING = "PROCESSING", _("Processing")
    # Translators: Import job completed successfully
    COMPLETED = "COMPLETED", _("Completed")
    # Translators: Import job completed with some errors
    COMPLETED_WITH_ERRORS = "COMPLETED_WITH_ERRORS", _("Completed with Errors")
    # Translators: Import job failed
    FAILED = "FAILED", _("Failed")
    # Translators: Import job was cancelled
    CANCELLED = "CANCELLED", _("Cancelled")


# =============================================================================
# User Activity Choices
# =============================================================================


class ActivityAction(models.TextChoices):
    """Types of user activities tracked in the audit log."""

    # Translators: User logged in
    LOGIN = "LOGIN", _("Login")
    # Translators: User logged out
    LOGOUT = "LOGOUT", _("Logout")
    # Translators: User created a resource
    CREATE = "CREATE", _("Create")
    # Translators: User updated a resource
    UPDATE = "UPDATE", _("Update")
    # Translators: User deleted a resource
    DELETE = "DELETE", _("Delete")
    # Translators: User viewed a resource
    VIEW = "VIEW", _("View")
    # Translators: User exported data
    EXPORT = "EXPORT", _("Export")
    # Translators: User changed their password
    PASSWORD_CHANGE = "PASSWORD_CHANGE", _("Password Change")
    # Translators: User updated their profile
    PROFILE_UPDATE = "PROFILE_UPDATE", _("Profile Update")

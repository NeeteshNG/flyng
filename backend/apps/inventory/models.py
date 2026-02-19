"""
Inventory Models

Models for managing warehouse storage locations, bins, items, and stock.

Models:
- StorageLocation: Physical location in warehouse (aisle/rack/level)
- BinLabelType: Types of bin labels (ArUco, QR)
- StorageBinTemplate: Template for bin configuration
- StorageBin: Individual storage bin
- ItemCategory: Hierarchical item categorization
- InventoryItem: Master item data (SKU)
- InventoryStock: Stock quantity at specific bin
"""
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.choices import (
    BinCoordinateType,
    BinLabelTypeChoices,
    StorageLocationType,
    UnitOfMeasure,
)
from apps.core.models import AuditedModel, BaseModel

from .managers import (
    BinLabelTypeManager,
    InventoryItemManager,
    InventoryStockManager,
    ItemCategoryManager,
    StorageBinManager,
    StorageBinTemplateManager,
    StorageLocationManager,
)


class StorageLocation(BaseModel):
    """
    Physical storage location within a warehouse zone.

    Represents a specific position in the warehouse using aisle/rack/level
    coordinates along with 3D position data for drone navigation.

    Attributes:
        zone: The warehouse zone this location belongs to
        code: Unique location code (e.g., A-01-03-02)
        aisle: Aisle identifier
        rack: Rack identifier within aisle
        level: Level/shelf within rack
        position: Position on the level
        location_type: Type of storage (rack, floor, shelf, etc.)
        x_coordinate, y_coordinate, z_coordinate: 3D position for drones
        is_accessible: Whether drones can access this location
        is_full: Whether location is at capacity
        max_bins: Maximum number of bins at this location
    """

    zone = models.ForeignKey(
        'warehouses.WarehouseZone',
        on_delete=models.CASCADE,
        related_name='storage_locations',
        verbose_name=_('zone'),
        help_text=_('The warehouse zone this location belongs to'),
    )

    code = models.CharField(
        _('location code'),
        max_length=50,
        db_index=True,
        help_text=_('Unique location code (e.g., A-01-03-02)'),
    )

    # Human-readable position identifiers
    aisle = models.CharField(
        _('aisle'),
        max_length=10,
        help_text=_('Aisle identifier'),
    )

    rack = models.CharField(
        _('rack'),
        max_length=10,
        help_text=_('Rack identifier within aisle'),
    )

    level = models.CharField(
        _('level'),
        max_length=10,
        help_text=_('Level/shelf within rack'),
    )

    position = models.CharField(
        _('position'),
        max_length=10,
        blank=True,
        help_text=_('Position on the level (optional)'),
    )

    # Location type
    location_type = models.CharField(
        _('location type'),
        max_length=20,
        choices=StorageLocationType.choices,
        default=StorageLocationType.RACK,
        help_text=_('Type of storage location'),
    )

    # 3D coordinates for drone navigation
    x_coordinate = models.DecimalField(
        _('X coordinate'),
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text=_('X position in meters from origin'),
    )

    y_coordinate = models.DecimalField(
        _('Y coordinate'),
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text=_('Y position in meters from origin'),
    )

    z_coordinate = models.DecimalField(
        _('Z coordinate'),
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text=_('Z position (height) in meters from floor'),
    )

    # Capacity and status
    max_bins = models.PositiveSmallIntegerField(
        _('max bins'),
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text=_('Maximum number of bins at this location'),
    )

    is_accessible = models.BooleanField(
        _('is accessible'),
        default=True,
        help_text=_('Whether drones can access this location'),
    )

    is_full = models.BooleanField(
        _('is full'),
        default=False,
        db_index=True,
        help_text=_('Whether location is at capacity'),
    )

    is_active = models.BooleanField(
        _('is active'),
        default=True,
        db_index=True,
        help_text=_('Whether this location is in use'),
    )

    notes = models.TextField(
        _('notes'),
        blank=True,
        help_text=_('Additional notes about this location'),
    )

    objects = StorageLocationManager()

    class Meta:
        verbose_name = _('storage location')
        verbose_name_plural = _('storage locations')
        ordering = ['zone', 'aisle', 'rack', 'level', 'position']
        indexes = [
            models.Index(fields=['zone', 'code']),
            models.Index(fields=['aisle', 'rack', 'level']),
            models.Index(fields=['location_type', 'is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['zone', 'code'],
                name='unique_location_code_per_zone',
            ),
        ]

    def __str__(self):
        return f"{self.code} ({self.zone.name})"

    @property
    def full_address(self):
        """Return full location address."""
        parts = [self.aisle, self.rack, self.level]
        if self.position:
            parts.append(self.position)
        return '-'.join(parts)


class BinLabelType(BaseModel):
    """
    Configuration for bin label types (ArUco, QR, etc.).

    Defines how bins are identified visually for drone recognition.

    Attributes:
        organization: The organization this label type belongs to
        name: Display name for the label type
        label_type: Type of label (ArUco, QR)
        dictionary_size: For ArUco, the dictionary size (4x4, 5x5, etc.)
        marker_size_mm: Physical size of the marker in millimeters
        config: Additional configuration as JSON
    """

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='bin_label_types',
        verbose_name=_('organization'),
        help_text=_('The organization this label type belongs to'),
    )

    name = models.CharField(
        _('name'),
        max_length=100,
        help_text=_('Display name for the label type'),
    )

    label_type = models.IntegerField(
        _('label type'),
        choices=BinLabelTypeChoices.choices,
        default=BinLabelTypeChoices.ARUCO,
        help_text=_('Type of label (ArUco, QR)'),
    )

    # ArUco specific settings
    dictionary_size = models.CharField(
        _('dictionary size'),
        max_length=20,
        blank=True,
        help_text=_('ArUco dictionary (e.g., 4x4_50, 5x5_100)'),
    )

    marker_size_mm = models.PositiveIntegerField(
        _('marker size (mm)'),
        default=100,
        validators=[MinValueValidator(10), MaxValueValidator(500)],
        help_text=_('Physical size of the marker in millimeters'),
    )

    # Additional configuration
    config = models.JSONField(
        _('configuration'),
        default=dict,
        blank=True,
        help_text=_('Additional label configuration'),
    )

    is_active = models.BooleanField(
        _('is active'),
        default=True,
        db_index=True,
        help_text=_('Whether this label type is in use'),
    )

    objects = BinLabelTypeManager()

    class Meta:
        verbose_name = _('bin label type')
        verbose_name_plural = _('bin label types')
        ordering = ['organization', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'name'],
                name='unique_label_type_name_per_org',
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_label_type_display()})"


class StorageBinTemplate(BaseModel):
    """
    Template for storage bin configuration.

    Defines standard bin sizes and configurations that can be
    applied to multiple bins.

    Attributes:
        organization: The organization this template belongs to
        label_type: The label type used for this template
        name: Display name for the template
        width, height, depth: Bin dimensions in centimeters
        max_weight_kg: Maximum weight capacity
        coordinate_type: Reference point for coordinates
        config: Additional configuration as JSON
    """

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='bin_templates',
        verbose_name=_('organization'),
        help_text=_('The organization this template belongs to'),
    )

    label_type = models.ForeignKey(
        BinLabelType,
        on_delete=models.PROTECT,
        related_name='templates',
        verbose_name=_('label type'),
        help_text=_('The label type used for bins of this template'),
    )

    name = models.CharField(
        _('name'),
        max_length=100,
        help_text=_('Display name for the template'),
    )

    description = models.TextField(
        _('description'),
        blank=True,
        help_text=_('Description of this bin template'),
    )

    # Dimensions in centimeters
    width = models.DecimalField(
        _('width (cm)'),
        max_digits=6,
        decimal_places=1,
        validators=[MinValueValidator(1)],
        help_text=_('Bin width in centimeters'),
    )

    height = models.DecimalField(
        _('height (cm)'),
        max_digits=6,
        decimal_places=1,
        validators=[MinValueValidator(1)],
        help_text=_('Bin height in centimeters'),
    )

    depth = models.DecimalField(
        _('depth (cm)'),
        max_digits=6,
        decimal_places=1,
        validators=[MinValueValidator(1)],
        help_text=_('Bin depth in centimeters'),
    )

    # Weight capacity
    max_weight_kg = models.DecimalField(
        _('max weight (kg)'),
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0.1)],
        help_text=_('Maximum weight capacity in kilograms'),
    )

    # Coordinate reference
    coordinate_type = models.IntegerField(
        _('coordinate type'),
        choices=BinCoordinateType.choices,
        default=BinCoordinateType.CENTER,
        help_text=_('Reference point for bin coordinates'),
    )

    # Additional configuration
    config = models.JSONField(
        _('configuration'),
        default=dict,
        blank=True,
        help_text=_('Additional bin configuration'),
    )

    is_active = models.BooleanField(
        _('is active'),
        default=True,
        db_index=True,
        help_text=_('Whether this template is in use'),
    )

    objects = StorageBinTemplateManager()

    class Meta:
        verbose_name = _('storage bin template')
        verbose_name_plural = _('storage bin templates')
        ordering = ['organization', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'name'],
                name='unique_template_name_per_org',
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.width}x{self.height}x{self.depth}cm)"

    @property
    def volume_cm3(self):
        """Calculate volume in cubic centimeters."""
        return self.width * self.height * self.depth


class StorageBin(BaseModel):
    """
    Individual storage bin at a location.

    Represents a physical bin that can hold inventory items.

    Attributes:
        location: The storage location this bin is at
        template: The template defining bin configuration
        code: Unique bin code
        label_value: The actual label value (ArUco ID or QR content)
        current_weight_kg: Current weight of contents
        item_count: Number of different items in bin
        is_full: Whether bin is at capacity
    """

    location = models.ForeignKey(
        StorageLocation,
        on_delete=models.CASCADE,
        related_name='bins',
        verbose_name=_('location'),
        help_text=_('The storage location this bin is at'),
    )

    template = models.ForeignKey(
        StorageBinTemplate,
        on_delete=models.PROTECT,
        related_name='bins',
        verbose_name=_('template'),
        help_text=_('The template defining bin configuration'),
    )

    code = models.CharField(
        _('bin code'),
        max_length=50,
        db_index=True,
        help_text=_('Unique bin code'),
    )

    label_value = models.CharField(
        _('label value'),
        max_length=100,
        help_text=_('The actual label value (ArUco ID or QR content)'),
    )

    # Relative position within location (if multiple bins)
    position_index = models.PositiveSmallIntegerField(
        _('position index'),
        default=0,
        help_text=_('Position of this bin within the location'),
    )

    # Current state
    current_weight_kg = models.DecimalField(
        _('current weight (kg)'),
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text=_('Current weight of bin contents'),
    )

    item_count = models.PositiveIntegerField(
        _('item count'),
        default=0,
        help_text=_('Number of stock records in this bin'),
    )

    is_full = models.BooleanField(
        _('is full'),
        default=False,
        db_index=True,
        help_text=_('Whether bin is at capacity'),
    )

    is_active = models.BooleanField(
        _('is active'),
        default=True,
        db_index=True,
        help_text=_('Whether this bin is in use'),
    )

    notes = models.TextField(
        _('notes'),
        blank=True,
        help_text=_('Additional notes about this bin'),
    )

    objects = StorageBinManager()

    class Meta:
        verbose_name = _('storage bin')
        verbose_name_plural = _('storage bins')
        ordering = ['location', 'position_index']
        indexes = [
            models.Index(fields=['location', 'code']),
            models.Index(fields=['label_value']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['location', 'code'],
                name='unique_bin_code_per_location',
            ),
        ]

    def __str__(self):
        return f"{self.code} @ {self.location.code}"

    @property
    def available_weight_kg(self):
        """Calculate remaining weight capacity."""
        return max(0, self.template.max_weight_kg - self.current_weight_kg)

    @property
    def weight_utilization_percent(self):
        """Calculate weight utilization percentage."""
        if self.template.max_weight_kg > 0:
            return round(
                (float(self.current_weight_kg) / float(self.template.max_weight_kg)) * 100,
                1
            )
        return 0


class ItemCategory(BaseModel):
    """
    Hierarchical category for inventory items.

    Supports nested categories with parent-child relationships.

    Attributes:
        organization: The organization this category belongs to
        parent: Parent category (null for root categories)
        name: Category name
        code: Unique category code
        level: Depth in the hierarchy (0 = root)
    """

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='item_categories',
        verbose_name=_('organization'),
        help_text=_('The organization this category belongs to'),
    )

    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name=_('parent category'),
        help_text=_('Parent category (null for root categories)'),
    )

    name = models.CharField(
        _('name'),
        max_length=100,
        help_text=_('Category name'),
    )

    code = models.CharField(
        _('code'),
        max_length=50,
        help_text=_('Unique category code'),
    )

    description = models.TextField(
        _('description'),
        blank=True,
        help_text=_('Category description'),
    )

    level = models.PositiveSmallIntegerField(
        _('level'),
        default=0,
        help_text=_('Depth in the hierarchy (0 = root)'),
    )

    display_order = models.PositiveIntegerField(
        _('display order'),
        default=0,
        help_text=_('Order for display purposes'),
    )

    is_active = models.BooleanField(
        _('is active'),
        default=True,
        db_index=True,
        help_text=_('Whether this category is in use'),
    )

    objects = ItemCategoryManager()

    class Meta:
        verbose_name = _('item category')
        verbose_name_plural = _('item categories')
        ordering = ['organization', 'level', 'display_order', 'name']
        indexes = [
            models.Index(fields=['organization', 'parent']),
            models.Index(fields=['code']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'code'],
                name='unique_category_code_per_org',
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Auto-set level based on parent
        if self.parent:
            self.level = self.parent.level + 1
        else:
            self.level = 0
        super().save(*args, **kwargs)

    @property
    def full_path(self):
        """Return full category path."""
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name


class InventoryItem(AuditedModel):
    """
    Master inventory item (SKU).

    Contains all master data for an item that can be stored and picked.

    Attributes:
        organization: The organization this item belongs to
        category: Item category
        sku: Stock keeping unit (unique identifier)
        name: Item name
        description: Item description
        barcode: Barcode (EAN, UPC, etc.)
        weight_kg: Item weight in kilograms
        dimensions: Length, width, height in centimeters
        unit_of_measure: Unit for quantity tracking
        unit_price: Unit price in organization currency
        min_stock_level: Minimum stock before reorder alert
        reorder_point: Stock level to trigger reorder
        image: Item image
    """

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='inventory_items',
        verbose_name=_('organization'),
        help_text=_('The organization this item belongs to'),
    )

    category = models.ForeignKey(
        ItemCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='items',
        verbose_name=_('category'),
        help_text=_('Item category'),
    )

    sku = models.CharField(
        _('SKU'),
        max_length=100,
        db_index=True,
        help_text=_('Stock keeping unit (unique identifier)'),
    )

    name = models.CharField(
        _('name'),
        max_length=255,
        help_text=_('Item name'),
    )

    description = models.TextField(
        _('description'),
        blank=True,
        help_text=_('Item description'),
    )

    barcode = models.CharField(
        _('barcode'),
        max_length=100,
        blank=True,
        db_index=True,
        help_text=_('Barcode (EAN, UPC, etc.)'),
    )

    # Physical attributes
    weight_kg = models.DecimalField(
        _('weight (kg)'),
        max_digits=8,
        decimal_places=3,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text=_('Item weight in kilograms'),
    )

    length_cm = models.DecimalField(
        _('length (cm)'),
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text=_('Item length in centimeters'),
    )

    width_cm = models.DecimalField(
        _('width (cm)'),
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text=_('Item width in centimeters'),
    )

    height_cm = models.DecimalField(
        _('height (cm)'),
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text=_('Item height in centimeters'),
    )

    # Pricing and units
    unit_of_measure = models.CharField(
        _('unit of measure'),
        max_length=20,
        choices=UnitOfMeasure.choices,
        default=UnitOfMeasure.EACH,
        help_text=_('Unit for quantity tracking'),
    )

    unit_price = models.DecimalField(
        _('unit price'),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text=_('Unit price in organization currency'),
    )

    # Stock management
    min_stock_level = models.PositiveIntegerField(
        _('min stock level'),
        default=0,
        help_text=_('Minimum stock before reorder alert'),
    )

    reorder_point = models.PositiveIntegerField(
        _('reorder point'),
        default=0,
        help_text=_('Stock level to trigger reorder'),
    )

    reorder_quantity = models.PositiveIntegerField(
        _('reorder quantity'),
        default=0,
        help_text=_('Suggested quantity to reorder'),
    )

    # Image
    image = models.ImageField(
        _('image'),
        upload_to='inventory/items/',
        null=True,
        blank=True,
        help_text=_('Item image'),
    )

    is_active = models.BooleanField(
        _('is active'),
        default=True,
        db_index=True,
        help_text=_('Whether this item is in use'),
    )

    objects = InventoryItemManager()

    class Meta:
        verbose_name = _('inventory item')
        verbose_name_plural = _('inventory items')
        ordering = ['organization', 'sku']
        indexes = [
            models.Index(fields=['organization', 'sku']),
            models.Index(fields=['organization', 'category']),
            models.Index(fields=['barcode']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'sku'],
                name='unique_sku_per_org',
            ),
        ]

    def __str__(self):
        return f"{self.sku} - {self.name}"

    @property
    def volume_cm3(self):
        """Calculate volume if dimensions are set."""
        if self.length_cm and self.width_cm and self.height_cm:
            return self.length_cm * self.width_cm * self.height_cm
        return None


class InventoryStock(AuditedModel):
    """
    Stock record for an item at a specific bin.

    Tracks quantity of a specific item at a specific storage bin,
    including lot tracking and expiry.

    Attributes:
        bin: The storage bin
        item: The inventory item
        quantity: Current quantity
        lot_number: Lot/batch number
        expiry_date: Expiration date
        last_counted_at: Last physical count date
    """

    bin = models.ForeignKey(
        StorageBin,
        on_delete=models.CASCADE,
        related_name='stocks',
        verbose_name=_('bin'),
        help_text=_('The storage bin'),
    )

    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name='stocks',
        verbose_name=_('item'),
        help_text=_('The inventory item'),
    )

    quantity = models.IntegerField(
        _('quantity'),
        default=0,
        validators=[MinValueValidator(0)],
        help_text=_('Current quantity in stock'),
    )

    reserved_quantity = models.IntegerField(
        _('reserved quantity'),
        default=0,
        validators=[MinValueValidator(0)],
        help_text=_('Quantity reserved for orders'),
    )

    lot_number = models.CharField(
        _('lot number'),
        max_length=100,
        blank=True,
        db_index=True,
        help_text=_('Lot/batch number'),
    )

    expiry_date = models.DateField(
        _('expiry date'),
        null=True,
        blank=True,
        db_index=True,
        help_text=_('Expiration date'),
    )

    manufacture_date = models.DateField(
        _('manufacture date'),
        null=True,
        blank=True,
        help_text=_('Date of manufacture'),
    )

    received_at = models.DateTimeField(
        _('received at'),
        null=True,
        blank=True,
        help_text=_('When this stock was received'),
    )

    last_counted_at = models.DateTimeField(
        _('last counted at'),
        null=True,
        blank=True,
        help_text=_('Last physical count date'),
    )

    notes = models.TextField(
        _('notes'),
        blank=True,
        help_text=_('Additional notes about this stock'),
    )

    objects = InventoryStockManager()

    class Meta:
        verbose_name = _('inventory stock')
        verbose_name_plural = _('inventory stocks')
        ordering = ['bin', 'item', '-created_at']
        indexes = [
            models.Index(fields=['bin', 'item']),
            models.Index(fields=['item', 'quantity']),
            models.Index(fields=['lot_number']),
            models.Index(fields=['expiry_date']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantity__gte=0),
                name='stock_quantity_non_negative',
            ),
            models.CheckConstraint(
                check=models.Q(reserved_quantity__lte=models.F('quantity')),
                name='reserved_not_exceed_quantity',
            ),
        ]

    def __str__(self):
        return f"{self.item.sku} x {self.quantity} @ {self.bin.code}"

    @property
    def available_quantity(self):
        """Calculate quantity available (not reserved)."""
        return max(0, self.quantity - self.reserved_quantity)

    @property
    def is_expired(self):
        """Check if stock is expired."""
        if self.expiry_date:
            from django.utils import timezone
            return self.expiry_date < timezone.now().date()
        return False

    @property
    def total_weight_kg(self):
        """Calculate total weight of this stock."""
        if self.item.weight_kg:
            return self.item.weight_kg * self.quantity
        return None

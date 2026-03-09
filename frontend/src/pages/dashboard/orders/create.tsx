import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, Minus, Trash2, Loader2, Search,
  ShoppingCart, Package, X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import ordersApi from '@/api/endpoints/orders'
import inventoryApi from '@/api/endpoints/inventory'
import warehousesApi from '@/api/endpoints/warehouses'
import { getErrorMessage } from '@/lib/api-error'
import { useCartStore } from '@/stores/cart-store'

const BROWSE_PAGE_SIZE = 20

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = searchParams.get('tab') === 'cart' ? 'cart' : 'browse'
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true })
  }

  // Cart store
  const {
    items: cartItems,
    warehouse, priority, customerName, customerCode,
    externalReference, dueDate, addressLine1, addressLine2,
    city, state: shippingState, postalCode, country, notes,
    addItem, updateItem, removeItem, clearCart, setOrderMeta,
  } = useCartStore()

  // Browse state
  const [browseSearch, setBrowseSearch] = useState('')
  const [browseCategoryFilter, setBrowseCategoryFilter] = useState<string>('all')
  const [browsePage, setBrowsePage] = useState(1)
  const [quantities, setQuantities] = useState<Record<number, number>>({})

  // Fetch items for browsing
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['browse-items', browseSearch, browseCategoryFilter, browsePage],
    queryFn: () => inventoryApi.getInventoryItems({
      search: browseSearch || undefined,
      category: browseCategoryFilter !== 'all' ? parseInt(browseCategoryFilter) : undefined,
      is_active: true,
      ordering: 'sku',
      page: browsePage,
      page_size: BROWSE_PAGE_SIZE,
    }),
  })
  const browseItems = itemsData?.data?.results || []
  const browseTotalCount = itemsData?.data?.count || 0
  const browseTotalPages = Math.ceil(browseTotalCount / BROWSE_PAGE_SIZE)

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ['item-categories-browse'],
    queryFn: () => inventoryApi.getItemCategories({ is_active: true, page_size: 1000 }),
  })
  const categories = categoriesData?.data?.results || []

  // Fetch warehouses for checkout
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehousesApi.getWarehouses({ page_size: 100, is_active: true }),
  })
  const warehouses = warehousesData?.data?.results || []

  // Fetch bins for cart
  const { data: binsData } = useQuery({
    queryKey: ['bins-list'],
    queryFn: () => inventoryApi.getStorageBins({ page_size: 500, is_active: true }),
  })
  const bins = binsData?.data?.results || []

  // Create order mutation
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof ordersApi.createOrder>[0]) => ordersApi.createOrder(data),
    onSuccess: () => {
      toast.success('Order created successfully', { duration: 4000 })
      clearCart()
      queryClient.refetchQueries({ queryKey: ['orders'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['orders-stats'], type: 'all' })
      navigate('/dashboard/orders')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create order', { duration: 5000 })
    },
  })

  const getQty = (itemId: number) => quantities[itemId] ?? 1
  const setQty = (itemId: number, qty: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: Math.max(1, qty) }))
  }

  const handleAddToCart = (item: { id: number; uuid: string; sku: string; name: string; unit_price: string | null }) => {
    const qty = getQty(item.id)
    addItem({
      item_id: item.id,
      item_uuid: item.uuid,
      item_sku: item.sku,
      item_name: item.name,
      unit_price: item.unit_price,
      source_bin_id: null,
      source_bin_code: null,
      quantity: qty,
      lot_number: '',
      notes: '',
    })
    setQuantities((prev) => ({ ...prev, [item.id]: 1 }))
    toast.success(`Added ${qty}x ${item.sku} to cart`, { duration: 3000 })
  }

  const getCartQtyForItem = (itemId: number) => {
    return cartItems
      .filter((ci) => ci.item_id === itemId)
      .reduce((sum, ci) => sum + ci.quantity, 0)
  }

  const handlePlaceOrder = () => {
    if (!warehouse) {
      toast.error('Please select a warehouse', { duration: 5000 })
      return
    }
    if (cartItems.length === 0) {
      toast.error('Your cart is empty. Add items before placing an order.', { duration: 5000 })
      return
    }

    const linesWithoutBin = cartItems.filter((ci) => !ci.source_bin_id)
    if (linesWithoutBin.length > 0) {
      toast.error(`Please select a source bin for all items (${linesWithoutBin.length} missing)`, { duration: 5000 })
      return
    }

    createMutation.mutate({
      organization: 1, // TODO: get from user context
      warehouse: warehouse,
      priority,
      customer_name: customerName,
      customer_code: customerCode,
      external_reference: externalReference || undefined,
      due_date: dueDate || undefined,
      shipping_address_line1: addressLine1,
      shipping_address_line2: addressLine2,
      shipping_city: city,
      shipping_state: shippingState,
      shipping_postal_code: postalCode,
      shipping_country: country,
      notes,
      lines: cartItems.map((ci) => ({
        item: ci.item_id,
        source_bin: ci.source_bin_id!,
        quantity: ci.quantity,
        lot_number: ci.lot_number || undefined,
        notes: ci.notes || undefined,
      })),
    })
  }

  const clearBrowseFilters = () => {
    setBrowseSearch('')
    setBrowseCategoryFilter('all')
    setBrowsePage(1)
  }
  const hasBrowseFilters = browseSearch || browseCategoryFilter !== 'all'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Order</h1>
          <p className="text-muted-foreground">Browse items and build your order</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse" className="gap-2">
            <Package className="h-4 w-4" />
            Browse Items
          </TabsTrigger>
          <TabsTrigger value="cart" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Cart
            {cartItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {cartItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ==================== BROWSE TAB ==================== */}
        <TabsContent value="browse" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by SKU, name, barcode..."
                    value={browseSearch}
                    onChange={(e) => { setBrowseSearch(e.target.value); setBrowsePage(1) }}
                    className="pl-10"
                  />
                </div>
                <Select value={browseCategoryFilter} onValueChange={(v) => { setBrowseCategoryFilter(v); setBrowsePage(1) }}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasBrowseFilters && (
                  <Button variant="ghost" size="sm" onClick={clearBrowseFilters}>
                    <X className="h-4 w-4 mr-1" /> Clear
                  </Button>
                )}
              </div>

              {itemsLoading ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
              ) : browseItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items found. {hasBrowseFilters ? 'Try adjusting your filters.' : 'No active inventory items available.'}
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {browseItems.map((item) => {
                      const inCartQty = getCartQtyForItem(item.id)
                      return (
                        <Card key={item.uuid} className="relative">
                          {inCartQty > 0 && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="default" className="text-xs">
                                In Cart: {inCartQty}
                              </Badge>
                            </div>
                          )}
                          <CardContent className="pt-4 pb-3 px-4">
                            <div className="mb-2">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">{item.sku}</code>
                            </div>
                            <h4 className="font-medium text-sm truncate">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              {item.category_name && <span>{item.category_name}</span>}
                              {item.category_name && item.unit_price && <span>·</span>}
                              {item.unit_price && <span>₹{item.unit_price}</span>}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant={
                                item.min_stock_level > 0 && (item.total_stock || 0) < item.min_stock_level
                                  ? 'destructive' : 'secondary'
                              } className="text-xs">
                                Stock: {item.total_stock ?? 0}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{item.uom_display}</Badge>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex items-center gap-2">
                              <div className="flex items-center border rounded-md">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setQty(item.id, getQty(item.id) - 1)}
                                  disabled={getQty(item.id) <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min={1}
                                  value={getQty(item.id)}
                                  onChange={(e) => setQty(item.id, parseInt(e.target.value) || 1)}
                                  className="h-8 w-14 text-center border-0 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setQty(item.id, getQty(item.id) + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => handleAddToCart(item)}
                              >
                                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                                Add
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  {/* Pagination */}
                  {browseTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {browsePage} of {browseTotalPages} ({browseTotalCount} items)
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBrowsePage((p) => Math.max(1, p - 1))}
                          disabled={browsePage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBrowsePage((p) => Math.min(browseTotalPages, p + 1))}
                          disabled={browsePage === browseTotalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== CART & CHECKOUT TAB ==================== */}
        <TabsContent value="cart" className="space-y-6 mt-4">
          {/* Cart Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cart ({cartItems.length} items)</CardTitle>
              {cartItems.length > 0 && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={clearCart}>
                  <Trash2 className="h-4 w-4 mr-1" /> Clear Cart
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {cartItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Your cart is empty.</p>
                  <Button variant="link" className="mt-1" onClick={() => setActiveTab('browse')}>
                    Browse items to get started
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Source Bin</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Lot #</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.map((ci) => (
                        <TableRow key={ci.id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">{ci.item_sku}</code>
                          </TableCell>
                          <TableCell className="font-medium">{ci.item_name}</TableCell>
                          <TableCell>
                            <Select
                              value={ci.source_bin_id ? String(ci.source_bin_id) : ''}
                              onValueChange={(v) => {
                                const bin = bins.find((b) => b.id === Number(v))
                                updateItem(ci.id, {
                                  source_bin_id: Number(v),
                                  source_bin_code: bin?.code || null,
                                })
                              }}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue placeholder="Select bin" />
                              </SelectTrigger>
                              <SelectContent>
                                {bins.map((bin) => (
                                  <SelectItem key={bin.id} value={String(bin.id)}>{bin.code}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={ci.quantity}
                              onChange={(e) => updateItem(ci.id, { quantity: parseInt(e.target.value) || 1 })}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={ci.lot_number}
                              onChange={(e) => updateItem(ci.id, { lot_number: e.target.value })}
                              placeholder="Optional"
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ci.unit_price ? `₹${ci.unit_price}` : '—'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(ci.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Details - only show when cart has items */}
          {cartItems.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="warehouse">Warehouse *</Label>
                      <Select
                        value={warehouse ? String(warehouse) : ''}
                        onValueChange={(v) => setOrderMeta({ warehouse: Number(v) })}
                      >
                        <SelectTrigger id="warehouse">
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((wh) => (
                            <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={priority}
                        onValueChange={(v) => setOrderMeta({ priority: v })}
                      >
                        <SelectTrigger id="priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setOrderMeta({ dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="ext_ref">External Reference</Label>
                      <Input
                        id="ext_ref"
                        value={externalReference}
                        onChange={(e) => setOrderMeta({ externalReference: e.target.value })}
                        placeholder="e.g., ERP-12345"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer_name">Customer Name</Label>
                      <Input
                        id="customer_name"
                        value={customerName}
                        onChange={(e) => setOrderMeta({ customerName: e.target.value })}
                        placeholder="Customer name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer_code">Customer Code</Label>
                      <Input
                        id="customer_code"
                        value={customerCode}
                        onChange={(e) => setOrderMeta({ customerCode: e.target.value })}
                        placeholder="e.g., CUST-001"
                      />
                    </div>
                  </div>

                  <Separator />

                  <h4 className="text-sm font-medium">Shipping Address</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="addr1">Address Line 1</Label>
                      <Input
                        id="addr1"
                        value={addressLine1}
                        onChange={(e) => setOrderMeta({ addressLine1: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr2">Address Line 2</Label>
                      <Input
                        id="addr2"
                        value={addressLine2}
                        onChange={(e) => setOrderMeta({ addressLine2: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setOrderMeta({ city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={shippingState}
                        onChange={(e) => setOrderMeta({ state: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal">Postal Code</Label>
                      <Input
                        id="postal"
                        value={postalCode}
                        onChange={(e) => setOrderMeta({ postalCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={country}
                        onChange={(e) => setOrderMeta({ country: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={notes}
                    onChange={(e) => setOrderMeta({ notes: e.target.value })}
                    placeholder="Any additional notes for this order..."
                    rows={3}
                  />
                </CardContent>
              </Card>

              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => navigate('/dashboard/orders')}>
                  Cancel
                </Button>
                <Button onClick={handlePlaceOrder} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Place Order ({cartItems.length} items)
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

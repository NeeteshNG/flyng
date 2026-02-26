import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, Trash2, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import ordersApi from '@/api/endpoints/orders'
import inventoryApi from '@/api/endpoints/inventory'
import warehousesApi from '@/api/endpoints/warehouses'
import { getErrorMessage } from '@/lib/api-error'

interface OrderLineInput {
  item: number | ''
  source_bin: number | ''
  quantity: number
  lot_number: string
  notes: string
}

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [warehouse, setWarehouse] = useState<number | ''>('')
  const [priority, setPriority] = useState('NORMAL')
  const [customerName, setCustomerName] = useState('')
  const [customerCode, setCustomerCode] = useState('')
  const [externalReference, setExternalReference] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('India')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<OrderLineInput[]>([
    { item: '', source_bin: '', quantity: 1, lot_number: '', notes: '' },
  ])

  // Fetch warehouses
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehousesApi.getWarehouses({ page_size: 100, is_active: true }),
  })
  const warehouses = warehousesData?.data?.results || []

  // Fetch items
  const { data: itemsData } = useQuery({
    queryKey: ['items-list'],
    queryFn: () => inventoryApi.getInventoryItems({ page_size: 500, is_active: true }),
  })
  const items = itemsData?.data?.results || []

  // Fetch bins
  const { data: binsData } = useQuery({
    queryKey: ['bins-list'],
    queryFn: () => inventoryApi.getStorageBins({ page_size: 500, is_active: true }),
  })
  const bins = binsData?.data?.results || []

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof ordersApi.createOrder>[0]) => ordersApi.createOrder(data),
    onSuccess: () => {
      toast.success('Order created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['orders'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['orders-stats'], type: 'all' })
      navigate('/dashboard/orders')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create order', { duration: 5000 })
    },
  })

  const addLine = () => {
    setLines([...lines, { item: '', source_bin: '', quantity: 1, lot_number: '', notes: '' }])
  }

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index))
    }
  }

  const updateLine = (index: number, field: keyof OrderLineInput, value: string | number) => {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value }
    setLines(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!warehouse) {
      toast.error('Please select a warehouse', { duration: 5000 })
      return
    }

    const validLines = lines.filter((l) => l.item && l.source_bin && l.quantity > 0)
    if (validLines.length === 0) {
      toast.error('Please add at least one order line with item, bin, and quantity', { duration: 5000 })
      return
    }

    createMutation.mutate({
      organization: 1, // TODO: get from user context
      warehouse: warehouse as number,
      priority,
      customer_name: customerName,
      customer_code: customerCode,
      external_reference: externalReference,
      due_date: dueDate || undefined,
      shipping_address_line1: addressLine1,
      shipping_address_line2: addressLine2,
      shipping_city: city,
      shipping_state: state,
      shipping_postal_code: postalCode,
      shipping_country: country,
      notes,
      lines: validLines.map((l) => ({
        item: l.item as number,
        source_bin: l.source_bin as number,
        quantity: l.quantity,
        lot_number: l.lot_number,
        notes: l.notes,
      })),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Order</h1>
          <p className="text-muted-foreground">Create a new pick order for fulfillment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="warehouse">Warehouse *</Label>
                <Select value={warehouse ? String(warehouse) : ''} onValueChange={(v) => setWarehouse(Number(v))}>
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
                <Select value={priority} onValueChange={setPriority}>
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
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ext_ref">External Reference</Label>
                <Input
                  id="ext_ref"
                  value={externalReference}
                  onChange={(e) => setExternalReference(e.target.value)}
                  placeholder="e.g., ERP-12345"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
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
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="customer_code">Customer Code</Label>
                <Input
                  id="customer_code"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  placeholder="e.g., CUST-001"
                />
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">Shipping Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="addr1">Address Line 1</Label>
                <Input id="addr1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="addr2">Address Line 2</Label>
                <Input id="addr2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="postal">Postal Code</Label>
                <Input id="postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Lines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Order Lines</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" /> Add Line
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.map((line, index) => (
              <div key={index} className="flex gap-3 items-start border rounded-lg p-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Item *</Label>
                    <Select
                      value={line.item ? String(line.item) : ''}
                      onValueChange={(v) => updateLine(index, 'item', Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.sku} - {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Source Bin *</Label>
                    <Select
                      value={line.source_bin ? String(line.source_bin) : ''}
                      onValueChange={(v) => updateLine(index, 'source_bin', Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bin" />
                      </SelectTrigger>
                      <SelectContent>
                        {bins.map((bin) => (
                          <SelectItem key={bin.id} value={String(bin.id)}>
                            {bin.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Quantity *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Lot Number</Label>
                    <Input
                      value={line.lot_number}
                      onChange={(e) => updateLine(index, 'lot_number', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                  className="mt-5"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes for this order..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/orders')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Order
          </Button>
        </div>
      </form>
    </div>
  )
}

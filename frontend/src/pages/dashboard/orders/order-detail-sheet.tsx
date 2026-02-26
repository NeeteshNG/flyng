import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart, MapPin, User, Clock, Package, Truck,
  CheckCircle, AlertTriangle, FileText,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import ordersApi, { PickOrder } from '@/api/endpoints/orders'
import { useFormat } from '@/hooks/use-format'

interface OrderDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: PickOrder | null
}

const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'DELIVERED': return 'default'
    case 'SHIPPED':
    case 'PACKED':
    case 'PICKED': return 'default'
    case 'PICKING':
    case 'PACKING':
    case 'CONFIRMED': return 'secondary'
    case 'CANCELLED': return 'destructive'
    case 'ON_HOLD': return 'outline'
    default: return 'outline'
  }
}

const priorityBadgeVariant = (priority: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (priority) {
    case 'URGENT': return 'destructive'
    case 'HIGH': return 'default'
    case 'NORMAL': return 'secondary'
    default: return 'outline'
  }
}

export default function OrderDetailSheet({ open, onOpenChange, order }: OrderDetailSheetProps) {
  const { formatDate, formatDateTime } = useFormat()

  const { data: detailData } = useQuery({
    queryKey: ['order-detail', order?.uuid],
    queryFn: () => ordersApi.getOrder(order!.uuid),
    enabled: !!order?.uuid && open,
  })

  const detail = detailData?.data || order
  if (!detail) return null

  const lines = detail.lines || []
  const progressPercent = detail.total_items
    ? Math.round(((detail.picked_items || 0) / detail.total_items) * 100)
    : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {detail.order_number}
          </SheetTitle>
          <SheetDescription>
            Order details and pick line information
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status & Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusBadgeVariant(detail.status)}>
              {detail.status_display}
            </Badge>
            <Badge variant={priorityBadgeVariant(detail.priority)}>
              {detail.priority_display}
            </Badge>
            {detail.is_overdue && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Overdue
              </Badge>
            )}
          </div>

          {/* Progress */}
          {detail.total_lines > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Pick Progress</span>
                <span className="font-medium">{detail.picked_lines}/{detail.total_lines} lines ({progressPercent}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Order Info */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4" /> Order Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Order Number</span>
                <p className="font-medium">{detail.order_number}</p>
              </div>
              {detail.external_reference && (
                <div>
                  <span className="text-muted-foreground">External Ref</span>
                  <p className="font-medium">{detail.external_reference}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Order Date</span>
                <p className="font-medium">{formatDate(detail.order_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Due Date</span>
                <p className={`font-medium ${detail.is_overdue ? 'text-red-500' : ''}`}>
                  {formatDate(detail.due_date)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Warehouse</span>
                <p className="font-medium">{detail.warehouse_name}</p>
              </div>
              {detail.batch_number && (
                <div>
                  <span className="text-muted-foreground">Batch</span>
                  <p className="font-medium">{detail.batch_number}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <User className="h-4 w-4" /> Customer
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium">{detail.customer_name || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Code</span>
                <p className="font-medium">{detail.customer_code || '—'}</p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {detail.shipping_address && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4" /> Shipping Address
                </h3>
                <p className="text-sm">{detail.shipping_address}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Assignment */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <User className="h-4 w-4" /> Assignment
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Assigned To</span>
                <p className="font-medium">{detail.assigned_to_name || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created By</span>
                <p className="font-medium">{detail.created_by_name || '—'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" /> Timeline
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Created', date: detail.created_at, icon: FileText },
                { label: 'Confirmed', date: detail.confirmed_at, icon: CheckCircle },
                { label: 'Picking Started', date: detail.picking_started_at, icon: Package },
                { label: 'Picking Completed', date: detail.picking_completed_at, icon: CheckCircle },
                { label: 'Packed', date: detail.packed_at, icon: Package },
                { label: 'Shipped', date: detail.shipped_at, icon: Truck },
                { label: 'Delivered', date: detail.delivered_at, icon: CheckCircle },
                { label: 'Cancelled', date: detail.cancelled_at, icon: AlertTriangle },
              ]
                .filter((item) => item.date)
                .map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground w-36">{item.label}</span>
                    <span className="font-medium">{formatDateTime(item.date)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Cancellation Reason */}
          {detail.cancellation_reason && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-red-500 mb-2">Cancellation Reason</h3>
                <p className="text-sm">{detail.cancellation_reason}</p>
              </div>
            </>
          )}

          {/* Order Lines */}
          {lines.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4" /> Order Lines ({lines.length})
                </h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Bin</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Picked</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="text-muted-foreground">{line.line_number}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{line.item_name}</div>
                              <code className="text-xs text-muted-foreground">{line.item_sku}</code>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{line.bin_code}</code>
                          </TableCell>
                          <TableCell>{line.quantity}</TableCell>
                          <TableCell>{line.picked_quantity}</TableCell>
                          <TableCell>
                            {line.is_picked ? (
                              <Badge variant="default" className="text-xs">Picked</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {(detail.notes || detail.internal_notes) && (
            <>
              <Separator />
              <div className="space-y-3">
                {detail.notes && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Notes</h3>
                    <p className="text-sm text-muted-foreground">{detail.notes}</p>
                  </div>
                )}
                {detail.internal_notes && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Internal Notes</h3>
                    <p className="text-sm text-muted-foreground">{detail.internal_notes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>Created: {formatDateTime(detail.created_at)}</div>
            <div>Updated: {formatDateTime(detail.updated_at)}</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

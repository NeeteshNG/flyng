import { useQuery } from '@tanstack/react-query'
import {
  Package, Calendar, MapPin, Layers, AlertTriangle, Hash, Weight,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

import inventoryApi, { InventoryStock } from '@/api/endpoints/inventory'

interface StockDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stock: InventoryStock | null
}

export default function StockDetailSheet({ open, onOpenChange, stock }: StockDetailSheetProps) {
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['inventory-stock-detail', stock?.uuid],
    queryFn: () => inventoryApi.getStockRecord(stock!.uuid),
    enabled: !!stock?.uuid && open,
  })

  const detail = detailData?.data || stock

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const formatDateOnly = (dateString: string | null | undefined) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  if (!stock) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Details
          </SheetTitle>
          <SheetDescription>Inventory stock record information</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  detail.is_expired ? 'bg-red-100 text-red-600'
                  : detail.available_quantity > 0 ? 'bg-green-100 text-green-600'
                  : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {detail.is_expired ? <AlertTriangle className="h-5 w-5" />
                  : <Package className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-medium">{detail.item_name}</p>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{detail.item_sku}</code>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {detail.is_expired && <Badge variant="destructive">Expired</Badge>}
                {detail.available_quantity > 0
                  ? <Badge variant="success">Available</Badge>
                  : <Badge variant="secondary">No Stock</Badge>}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Bin</p>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">{detail.bin_code}</code>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium font-mono text-xs">{detail.location_code}</p>
                </div>
                {detail.warehouse_name && (
                  <div>
                    <p className="text-muted-foreground">Warehouse</p>
                    <p className="font-medium">{detail.warehouse_name}</p>
                  </div>
                )}
                {detail.zone_name && (
                  <div>
                    <p className="text-muted-foreground">Zone</p>
                    <p className="font-medium">{detail.zone_name}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" /> Quantities
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <Badge variant="secondary">{detail.quantity}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Reserved</p>
                  {detail.reserved_quantity > 0
                    ? <Badge variant="outline">{detail.reserved_quantity}</Badge>
                    : <span className="text-muted-foreground">0</span>}
                </div>
                <div>
                  <p className="text-muted-foreground">Available</p>
                  <span className="font-bold">{detail.available_quantity}</span>
                </div>
              </div>
              {detail.total_weight_kg && (
                <div className="text-sm">
                  <p className="text-muted-foreground flex items-center gap-1"><Weight className="h-3 w-3" /> Total Weight</p>
                  <p className="font-medium">{detail.total_weight_kg} kg</p>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Hash className="h-4 w-4" /> Lot & Expiry
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Lot Number</p>
                  <p className="font-medium">{detail.lot_number || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expiry Date</p>
                  <p className={`font-medium ${detail.is_expired ? 'text-red-500' : ''}`}>
                    {formatDateOnly(detail.expiry_date)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Manufacture Date</p>
                  <p className="font-medium">{formatDateOnly(detail.manufacture_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Received At</p>
                  <p className="font-medium">{formatDate(detail.received_at)}</p>
                </div>
                {detail.last_counted_at && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Last Counted</p>
                    <p className="font-medium">{formatDate(detail.last_counted_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {detail.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Notes</h3>
                  <p className="text-sm text-muted-foreground">{detail.notes}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Timestamps
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(detail.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium">{formatDate(detail.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Stock details not available</div>
        )}
      </SheetContent>
    </Sheet>
  )
}

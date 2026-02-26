import { useQuery } from '@tanstack/react-query'
import {
  Package, Calendar, CheckCircle, XCircle, Ruler, Weight,
  Tag, AlertTriangle, BarChart3,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

import inventoryApi, { InventoryItem } from '@/api/endpoints/inventory'

interface ItemDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
}

export default function ItemDetailSheet({ open, onOpenChange, item }: ItemDetailSheetProps) {
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['inventory-item-detail', item?.uuid],
    queryFn: () => inventoryApi.getInventoryItem(item!.uuid),
    enabled: !!item?.uuid && open,
  })

  const detail = detailData?.data || item

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  if (!item) return null

  const isLowStock = detail && detail.min_stock_level > 0 && (detail.total_stock || 0) < detail.min_stock_level

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {detail?.name || 'Item Details'}
          </SheetTitle>
          <SheetDescription>Inventory item information and stock levels</SheetDescription>
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
                  isLowStock ? 'bg-yellow-100 text-yellow-600'
                  : detail.is_active ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-600'
                }`}>
                  {isLowStock ? <AlertTriangle className="h-5 w-5" />
                  : detail.is_active ? <CheckCircle className="h-5 w-5" />
                  : <XCircle className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-medium">{detail.name}</p>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{detail.sku}</code>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={detail.is_active ? 'success' : 'secondary'}>
                  {detail.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {isLowStock && <Badge variant="warning">Low Stock</Badge>}
              </div>
            </div>

            {detail.description && (
              <>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  <p className="text-sm text-muted-foreground">{detail.description}</p>
                </div>
                <Separator />
              </>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" /> Identification
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">SKU</p>
                  <p className="font-medium font-mono">{detail.sku}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Barcode</p>
                  <p className="font-medium">{detail.barcode || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{detail.category_name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unit</p>
                  <Badge variant="outline">{detail.uom_display}</Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4" /> Physical Properties
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground flex items-center gap-1"><Weight className="h-3 w-3" /> Weight</p>
                  <p className="font-medium">{detail.weight_kg ? `${detail.weight_kg} kg` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dimensions (L×W×H)</p>
                  <p className="font-medium">
                    {detail.length_cm && detail.width_cm && detail.height_cm
                      ? `${detail.length_cm}×${detail.width_cm}×${detail.height_cm} cm`
                      : '—'}
                  </p>
                </div>
                {detail.volume_cm3 && (
                  <div>
                    <p className="text-muted-foreground">Volume</p>
                    <p className="font-medium">{detail.volume_cm3} cm³</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Unit Price</p>
                  <p className="font-medium">{detail.unit_price ? `₹${detail.unit_price}` : '—'}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Stock Management
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Stock</p>
                  <Badge variant={isLowStock ? 'destructive' : 'secondary'}>{detail.total_stock ?? 0}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Min Stock Level</p>
                  <p className="font-medium">{detail.min_stock_level}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reorder Point</p>
                  <p className="font-medium">{detail.reorder_point}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reorder Quantity</p>
                  <p className="font-medium">{detail.reorder_quantity || 0}</p>
                </div>
              </div>
            </div>

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
          <div className="py-8 text-center text-muted-foreground">Item details not available</div>
        )}
      </SheetContent>
    </Sheet>
  )
}

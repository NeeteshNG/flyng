import { useQuery } from '@tanstack/react-query'
import {
  Archive,
  MapPin,
  Calendar,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Weight,
  Ruler,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

import inventoryApi, { StorageBin } from '@/api/endpoints/inventory'

interface BinDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bin: StorageBin | null
}

export default function BinDetailSheet({
  open,
  onOpenChange,
  bin,
}: BinDetailSheetProps) {
  // Fetch full bin details
  const { data: binData, isLoading } = useQuery({
    queryKey: ['storage-bin-detail', bin?.uuid],
    queryFn: () => inventoryApi.getStorageBin(bin!.uuid),
    enabled: !!bin?.uuid && open,
  })

  const binDetail = binData?.data || bin

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!bin) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            {binDetail?.code || 'Bin Details'}
          </SheetTitle>
          <SheetDescription>
            Storage bin information and configuration
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : binDetail ? (
          <div className="space-y-6 py-4">
            {/* Status Banner */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  binDetail.is_active && !binDetail.is_full
                    ? 'bg-green-100 text-green-600'
                    : binDetail.is_full
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {binDetail.is_active && !binDetail.is_full ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : binDetail.is_full ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{binDetail.code}</p>
                  {binDetail.label_value && (
                    <p className="text-xs text-muted-foreground">
                      {binDetail.label_value}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={binDetail.is_active ? 'success' : 'secondary'}>
                  {binDetail.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {binDetail.is_full && (
                  <Badge variant="warning">Full</Badge>
                )}
              </div>
            </div>

            {/* Location Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Storage Location</p>
                  <p className="font-medium font-mono">{binDetail.location_code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Full Address</p>
                  <p className="font-medium font-mono text-xs">{binDetail.location_full_address}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Warehouse</p>
                  <p className="font-medium">{binDetail.warehouse_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Zone</p>
                  <p className="font-medium">{binDetail.zone_name}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Template Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Template Configuration
              </h3>
              <div className="p-3 rounded-md bg-muted text-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Template</p>
                    <Badge variant="outline">{binDetail.template_name}</Badge>
                  </div>
                  {binDetail.template_capacity && (
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground">Max Weight</p>
                      <p className="font-medium">{binDetail.template_capacity} kg</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Current Status */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Current Status
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Position Index</p>
                  <p className="font-medium">{binDetail.position_index}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Item Count</p>
                  <p className="font-medium">{binDetail.item_count}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    Current Weight
                  </p>
                  <p className="font-medium">{binDetail.current_weight_kg} kg</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {binDetail.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Notes</h3>
                  <p className="text-sm text-muted-foreground">{binDetail.notes}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Timestamps */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timestamps
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(binDetail.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium">{formatDate(binDetail.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Bin details not available
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

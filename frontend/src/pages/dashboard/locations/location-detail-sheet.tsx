import { useQuery } from '@tanstack/react-query'
import {
  MapPin,
  Layers,
  Calendar,
  Package,
  Move3D,
  CheckCircle,
  XCircle,
  AlertTriangle,
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

import inventoryApi, { StorageLocation } from '@/api/endpoints/inventory'

interface LocationDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location: StorageLocation | null
}

const LOCATION_TYPES: Record<string, string> = {
  RACK: 'Rack',
  FLOOR: 'Floor',
  SHELF: 'Shelf',
  PALLET: 'Pallet',
  BIN_AREA: 'Bin Area',
  OTHER: 'Other',
}

export default function LocationDetailSheet({
  open,
  onOpenChange,
  location,
}: LocationDetailSheetProps) {
  // Fetch full location details
  const { data: locationData, isLoading } = useQuery({
    queryKey: ['storage-location-detail', location?.uuid],
    queryFn: () => inventoryApi.getStorageLocation(location!.uuid),
    enabled: !!location?.uuid && open,
  })

  const locationDetail = locationData?.data || location

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

  if (!location) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {locationDetail?.code || 'Location Details'}
          </SheetTitle>
          <SheetDescription>
            Storage location information and configuration
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : locationDetail ? (
          <div className="space-y-6 py-4">
            {/* Status Banner */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  locationDetail.is_active && locationDetail.is_accessible
                    ? 'bg-green-100 text-green-600'
                    : !locationDetail.is_accessible
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {locationDetail.is_active && locationDetail.is_accessible ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : !locationDetail.is_accessible ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{locationDetail.code}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {locationDetail.aisle}-{locationDetail.rack}-{locationDetail.level}
                    {locationDetail.position && `-${locationDetail.position}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={locationDetail.is_active ? 'success' : 'secondary'}>
                  {locationDetail.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {!locationDetail.is_accessible && (
                  <Badge variant="destructive">Not Accessible</Badge>
                )}
                {locationDetail.is_full && (
                  <Badge variant="warning">Full</Badge>
                )}
              </div>
            </div>

            {/* Location Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Location
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Zone</p>
                  <p className="font-medium">{locationDetail.zone_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Warehouse</p>
                  <p className="font-medium">{locationDetail.warehouse_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {LOCATION_TYPES[locationDetail.location_type] || locationDetail.location_type}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Full Address</p>
                  <p className="font-medium font-mono">{locationDetail.full_address}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Address Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Address Components</h3>
              <div className="p-3 rounded-md bg-muted text-sm">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-muted-foreground">Aisle</p>
                    <p className="font-mono font-medium">{locationDetail.aisle}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rack</p>
                    <p className="font-mono font-medium">{locationDetail.rack}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Level</p>
                    <p className="font-mono font-medium">{locationDetail.level}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Position</p>
                    <p className="font-mono font-medium">{locationDetail.position || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Capacity */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Capacity
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Current Bins</p>
                  <p className="font-medium">{locationDetail.bin_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Bins</p>
                  <p className="font-medium">{locationDetail.max_bins}</p>
                </div>
              </div>
            </div>

            {/* 3D Coordinates - if available */}
            {(locationDetail.x_coordinate || locationDetail.y_coordinate || locationDetail.z_coordinate) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Move3D className="h-4 w-4" />
                    3D Coordinates
                  </h3>
                  <div className="p-3 rounded-md bg-muted text-sm">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-muted-foreground">X</p>
                        <p className="font-mono font-medium">{locationDetail.x_coordinate || '0'} m</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Y</p>
                        <p className="font-mono font-medium">{locationDetail.y_coordinate || '0'} m</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Z</p>
                        <p className="font-mono font-medium">{locationDetail.z_coordinate || '0'} m</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {locationDetail.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Notes</h3>
                  <p className="text-sm text-muted-foreground">{locationDetail.notes}</p>
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
                  <p className="font-medium">{formatDate(locationDetail.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium">{formatDate(locationDetail.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Location details not available
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

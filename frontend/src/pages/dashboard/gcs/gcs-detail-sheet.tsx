import { useQuery } from '@tanstack/react-query'
import {
  Wifi,
  WifiOff,
  MapPin,
  Cpu,
  Calendar,
  Clock,
  Radio,
  Plane,
  Settings,
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

import warehousesApi, { GroundControlStation } from '@/api/endpoints/warehouses'

interface GCSDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gcs: GroundControlStation | null
}

const GCS_STATUS_CONFIG = {
  ONLINE: { label: 'Online', variant: 'success' as const, icon: Wifi },
  OFFLINE: { label: 'Offline', variant: 'secondary' as const, icon: WifiOff },
  MAINTENANCE: { label: 'Maintenance', variant: 'warning' as const, icon: Settings },
  ERROR: { label: 'Error', variant: 'destructive' as const, icon: AlertTriangle },
}

export default function GCSDetailSheet({
  open,
  onOpenChange,
  gcs,
}: GCSDetailSheetProps) {
  // Fetch full GCS details
  const { data: gcsData, isLoading } = useQuery({
    queryKey: ['gcs-detail', gcs?.uuid],
    queryFn: () => warehousesApi.getGCSDetail(gcs!.uuid),
    enabled: !!gcs?.uuid && open,
  })

  const gcsDetail = gcsData?.data || gcs

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

  const getStatusConfig = (status: string) => {
    return GCS_STATUS_CONFIG[status as keyof typeof GCS_STATUS_CONFIG] || GCS_STATUS_CONFIG.OFFLINE
  }

  if (!gcs) return null

  const statusConfig = getStatusConfig(gcsDetail?.status || 'OFFLINE')
  const StatusIcon = statusConfig.icon

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            {gcsDetail?.name || 'GCS Details'}
          </SheetTitle>
          <SheetDescription>
            Ground Control Station information and configuration
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : gcsDetail ? (
          <div className="space-y-6 py-4">
            {/* Status Banner */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  gcsDetail.status === 'ONLINE' ? 'bg-green-100 text-green-600' :
                  gcsDetail.status === 'ERROR' ? 'bg-red-100 text-red-600' :
                  gcsDetail.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{gcsDetail.name}</p>
                  <p className="text-sm text-muted-foreground">{gcsDetail.code}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={statusConfig.variant}>
                  {statusConfig.label}
                </Badge>
                {!gcsDetail.is_active && (
                  <Badge variant="outline">Inactive</Badge>
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
                  <p className="text-muted-foreground">Warehouse</p>
                  <p className="font-medium">{gcsDetail.warehouse_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Zone</p>
                  <p className="font-medium">{gcsDetail.zone_name}</p>
                </div>
              </div>
              {(gcsDetail.x_position || gcsDetail.y_position || gcsDetail.z_position) && (
                <div className="p-3 rounded-md bg-muted text-sm">
                  <p className="text-muted-foreground mb-1">Position (X, Y, Z)</p>
                  <p className="font-mono">
                    ({gcsDetail.x_position || '0'}, {gcsDetail.y_position || '0'}, {gcsDetail.z_position || '0'})
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Hardware Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Hardware
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Hardware ID</p>
                  <p className="font-medium font-mono">{gcsDetail.hardware_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Firmware</p>
                  <p className="font-medium">{gcsDetail.firmware_version || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">IP Address</p>
                  <p className="font-medium font-mono">{gcsDetail.ip_address || 'Not configured'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Capacity & Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Max Drones</p>
                  <p className="font-medium">{gcsDetail.max_drones}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Work Areas</p>
                  <p className="font-medium">{gcsDetail.work_area_count || 0}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Last Heartbeat */}
            {gcsDetail.last_heartbeat && (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last Heartbeat
                  </h3>
                  <p className="text-sm">{formatDate(gcsDetail.last_heartbeat)}</p>
                </div>
                <Separator />
              </>
            )}

            {/* Description */}
            {gcsDetail.description && (
              <>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  <p className="text-sm text-muted-foreground">{gcsDetail.description}</p>
                </div>
                <Separator />
              </>
            )}

            {/* Timestamps */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timestamps
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(gcsDetail.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium">{formatDate(gcsDetail.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            GCS details not available
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

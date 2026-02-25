import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Radio,
  MapPin,
  Calendar,
  Plane,
  Link,
  Unlink,
  Gauge,
  Move3D,
  Anchor,
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

import warehousesApi, { DroneWorkArea } from '@/api/endpoints/warehouses'

interface WorkAreaDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workArea: DroneWorkArea | null
}

const AREA_TYPE_CONFIG = {
  TETHERED: { label: 'Tethered', icon: Link, color: 'bg-blue-500' },
  UNTETHERED: { label: 'Untethered', icon: Unlink, color: 'bg-green-500' },
}

export default function WorkAreaDetailSheet({
  open,
  onOpenChange,
  workArea,
}: WorkAreaDetailSheetProps) {
  // Fetch full work area details
  const { data: workAreaData, isLoading } = useQuery({
    queryKey: ['work-area-detail', workArea?.uuid],
    queryFn: () => warehousesApi.getWorkAreaDetail(workArea!.uuid),
    enabled: !!workArea?.uuid && open,
  })

  const workAreaDetail = workAreaData?.data || workArea

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

  const getTypeConfig = (type: string) => {
    return AREA_TYPE_CONFIG[type as keyof typeof AREA_TYPE_CONFIG] || AREA_TYPE_CONFIG.UNTETHERED
  }

  if (!workArea) return null

  const typeConfig = getTypeConfig(workAreaDetail?.area_type || 'UNTETHERED')
  const TypeIcon = typeConfig.icon

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            {workAreaDetail?.name || 'Work Area Details'}
          </SheetTitle>
          <SheetDescription>
            Drone work area configuration and boundaries
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : workAreaDetail ? (
          <div className="space-y-6 py-4">
            {/* Status Banner */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  workAreaDetail.area_type === 'TETHERED' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>
                  <TypeIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{workAreaDetail.name}</p>
                  <p className="text-sm text-muted-foreground">{workAreaDetail.code}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="gap-1">
                  <TypeIcon className="h-3 w-3" />
                  {typeConfig.label}
                </Badge>
                <Badge variant={workAreaDetail.is_active ? 'success' : 'secondary'}>
                  {workAreaDetail.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Location Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h3>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">GCS</p>
                    <p className="font-medium">{workAreaDetail.gcs_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Zone</p>
                    <p className="font-medium">{workAreaDetail.zone_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Warehouse</p>
                    <p className="font-medium">{workAreaDetail.warehouse_name}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Flight Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Flight Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Max Drones</p>
                  <p className="font-medium">{workAreaDetail.max_drones}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Max Speed</p>
                    <p className="font-medium">{workAreaDetail.max_flight_speed_mps} m/s</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Height Bounds */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Move3D className="h-4 w-4" />
                Height Bounds (Z-axis)
              </h3>
              <div className="p-3 rounded-md bg-muted text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Min Z</p>
                    <p className="font-mono font-medium">{workAreaDetail.min_z || '0'} m</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max Z</p>
                    <p className="font-mono font-medium">{workAreaDetail.max_z || '10'} m</p>
                  </div>
                </div>
              </div>
            </div>

            {/* XY Bounds - if available */}
            {(workAreaDetail.min_x || workAreaDetail.max_x || workAreaDetail.min_y || workAreaDetail.max_y) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">XY Boundaries</h3>
                  <div className="p-3 rounded-md bg-muted text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground">X Range</p>
                        <p className="font-mono font-medium">
                          {workAreaDetail.min_x || '0'} to {workAreaDetail.max_x || '0'} m
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Y Range</p>
                        <p className="font-mono font-medium">
                          {workAreaDetail.min_y || '0'} to {workAreaDetail.max_y || '0'} m
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tether Config - only for TETHERED type */}
            {workAreaDetail.area_type === 'TETHERED' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Anchor className="h-4 w-4" />
                    Tether Configuration
                  </h3>
                  <div className="p-3 rounded-md bg-muted text-sm space-y-3">
                    <div>
                      <p className="text-muted-foreground">Tether Length</p>
                      <p className="font-mono font-medium">{workAreaDetail.tether_length_m || 'N/A'} m</p>
                    </div>
                    {(workAreaDetail.tether_anchor_x || workAreaDetail.tether_anchor_y || workAreaDetail.tether_anchor_z) && (
                      <div>
                        <p className="text-muted-foreground mb-1">Anchor Point (X, Y, Z)</p>
                        <p className="font-mono font-medium">
                          ({workAreaDetail.tether_anchor_x || '0'}, {workAreaDetail.tether_anchor_y || '0'}, {workAreaDetail.tether_anchor_z || '0'})
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Description */}
            {workAreaDetail.description && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  <p className="text-sm text-muted-foreground">{workAreaDetail.description}</p>
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
                  <p className="font-medium">{formatDate(workAreaDetail.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium">{formatDate(workAreaDetail.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Work area details not available
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

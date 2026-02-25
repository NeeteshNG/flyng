import {
  Building2,
  Layers,
  MapPin,
  Plane,
  Server,
  Calendar,
  Hash,
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

import { WarehouseZone } from '@/api/endpoints/warehouses'

interface ZoneDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zone: WarehouseZone | null
}

const ZONE_TYPES = [
  { value: 'STORAGE', label: 'Storage', color: 'bg-blue-500' },
  { value: 'PICKING', label: 'Picking', color: 'bg-green-500' },
  { value: 'STAGING', label: 'Staging', color: 'bg-yellow-500' },
  { value: 'SHIPPING', label: 'Shipping', color: 'bg-purple-500' },
  { value: 'RECEIVING', label: 'Receiving', color: 'bg-orange-500' },
  { value: 'OTHER', label: 'Other', color: 'bg-gray-500' },
]

export default function ZoneDetailSheet({
  open,
  onOpenChange,
  zone,
}: ZoneDetailSheetProps) {
  if (!zone) return null

  const getZoneTypeInfo = (type: string) => {
    return ZONE_TYPES.find((t) => t.value === type) || ZONE_TYPES[5]
  }

  const typeInfo = getZoneTypeInfo(zone.zone_type)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{zone.name}</SheetTitle>
            <Badge variant={zone.is_active ? 'success' : 'secondary'}>
              {zone.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {zone.is_no_fly_zone && (
              <Badge variant="destructive">No-Fly</Badge>
            )}
          </div>
          <SheetDescription>{zone.code}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Zone Type */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Zone Type</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={`h-3 w-3 rounded-full ${typeInfo.color}`} />
                <p className="font-medium">{typeInfo.label}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Warehouse */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Warehouse
            </h3>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{zone.warehouse_name}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Properties */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Properties
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Floor Level</p>
                  <p className="font-medium">Floor {zone.floor_level}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="font-medium">
                    {zone.area_sqft ? `${zone.area_sqft} sq ft` : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Plane className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Drones</p>
                  <p className="font-medium">{zone.max_drones_allowed}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Hash className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <p className="font-medium">{zone.priority}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Server className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GCS Count</p>
                  <p className="font-medium">{zone.gcs_count || 0} stations</p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {zone.description && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Description
                </h3>
                <p className="text-sm">{zone.description}</p>
              </div>
            </>
          )}

          {/* Boundaries */}
          {(zone.min_x || zone.max_x || zone.min_y || zone.max_y) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Boundaries
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded bg-muted">
                    <span className="text-muted-foreground">Min X:</span>{' '}
                    <span className="font-medium">{zone.min_x || '-'}</span>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <span className="text-muted-foreground">Max X:</span>{' '}
                    <span className="font-medium">{zone.max_x || '-'}</span>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <span className="text-muted-foreground">Min Y:</span>{' '}
                    <span className="font-medium">{zone.min_y || '-'}</span>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <span className="text-muted-foreground">Max Y:</span>{' '}
                    <span className="font-medium">{zone.max_y || '-'}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Timestamps */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Timeline
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{formatDate(zone.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">{formatDate(zone.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

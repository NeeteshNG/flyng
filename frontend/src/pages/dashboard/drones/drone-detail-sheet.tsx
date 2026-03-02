import { useQuery } from '@tanstack/react-query'
import {
  Plane, MapPin, Cpu, Activity, Battery,
  Wifi, WifiOff, Wrench, Clock,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

import dronesApi, { Drone } from '@/api/endpoints/drones'
import { useFormat } from '@/hooks/use-format'

interface DroneDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drone: Drone | null
}

const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'AVAILABLE': return 'default'
    case 'IN_FLIGHT': return 'default'
    case 'CHARGING': return 'secondary'
    case 'IDLE': return 'secondary'
    case 'OFFLINE': return 'outline'
    case 'MAINTENANCE': return 'outline'
    case 'ERROR': return 'destructive'
    default: return 'outline'
  }
}

export default function DroneDetailSheet({ open, onOpenChange, drone }: DroneDetailSheetProps) {
  const { formatDate, formatDateTime, formatRelative } = useFormat()

  const { data: detailData } = useQuery({
    queryKey: ['drone-detail', drone?.uuid],
    queryFn: () => dronesApi.getDrone(drone!.uuid),
    enabled: !!drone?.uuid && open,
  })

  const detail = detailData?.data || drone
  if (!detail) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            {detail.name}
          </SheetTitle>
          <SheetDescription>
            Drone details and operational information
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusBadgeVariant(detail.status)}>
              {detail.status_display}
            </Badge>
            <Badge variant="outline">{detail.autonomy_display}</Badge>
            {detail.is_active ? (
              <Badge variant="default">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>

          <Separator />

          {/* Identification */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Plane className="h-4 w-4" /> Identification
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium">{detail.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Serial Number</span>
                <p className="font-medium font-mono">{detail.serial_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Model</span>
                <p className="font-medium">{detail.model || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Manufacturer</span>
                <p className="font-medium">{detail.manufacturer || '-'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4" /> Location
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Work Area</span>
                <p className="font-medium">{detail.work_area_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">GCS</span>
                <p className="font-medium">{detail.gcs_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Zone</span>
                <p className="font-medium">{detail.zone_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Warehouse</span>
                <p className="font-medium">{detail.warehouse_name}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Hardware & Software */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Cpu className="h-4 w-4" /> Hardware & Software
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Firmware</span>
                <p className="font-medium">{detail.firmware_version || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Hardware Rev</span>
                <p className="font-medium">{detail.hardware_version || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Max Payload</span>
                <p className="font-medium">
                  {detail.max_payload_kg ? `${detail.max_payload_kg} kg` : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Max Flight Time</span>
                <p className="font-medium">
                  {detail.max_flight_time_min ? `${detail.max_flight_time_min} min` : '-'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Flight Statistics */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4" /> Flight Statistics
            </h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Total Flights</span>
                <p className="text-lg font-bold">{detail.total_flights}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Flight Hours</span>
                <p className="text-lg font-bold">
                  {parseFloat(detail.total_flight_hours).toFixed(1)}h
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Distance</span>
                <p className="text-lg font-bold">
                  {parseFloat(detail.total_distance_km).toFixed(1)} km
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Connectivity */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              {detail.last_heartbeat ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              Connectivity
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">IP Address</span>
                <p className="font-medium font-mono">{detail.ip_address || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Heartbeat</span>
                <p className="font-medium">
                  {detail.last_heartbeat ? formatRelative(detail.last_heartbeat) : '-'}
                </p>
              </div>
              {detail.battery_name && (
                <div>
                  <span className="text-muted-foreground">Battery</span>
                  <p className="font-medium flex items-center gap-1">
                    <Battery className="h-3.5 w-3.5" />
                    {detail.battery_name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Home Position */}
          {detail.home_position && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">Home Position</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">X</span>
                    <p className="font-medium font-mono">{detail.home_x}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Y</span>
                    <p className="font-medium font-mono">{detail.home_y}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Z</span>
                    <p className="font-medium font-mono">{detail.home_z || '0'}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Maintenance */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4" /> Maintenance
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Last Maintenance</span>
                <p className="font-medium">
                  {formatDate(detail.last_maintenance_at)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Next Due</span>
                <p className="font-medium">
                  {formatDate(detail.next_maintenance_due)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Records</span>
                <p className="font-medium">{detail.maintenance_count}</p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <Clock className="h-3 w-3 inline mr-1" />
              Created: {formatDateTime(detail.created_at)}
            </div>
            <div>Updated: {formatDateTime(detail.updated_at)}</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

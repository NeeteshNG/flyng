import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useFormat } from '@/hooks/use-format'
import type { DronePosition } from '@/api/endpoints/drones'
import type { DroneTelemetry } from '@/stores/telemetry-store'
import {
  Battery, Gauge, Radio, Plane, MapPin, Briefcase,
} from 'lucide-react'

const statusConfig: Record<string, { color: string; bg: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  IN_FLIGHT: { color: 'text-blue-600', bg: 'bg-blue-500', variant: 'default' },
  AVAILABLE: { color: 'text-green-600', bg: 'bg-green-500', variant: 'secondary' },
  CHARGING: { color: 'text-yellow-600', bg: 'bg-yellow-500', variant: 'outline' },
  IDLE: { color: 'text-slate-500', bg: 'bg-slate-400', variant: 'outline' },
  OFFLINE: { color: 'text-gray-400', bg: 'bg-gray-400', variant: 'outline' },
  MAINTENANCE: { color: 'text-orange-600', bg: 'bg-orange-500', variant: 'outline' },
  ERROR: { color: 'text-red-600', bg: 'bg-red-500', variant: 'destructive' },
}

function getBatteryColor(pct: number | null): string {
  if (pct == null) return 'text-muted-foreground'
  if (pct < 20) return 'text-red-500'
  if (pct < 50) return 'text-yellow-500'
  return 'text-green-500'
}

function getSignalColor(rssi: number | null): string {
  if (rssi == null) return 'text-muted-foreground'
  if (rssi < -80) return 'text-red-500'
  if (rssi < -60) return 'text-yellow-500'
  return 'text-green-500'
}

interface DronePositionCardProps {
  drone: DronePosition
  liveTelemetry?: DroneTelemetry
}

export function DronePositionCard({ drone, liveTelemetry }: DronePositionCardProps) {
  const { formatDateTime } = useFormat()

  // Merge API data with live WebSocket data (live takes priority)
  const status = liveTelemetry?.status || drone.status
  const posX = liveTelemetry?.position_x ?? (drone.position_x ? parseFloat(drone.position_x) : null)
  const posY = liveTelemetry?.position_y ?? (drone.position_y ? parseFloat(drone.position_y) : null)
  const posZ = liveTelemetry?.position_z ?? (drone.position_z ? parseFloat(drone.position_z) : null)
  const battery = liveTelemetry?.battery_percentage ?? drone.battery_percentage
  const speed = liveTelemetry?.ground_speed ?? (drone.ground_speed ? parseFloat(drone.ground_speed) : null)
  const flightMode = liveTelemetry?.flight_mode || drone.flight_mode
  const rssi = liveTelemetry?.rssi ?? drone.rssi
  const lastUpdate = liveTelemetry?.timestamp || drone.last_telemetry_at

  const cfg = statusConfig[status] || statusConfig.OFFLINE
  const hasPosition = posX != null && posY != null

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      {/* Online indicator */}
      <div className={cn(
        'absolute top-3 right-3 h-2.5 w-2.5 rounded-full',
        drone.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
      )} />

      <CardContent className="p-4 space-y-3">
        {/* Header: Name + Status */}
        <div className="pr-6">
          <h3 className="font-semibold text-sm truncate">{drone.name}</h3>
          <code className="text-xs text-muted-foreground">{drone.serial_number}</code>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={cfg.variant}>{drone.status_display || status}</Badge>
          {flightMode && (
            <Badge variant="outline" className="text-xs">
              <Plane className="h-3 w-3 mr-1" />
              {flightMode}
            </Badge>
          )}
        </div>

        {/* Position */}
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          {hasPosition ? (
            <div className="font-mono text-xs">
              <span>X: {posX!.toFixed(1)}</span>
              <span className="mx-1.5 text-muted-foreground">|</span>
              <span>Y: {posY!.toFixed(1)}</span>
              <span className="mx-1.5 text-muted-foreground">|</span>
              <span>Z: {(posZ ?? 0).toFixed(1)}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No position data</span>
          )}
        </div>

        {/* Telemetry metrics */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {/* Battery */}
          <div className="flex items-center gap-1">
            <Battery className={cn('h-3.5 w-3.5', getBatteryColor(battery))} />
            <span className={cn('font-medium', getBatteryColor(battery))}>
              {battery != null ? `${battery}%` : '-'}
            </span>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{speed != null ? `${speed.toFixed(1)} m/s` : '-'}</span>
          </div>

          {/* Signal */}
          <div className="flex items-center gap-1">
            <Radio className={cn('h-3.5 w-3.5', getSignalColor(rssi))} />
            <span className={getSignalColor(rssi)}>
              {rssi != null ? `${rssi} dBm` : '-'}
            </span>
          </div>
        </div>

        {/* Active Job */}
        {drone.active_job_number && (
          <div className="flex items-center gap-1.5 text-xs bg-primary/5 rounded-md px-2 py-1.5">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-primary">{drone.active_job_number}</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {drone.active_job_type}
            </Badge>
          </div>
        )}

        {/* Location + Last Update */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
          <span className="truncate">{drone.warehouse_name}</span>
          {lastUpdate && (
            <span className="flex-shrink-0 ml-2">{formatDateTime(lastUpdate)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

import { useQuery } from '@tanstack/react-query'
import {
  Battery, Heart, Zap, Clock, Factory,
  BarChart3, RefreshCw,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

import batteriesApi, { DroneBattery } from '@/api/endpoints/batteries'
import { useFormat } from '@/hooks/use-format'

interface BatteryDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  battery: DroneBattery | null
}

const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'AVAILABLE': return 'default'
    case 'IN_USE': return 'default'
    case 'CHARGING': return 'secondary'
    case 'LOW': return 'outline'
    case 'FAULTY': return 'destructive'
    case 'RETIRED': return 'outline'
    default: return 'outline'
  }
}

const healthBadgeVariant = (health: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (health) {
    case 'EXCELLENT': return 'default'
    case 'GOOD': return 'default'
    case 'FAIR': return 'secondary'
    case 'POOR': return 'destructive'
    case 'REPLACE': return 'destructive'
    default: return 'outline'
  }
}

export default function BatteryDetailSheet({ open, onOpenChange, battery }: BatteryDetailSheetProps) {
  const { formatDate, formatDateTime } = useFormat()

  const { data: detailData } = useQuery({
    queryKey: ['battery-detail', battery?.uuid],
    queryFn: () => batteriesApi.getBattery(battery!.uuid),
    enabled: !!battery?.uuid && open,
  })

  const detail = detailData?.data || battery
  if (!detail) return null

  const chargePercent = detail.current_charge_percent
  const chargeColor = chargePercent >= 60 ? 'bg-green-500' : chargePercent >= 30 ? 'bg-yellow-500' : 'bg-red-500'
  const cyclePercent = detail.max_cycles > 0 ? Math.round((detail.cycle_count / detail.max_cycles) * 100) : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Battery className="h-5 w-5" />
            {detail.name}
          </SheetTitle>
          <SheetDescription>
            Battery details and health information
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusBadgeVariant(detail.status)}>
              {detail.status_display}
            </Badge>
            <Badge variant={healthBadgeVariant(detail.health_status)}>
              {detail.health_display}
            </Badge>
            <Badge variant="outline">{detail.chemistry_display}</Badge>
            {detail.is_active ? (
              <Badge variant="default">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
            {detail.needs_replacement && (
              <Badge variant="destructive">Needs Replacement</Badge>
            )}
            {detail.is_low_charge && (
              <Badge variant="destructive">Low Charge</Badge>
            )}
          </div>

          <Separator />

          {/* Charge level */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4" /> Charge Level
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Charge</span>
                <span className="font-bold text-lg">{chargePercent}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${chargeColor}`}
                  style={{ width: `${chargePercent}%` }}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Identification */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Battery className="h-4 w-4" /> Identification
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
                <span className="text-muted-foreground">Warehouse</span>
                <p className="font-medium">{detail.warehouse_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Chemistry</span>
                <p className="font-medium">{detail.chemistry_display}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Specifications */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4" /> Specifications
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Nominal Capacity</span>
                <p className="font-medium">{detail.capacity_mah} mAh</p>
              </div>
              <div>
                <span className="text-muted-foreground">Current Capacity</span>
                <p className="font-medium">
                  {detail.current_capacity_mah ? `${detail.current_capacity_mah} mAh` : 'Not measured'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Nominal Voltage</span>
                <p className="font-medium">{detail.voltage_nominal}V</p>
              </div>
              <div>
                <span className="text-muted-foreground">Cell Count</span>
                <p className="font-medium">{detail.cell_count}S</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Health & Cycles */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4" /> Health & Cycles
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Health Status</span>
                <p className="font-medium">{detail.health_display}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Health Percentage</span>
                <p className="font-medium">
                  {detail.health_percentage !== null ? `${detail.health_percentage}%` : 'Not measured'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Cycle Count</span>
                <p className="font-medium">{detail.cycle_count} / {detail.max_cycles}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Cycles Remaining</span>
                <p className="font-medium">{detail.cycles_remaining}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Cycle Usage</span>
                <span>{cyclePercent}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    cyclePercent >= 90 ? 'bg-red-500' : cyclePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(cyclePercent, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Manufacturer */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Factory className="h-4 w-4" /> Manufacturer
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Manufacturer</span>
                <p className="font-medium">{detail.manufacturer || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Model Number</span>
                <p className="font-medium">{detail.model_number || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Purchase Date</span>
                <p className="font-medium">{formatDate(detail.purchase_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Warranty Expires</span>
                <p className="font-medium">{formatDate(detail.warranty_expires_at)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4" /> Activity
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Charging Sessions</span>
                <p className="text-lg font-bold">{detail.charging_sessions_count}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Battery Swaps</span>
                <p className="text-lg font-bold">{detail.swaps_count}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Charged</span>
                <p className="font-medium">
                  {detail.last_charged_at ? formatDateTime(detail.last_charged_at) : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Health Check</span>
                <p className="font-medium">
                  {detail.last_health_check_at ? formatDateTime(detail.last_health_check_at) : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {detail.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detail.notes}</p>
              </div>
            </>
          )}

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

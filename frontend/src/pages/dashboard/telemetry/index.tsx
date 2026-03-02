import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Activity, Battery, Wifi, Thermometer,
  ChevronLeft, ChevronRight, X, Eye,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

import dronesApi, { Drone, DroneTelemetryLog } from '@/api/endpoints/drones'
import { useFormat } from '@/hooks/use-format'

const FLIGHT_MODES = [
  { value: 'GROUNDED', label: 'Grounded' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'STABILIZED', label: 'Stabilized' },
  { value: 'POSITION_HOLD', label: 'Position Hold' },
  { value: 'AUTONOMOUS', label: 'Autonomous' },
  { value: 'RTH', label: 'Return to Home' },
  { value: 'EMERGENCY', label: 'Emergency' },
]

const flightModeBadgeVariant = (mode: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (mode) {
    case 'AUTONOMOUS': return 'default'
    case 'MANUAL':
    case 'STABILIZED':
    case 'POSITION_HOLD': return 'secondary'
    case 'EMERGENCY': return 'destructive'
    case 'RTH': return 'outline'
    default: return 'outline'
  }
}

const PAGE_SIZE = 20

export default function TelemetryPage() {
  const { formatDateTime } = useFormat()
  const [search, setSearch] = useState('')
  const [droneFilter, setDroneFilter] = useState<string>('all')
  const [modeFilter, setModeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<DroneTelemetryLog | null>(null)

  // Fetch drones for filter dropdown
  const { data: dronesData } = useQuery({
    queryKey: ['drones-filter-list'],
    queryFn: () => dronesApi.getDrones({ page_size: 500, is_active: true }),
  })
  const dronesList = dronesData?.data?.results || []

  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      ordering: '-timestamp',
      page,
      page_size: PAGE_SIZE,
    }
    if (droneFilter !== 'all') params.drone = Number(droneFilter)
    if (modeFilter !== 'all') params.flight_mode = modeFilter
    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['telemetry', search, droneFilter, modeFilter, page],
    queryFn: () => dronesApi.getTelemetryLogs(getFilterParams()),
  })

  const logs = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const clearFilters = () => {
    setSearch('')
    setDroneFilter('all')
    setModeFilter('all')
    setPage(1)
  }

  const hasActiveFilters = search || droneFilter !== 'all' || modeFilter !== 'all'

  const handleView = (log: DroneTelemetryLog) => {
    setSelectedLog(log)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Telemetry</h1>
        <p className="text-muted-foreground">Real-time drone telemetry data and sensor readings</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drones</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dronesList.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Battery</CardTitle>
            <Battery className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.length > 0
                ? Math.round(
                    logs.filter((l) => l.battery_percentage != null)
                      .reduce((sum, l) => sum + Number(l.battery_percentage || 0), 0) /
                    Math.max(1, logs.filter((l) => l.battery_percentage != null).length)
                  ) + '%'
                : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Temp</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.length > 0
                ? (
                    logs.filter((l) => l.temperature != null)
                      .reduce((sum, l) => sum + parseFloat(l.temperature || '0'), 0) /
                    Math.max(1, logs.filter((l) => l.temperature != null).length)
                  ).toFixed(1) + '°C'
                : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Telemetry Logs</CardTitle>
          <CardDescription>Browse drone telemetry data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by drone name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select
              value={droneFilter}
              onValueChange={(v) => { setDroneFilter(v); setPage(1) }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Drone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drones</SelectItem>
                {dronesList.map((d: Drone) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={modeFilter}
              onValueChange={(v) => { setModeFilter(v); setPage(1) }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Flight Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                {FLIGHT_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load telemetry data. Please try again.
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? 'No telemetry records found. Try adjusting your filters.'
                : 'No telemetry data yet.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drone</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Flight Mode</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Speed</TableHead>
                    <TableHead>Battery</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.uuid}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.drone_name}</div>
                          <code className="text-xs text-muted-foreground">{log.drone_serial}</code>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={flightModeBadgeVariant(log.flight_mode)}>
                          {log.flight_mode_display}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.position_x && log.position_y
                          ? `${parseFloat(log.position_x).toFixed(1)}, ${parseFloat(log.position_y).toFixed(1)}, ${parseFloat(log.position_z || '0').toFixed(1)}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {log.ground_speed
                          ? `${parseFloat(log.ground_speed).toFixed(1)} m/s`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {log.battery_percentage != null ? (
                          <span className={
                            Number(log.battery_percentage) < 20
                              ? 'text-red-500 font-medium'
                              : Number(log.battery_percentage) < 50
                                ? 'text-yellow-500'
                                : 'text-green-500'
                          }>
                            {log.battery_percentage}%
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {log.rssi != null ? (
                          <span className={
                            log.rssi < -80 ? 'text-red-500' : log.rssi < -60 ? 'text-yellow-500' : 'text-green-500'
                          }>
                            {log.rssi} dBm
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleView(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} records)
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Telemetry Detail
            </SheetTitle>
            <SheetDescription>
              {selectedLog?.drone_name} - {selectedLog && formatDateTime(selectedLog.timestamp)}
            </SheetDescription>
          </SheetHeader>

          {selectedLog && (
            <div className="space-y-5 mt-6">
              <div>
                <h3 className="text-sm font-semibold mb-2">Flight Mode</h3>
                <Badge variant={flightModeBadgeVariant(selectedLog.flight_mode)}>
                  {selectedLog.flight_mode_display}
                </Badge>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">Position</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">X</span><p className="font-mono">{selectedLog.position_x || '-'}</p></div>
                  <div><span className="text-muted-foreground">Y</span><p className="font-mono">{selectedLog.position_y || '-'}</p></div>
                  <div><span className="text-muted-foreground">Z</span><p className="font-mono">{selectedLog.position_z || '-'}</p></div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">Speed</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Ground Speed</span><p className="font-medium">{selectedLog.ground_speed ? `${parseFloat(selectedLog.ground_speed).toFixed(2)} m/s` : '-'}</p></div>
                  <div><span className="text-muted-foreground">Air Speed</span><p className="font-medium">{selectedLog.air_speed ? `${parseFloat(selectedLog.air_speed).toFixed(2)} m/s` : '-'}</p></div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">Battery</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Charge</span><p className="font-medium">{selectedLog.battery_percentage != null ? `${selectedLog.battery_percentage}%` : '-'}</p></div>
                  <div><span className="text-muted-foreground">Voltage</span><p className="font-medium">{selectedLog.battery_voltage ? `${selectedLog.battery_voltage}V` : '-'}</p></div>
                  <div><span className="text-muted-foreground">Current</span><p className="font-medium">{selectedLog.battery_current ? `${selectedLog.battery_current}A` : '-'}</p></div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">Environment</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Temperature</span><p className="font-medium">{selectedLog.temperature ? `${selectedLog.temperature}°C` : '-'}</p></div>
                  <div><span className="text-muted-foreground">RSSI</span><p className="font-medium">{selectedLog.rssi != null ? `${selectedLog.rssi} dBm` : '-'}</p></div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Plane, Wifi, WifiOff, Battery, Wrench, Zap,
  Briefcase, X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import dronesApi, { type DronePosition } from '@/api/endpoints/drones'
import warehousesApi from '@/api/endpoints/warehouses'
import { useTelemetryStore } from '@/stores/telemetry-store'
import { DronePositionCard } from './drone-position-card'

const DRONE_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'IN_FLIGHT', label: 'In Flight' },
  { value: 'CHARGING', label: 'Charging' },
  { value: 'IDLE', label: 'Idle' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'ERROR', label: 'Error' },
]

export default function LiveTrackingPage() {
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Live telemetry from WebSocket store
  const liveDrones = useTelemetryStore((s) => s.drones)

  // Fleet stats (auto-refresh every 30s)
  const { data: statsData } = useQuery({
    queryKey: ['fleet-stats'],
    queryFn: () => dronesApi.getFleetStats(),
    refetchInterval: 30000,
  })
  const stats = statsData?.data

  // Fleet positions (auto-refresh every 30s as fallback)
  const { data: positionsData, isLoading, error } = useQuery({
    queryKey: ['fleet-positions', search, warehouseFilter, statusFilter],
    queryFn: () => dronesApi.getFleetPositions({
      search: search || undefined,
      warehouse: warehouseFilter !== 'all' ? Number(warehouseFilter) : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    refetchInterval: 30000,
  })
  const positions: DronePosition[] = positionsData?.data || []

  // Warehouses for filter
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-filter-list'],
    queryFn: () => warehousesApi.getWarehouses({ page_size: 500, is_active: true }),
  })
  const warehouses = warehousesData?.data?.results || []

  const clearFilters = () => {
    setSearch('')
    setWarehouseFilter('all')
    setStatusFilter('all')
  }
  const hasActiveFilters = search || warehouseFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Tracking</h1>
        <p className="text-muted-foreground">Real-time fleet position overview</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_drones ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats ? (stats.available + stats.in_flight + stats.charging + stats.idle) : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Flight</CardTitle>
            <Plane className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.in_flight ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.available ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Battery</CardTitle>
            <Battery className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avg_battery != null ? `${stats.avg_battery}%` : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.with_active_jobs ?? '-'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by drone name or serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {DRONE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Drone grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-muted-foreground">
          <WifiOff className="h-8 w-8 mx-auto mb-2" />
          Failed to load fleet data. Please try again.
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Plane className="h-8 w-8 mx-auto mb-2" />
          {hasActiveFilters
            ? 'No drones match your filters.'
            : 'No active drones in the fleet.'}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {positions.length} drone{positions.length !== 1 ? 's' : ''} in fleet
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {positions.map((drone) => (
              <DronePositionCard
                key={drone.id}
                drone={drone}
                liveTelemetry={liveDrones[drone.id]}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

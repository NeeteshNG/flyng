import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  Plane, Wifi, WifiOff, Wrench, Activity,
  Loader2, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import dronesApi, { Drone } from '@/api/endpoints/drones'
import { useFormat } from '@/hooks/use-format'
import { usePermissions } from '@/hooks/use-permissions'
import { ExportButton } from '@/components/shared/export-button'
import DroneFormSheet from './drone-form-sheet'
import DroneDetailSheet from './drone-detail-sheet'

const DRONE_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'IN_FLIGHT', label: 'In Flight' },
  { value: 'CHARGING', label: 'Charging' },
  { value: 'IDLE', label: 'Idle' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'ERROR', label: 'Error' },
]

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

const PAGE_SIZE = 20

export default function DronesPage() {
  const queryClient = useQueryClient()
  const { formatDate, formatRelative } = useFormat()
  const { canCreate, canUpdate, canDelete } = usePermissions()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [droneToDelete, setDroneToDelete] = useState<Drone | null>(null)

  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      ordering: 'name',
      page,
      page_size: PAGE_SIZE,
    }
    if (statusFilter !== 'all') {
      params.status = statusFilter
    }
    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['drones', search, statusFilter, page],
    queryFn: () => dronesApi.getDrones(getFilterParams()),
  })

  const { data: statsData } = useQuery({
    queryKey: ['drones-stats'],
    queryFn: () => dronesApi.getDrones({ page_size: 1000 }),
  })

  const drones = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const allDrones = statsData?.data?.results || []
  const totalStats = statsData?.data?.count || 0
  const availableCount = allDrones.filter((d) => d.status === 'AVAILABLE').length
  const inFlightCount = allDrones.filter((d) => d.status === 'IN_FLIGHT').length
  const maintenanceCount = allDrones.filter(
    (d) => d.status === 'MAINTENANCE' || d.status === 'ERROR'
  ).length

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => dronesApi.deleteDrone(uuid),
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setDroneToDelete(null)
      toast.success('Drone deactivated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['drones'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['drones-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Failed to delete drone', { duration: 5000 })
    },
  })

  const handleAdd = () => { setSelectedDrone(null); setFormOpen(true) }
  const handleEdit = (drone: Drone) => { setSelectedDrone(drone); setFormOpen(true) }
  const handleView = (drone: Drone) => { setSelectedDrone(drone); setDetailOpen(true) }
  const handleDelete = (drone: Drone) => { setDroneToDelete(drone); setDeleteDialogOpen(true) }
  const confirmDelete = () => { if (droneToDelete) deleteMutation.mutate(droneToDelete.uuid) }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setPage(1)
  }

  const hasActiveFilters = search || statusFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drones</h1>
          <p className="text-muted-foreground">Manage your drone fleet</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton exportType="drones" />
          {canCreate('drones', 'drone') && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Register Drone
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drones</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Flight</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inFlightCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance / Error</CardTitle>
            <Wrench className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Drone Fleet</CardTitle>
          <CardDescription>View and manage all registered drones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search drones..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => { setStatusFilter(value); setPage(1) }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {DRONE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load drones. Please try again.
            </div>
          ) : drones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? 'No drones found. Try adjusting your filters.'
                : 'No drones registered yet. Register your first drone to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Flight Stats</TableHead>
                    <TableHead>Heartbeat</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drones.map((drone) => (
                    <TableRow key={drone.uuid}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{drone.name}</div>
                          <code className="text-xs text-muted-foreground">{drone.serial_number}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{drone.work_area_name}</div>
                          <div className="text-muted-foreground">
                            {drone.zone_name} / {drone.warehouse_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(drone.status)}>
                          {drone.status_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{drone.total_flights} flights</div>
                          <div className="text-muted-foreground">
                            {parseFloat(drone.total_flight_hours).toFixed(1)}h
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {drone.last_heartbeat ? (
                            <>
                              <Wifi className="h-3.5 w-3.5 text-green-500" />
                              <span className="text-sm text-muted-foreground">
                                {formatRelative(drone.last_heartbeat)}
                              </span>
                            </>
                          ) : (
                            <>
                              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Never</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(drone.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(drone)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canUpdate('drones', 'drone') && (
                              <DropdownMenuItem onClick={() => handleEdit(drone)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete('drones', 'drone') && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(drone)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                Page {page} of {totalPages} ({totalCount} drones)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DroneFormSheet open={formOpen} onOpenChange={setFormOpen} drone={selectedDrone} />
      <DroneDetailSheet open={detailOpen} onOpenChange={setDetailOpen} drone={selectedDrone} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Drone</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate drone{' '}
              <span className="font-medium">{droneToDelete?.name}</span>?
              The drone will be marked as inactive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

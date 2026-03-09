import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Eye, CheckCircle,
  Wrench, Clock, DollarSign,
  ChevronLeft, ChevronRight, X,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

import dronesApi, { Drone, DroneMaintenanceRecord } from '@/api/endpoints/drones'
import { useFormat } from '@/hooks/use-format'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/api-error'
import MaintenanceFormSheet from './maintenance-form-sheet'

const MAINTENANCE_TYPES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CORRECTIVE', label: 'Corrective' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'FIRMWARE_UPDATE', label: 'Firmware Update' },
  { value: 'CALIBRATION', label: 'Calibration' },
  { value: 'BATTERY_REPLACEMENT', label: 'Battery Replacement' },
  { value: 'MOTOR_REPLACEMENT', label: 'Motor Replacement' },
  { value: 'SENSOR_REPAIR', label: 'Sensor Repair' },
  { value: 'INSPECTION', label: 'Inspection' },
]

const typeBadgeVariant = (type: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (type) {
    case 'EMERGENCY': return 'destructive'
    case 'CORRECTIVE':
    case 'MOTOR_REPLACEMENT':
    case 'SENSOR_REPAIR': return 'default'
    case 'SCHEDULED':
    case 'INSPECTION': return 'secondary'
    default: return 'outline'
  }
}

const PAGE_SIZE = 20

export default function MaintenancePage() {
  const queryClient = useQueryClient()
  const { formatDate, formatDateTime, formatCurrency } = useFormat()
  const { canCreate, canUpdate } = usePermissions()
  const [search, setSearch] = useState('')
  const [droneFilter, setDroneFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<DroneMaintenanceRecord | null>(null)

  const { data: dronesData } = useQuery({
    queryKey: ['drones-filter-list'],
    queryFn: () => dronesApi.getDrones({ page_size: 500, is_active: true }),
  })
  const dronesList = dronesData?.data?.results || []

  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      ordering: '-created_at',
      page,
      page_size: PAGE_SIZE,
    }
    if (droneFilter !== 'all') params.drone = Number(droneFilter)
    if (typeFilter !== 'all') params.maintenance_type = typeFilter
    if (statusFilter === 'completed') params.is_completed = true
    if (statusFilter === 'pending') params.is_completed = false
    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['maintenance', search, droneFilter, typeFilter, statusFilter, page],
    queryFn: () => dronesApi.getMaintenanceRecords(getFilterParams()),
  })

  const { data: statsData } = useQuery({
    queryKey: ['maintenance-stats'],
    queryFn: () => dronesApi.getMaintenanceRecords({ page_size: 1000 }),
  })

  const records = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const allRecords = statsData?.data?.results || []
  const totalStats = statsData?.data?.count || 0
  const completedCount = allRecords.filter((r) => r.is_completed).length
  const pendingCount = allRecords.filter((r) => !r.is_completed).length
  const totalCost = allRecords
    .filter((r) => r.cost)
    .reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0)

  const completeMutation = useMutation({
    mutationFn: (uuid: string) => dronesApi.completeMaintenanceRecord(uuid),
    onSuccess: () => {
      toast.success('Maintenance record completed', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['maintenance'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['maintenance-stats'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['drones'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to complete record', { duration: 5000 })
    },
  })

  const handleAdd = () => { setSelectedRecord(null); setFormOpen(true) }
  const handleView = (record: DroneMaintenanceRecord) => { setSelectedRecord(record); setDetailOpen(true) }

  const clearFilters = () => {
    setSearch('')
    setDroneFilter('all')
    setTypeFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  const hasActiveFilters = search || droneFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">Track drone maintenance and repair history</p>
        </div>
        {canCreate('drones', 'dronemaintenancerecord') && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            New Record
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Records</CardTitle>
          <CardDescription>Browse and manage drone maintenance history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search maintenance records..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select value={droneFilter} onValueChange={(v) => { setDroneFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Drone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drones</SelectItem>
                {dronesList.map((d: Drone) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {MAINTENANCE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
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
              Failed to load maintenance records. Please try again.
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? 'No records found. Try adjusting your filters.'
                : 'No maintenance records yet. Create your first record to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drone</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.uuid}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.drone_name}</div>
                          <code className="text-xs text-muted-foreground">{record.drone_serial}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">{record.title}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeBadgeVariant(record.maintenance_type)}>
                          {record.maintenance_type_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.is_completed ? (
                          <Badge variant="default">Completed</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.cost ? formatCurrency(parseFloat(record.cost)) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(record.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(record)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {!record.is_completed && canUpdate('drones', 'dronemaintenancerecord') && (
                              <DropdownMenuItem
                                onClick={() => completeMutation.mutate(record.uuid)}
                                disabled={completeMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Complete
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

      {/* Form Sheet */}
      <MaintenanceFormSheet open={formOpen} onOpenChange={setFormOpen} record={selectedRecord} />

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance Detail
            </SheetTitle>
            <SheetDescription>
              {selectedRecord?.drone_name} - {selectedRecord?.title}
            </SheetDescription>
          </SheetHeader>

          {selectedRecord && (
            <div className="space-y-5 mt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={typeBadgeVariant(selectedRecord.maintenance_type)}>
                  {selectedRecord.maintenance_type_display}
                </Badge>
                {selectedRecord.is_completed ? (
                  <Badge variant="default">Completed</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Drone</span>
                  <p className="font-medium">{selectedRecord.drone_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Performed By</span>
                  <p className="font-medium">{selectedRecord.performed_by_name || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cost</span>
                  <p className="font-medium">{selectedRecord.cost ? formatCurrency(parseFloat(selectedRecord.cost)) : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Downtime</span>
                  <p className="font-medium">{selectedRecord.downtime_minutes ? `${selectedRecord.downtime_minutes} min` : '-'}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-1">Description</h3>
                <p className="text-sm text-muted-foreground">{selectedRecord.description || '-'}</p>
              </div>

              {selectedRecord.parts_replaced && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Parts Replaced</h3>
                  <p className="text-sm text-muted-foreground">{selectedRecord.parts_replaced}</p>
                </div>
              )}

              {selectedRecord.notes && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedRecord.notes}</p>
                </div>
              )}

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">Timeline</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Scheduled</span>
                    <p className="font-medium">{formatDateTime(selectedRecord.scheduled_at)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Started</span>
                    <p className="font-medium">{formatDateTime(selectedRecord.started_at)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed</span>
                    <p className="font-medium">{formatDateTime(selectedRecord.completed_at)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p className="font-medium">{formatDateTime(selectedRecord.created_at)}</p>
                  </div>
                </div>
              </div>

              {(selectedRecord.flight_hours_at_maintenance || selectedRecord.flights_at_maintenance) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Drone Stats at Maintenance</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Flight Hours</span>
                        <p className="font-medium">{selectedRecord.flight_hours_at_maintenance || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Flights</span>
                        <p className="font-medium">{selectedRecord.flights_at_maintenance || '-'}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

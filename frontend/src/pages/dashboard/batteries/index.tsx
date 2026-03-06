import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  Battery, BatteryWarning, BatteryCharging, Heart,
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

import batteriesApi, { DroneBattery } from '@/api/endpoints/batteries'
import { useFormat } from '@/hooks/use-format'
import { CSVExportButton } from '@/components/shared/csv-export-button'
import BatteryFormSheet from './battery-form-sheet'
import BatteryDetailSheet from './battery-detail-sheet'

const BATTERY_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'IN_USE', label: 'In Use' },
  { value: 'CHARGING', label: 'Charging' },
  { value: 'LOW', label: 'Low' },
  { value: 'FAULTY', label: 'Faulty' },
  { value: 'RETIRED', label: 'Retired' },
]

const HEALTH_STATUSES = [
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
  { value: 'REPLACE', label: 'Replace' },
]

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

const PAGE_SIZE = 20

export default function BatteriesPage() {
  const queryClient = useQueryClient()
  const { formatDate } = useFormat()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [healthFilter, setHealthFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedBattery, setSelectedBattery] = useState<DroneBattery | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batteryToDelete, setBatteryToDelete] = useState<DroneBattery | null>(null)

  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      ordering: 'name',
      page,
      page_size: PAGE_SIZE,
    }
    if (statusFilter !== 'all') params.status = statusFilter
    if (healthFilter !== 'all') params.health_status = healthFilter
    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['batteries', search, statusFilter, healthFilter, page],
    queryFn: () => batteriesApi.getBatteries(getFilterParams()),
  })

  const { data: statsData } = useQuery({
    queryKey: ['batteries-stats'],
    queryFn: () => batteriesApi.getBatteries({ page_size: 1000 }),
  })

  const batteries = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const allBatteries = statsData?.data?.results || []
  const totalStats = statsData?.data?.count || 0
  const availableCount = allBatteries.filter((b) => b.status === 'AVAILABLE').length
  const chargingCount = allBatteries.filter((b) => b.status === 'CHARGING').length
  const alertCount = allBatteries.filter(
    (b) => b.needs_replacement || b.is_low_charge
  ).length

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => batteriesApi.deleteBattery(uuid),
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setBatteryToDelete(null)
      toast.success('Battery deactivated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['batteries'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['batteries-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Failed to deactivate battery', { duration: 5000 })
    },
  })

  const handleAdd = () => { setSelectedBattery(null); setFormOpen(true) }
  const handleEdit = (battery: DroneBattery) => { setSelectedBattery(battery); setFormOpen(true) }
  const handleView = (battery: DroneBattery) => { setSelectedBattery(battery); setDetailOpen(true) }
  const handleDelete = (battery: DroneBattery) => { setBatteryToDelete(battery); setDeleteDialogOpen(true) }
  const confirmDelete = () => { if (batteryToDelete) deleteMutation.mutate(batteryToDelete.uuid) }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setHealthFilter('all')
    setPage(1)
  }

  const hasActiveFilters = search || statusFilter !== 'all' || healthFilter !== 'all'

  const getChargeColor = (percent: number) => {
    if (percent >= 60) return 'text-green-600'
    if (percent >= 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batteries</h1>
          <p className="text-muted-foreground">Manage drone battery inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <CSVExportButton exportType="batteries" />
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Battery
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batteries</CardTitle>
            <Battery className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Battery className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Charging</CardTitle>
            <BatteryCharging className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chargingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <BatteryWarning className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Battery Inventory</CardTitle>
          <CardDescription>View and manage all registered batteries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search batteries..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => { setStatusFilter(value); setPage(1) }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {BATTERY_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={healthFilter}
              onValueChange={(value) => { setHealthFilter(value); setPage(1) }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Health" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Health</SelectItem>
                {HEALTH_STATUSES.map((h) => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
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
              Failed to load batteries. Please try again.
            </div>
          ) : batteries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? 'No batteries found. Try adjusting your filters.'
                : 'No batteries registered yet. Add your first battery to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Battery</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Charge</TableHead>
                    <TableHead>Cycles</TableHead>
                    <TableHead>Specs</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batteries.map((battery) => (
                    <TableRow key={battery.uuid}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{battery.name}</div>
                          <code className="text-xs text-muted-foreground">{battery.serial_number}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{battery.warehouse_name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(battery.status)}>
                          {battery.status_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={healthBadgeVariant(battery.health_status)}>
                          {battery.health_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                battery.current_charge_percent >= 60
                                  ? 'bg-green-500'
                                  : battery.current_charge_percent >= 30
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${battery.current_charge_percent}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${getChargeColor(battery.current_charge_percent)}`}>
                            {battery.current_charge_percent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span>{battery.cycle_count}</span>
                          <span className="text-muted-foreground"> / {battery.max_cycles}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {battery.capacity_mah}mAh {battery.cell_count}S
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(battery)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(battery)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(battery)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
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
                Page {page} of {totalPages} ({totalCount} batteries)
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

      <BatteryFormSheet open={formOpen} onOpenChange={setFormOpen} battery={selectedBattery} />
      <BatteryDetailSheet open={detailOpen} onOpenChange={setDetailOpen} battery={selectedBattery} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Battery</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate battery{' '}
              <span className="font-medium">{batteryToDelete?.name}</span>?
              The battery will be marked as inactive.
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

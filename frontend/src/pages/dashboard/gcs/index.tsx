import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Server,
  Wifi,
  WifiOff,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Wrench,
  AlertTriangle,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import warehousesApi, { GroundControlStation } from '@/api/endpoints/warehouses'
import { getErrorMessage } from '@/lib/api-error'
import { useFormat } from '@/hooks'
import { CSVExportButton } from '@/components/shared/csv-export-button'
import GCSFormSheet from './gcs-form-sheet'
import GCSDetailSheet from './gcs-detail-sheet'

const PAGE_SIZE = 20

const GCS_STATUSES = [
  { value: 'ONLINE', label: 'Online', color: 'bg-green-500', icon: Wifi },
  { value: 'OFFLINE', label: 'Offline', color: 'bg-gray-500', icon: WifiOff },
  { value: 'MAINTENANCE', label: 'Maintenance', color: 'bg-yellow-500', icon: Wrench },
  { value: 'ERROR', label: 'Error', color: 'bg-red-500', icon: AlertTriangle },
]

export default function GCSPage() {
  const queryClient = useQueryClient()
  const { formatDateTime } = useFormat()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedGCS, setSelectedGCS] = useState<GroundControlStation | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [gcsToDelete, setGcsToDelete] = useState<GroundControlStation | null>(null)

  // Main GCS query with pagination
  const { data, isLoading, error } = useQuery({
    queryKey: ['gcs', search, statusFilter, activeFilter, page],
    queryFn: () =>
      warehousesApi.getGCS({
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
        ordering: 'zone__warehouse__name,zone__name,name',
        page,
        page_size: PAGE_SIZE,
      }),
  })

  // Separate stats query
  const { data: statsData } = useQuery({
    queryKey: ['gcs-stats'],
    queryFn: () =>
      warehousesApi.getGCS({
        page_size: 1000,
      }),
  })

  const gcsList = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Stats from separate query
  const allGCS = statsData?.data?.results || []
  const onlineCount = allGCS.filter((g) => g.status === 'ONLINE').length
  const offlineCount = allGCS.filter((g) => g.status === 'OFFLINE').length
  const issueCount = allGCS.filter((g) => g.status === 'ERROR' || g.status === 'MAINTENANCE').length

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (uuid: string) =>
      warehousesApi.deleteGCS ? warehousesApi.deleteGCS(uuid) : Promise.reject('API not available'),
    onSuccess: () => {
      toast.success('GCS deleted successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['gcs'] })
      queryClient.refetchQueries({ queryKey: ['gcs-stats'] })
      queryClient.refetchQueries({ queryKey: ['zones'] })
      setDeleteDialogOpen(false)
      setGcsToDelete(null)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to delete GCS'), { duration: 5000 })
    },
  })

  const hasFilters = search || statusFilter !== 'all' || activeFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setActiveFilter('all')
    setPage(1)
  }

  const handleAdd = () => {
    setSelectedGCS(null)
    setFormOpen(true)
  }

  const handleEdit = (gcs: GroundControlStation) => {
    setSelectedGCS(gcs)
    setFormOpen(true)
  }

  const handleView = (gcs: GroundControlStation) => {
    setSelectedGCS(gcs)
    setDetailOpen(true)
  }

  const handleDelete = (gcs: GroundControlStation) => {
    setGcsToDelete(gcs)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (gcsToDelete) {
      deleteMutation.mutate(gcsToDelete.uuid)
    }
  }

  const getStatusInfo = (status: string) => {
    return GCS_STATUSES.find((s) => s.value === status) || GCS_STATUSES[1]
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ground Control Stations</h1>
          <p className="text-muted-foreground">
            Manage GCS units that control drone operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CSVExportButton exportType="ground-stations" />
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add GCS
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total GCS</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allGCS.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offlineCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issueCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>GCS List</CardTitle>
          <CardDescription>
            View and manage all ground control stations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search GCS..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {GCS_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={activeFilter}
              onValueChange={(value) => {
                setActiveFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Active" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load GCS. Please try again.
            </div>
          ) : gcsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasFilters
                ? 'No ground control stations match your filters. Try adjusting your search criteria.'
                : 'No ground control stations found. Add your first GCS to get started.'}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GCS</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Max Drones</TableHead>
                      <TableHead>Work Areas</TableHead>
                      <TableHead>Last Heartbeat</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gcsList.map((gcs) => {
                      const statusInfo = getStatusInfo(gcs.status)
                      const StatusIcon = statusInfo.icon
                      return (
                        <TableRow key={gcs.uuid}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{gcs.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {gcs.code}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm">{gcs.zone_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {gcs.warehouse_name}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="gap-1"
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                              {!gcs.is_active && (
                                <Badge variant="secondary">Disabled</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {gcs.max_drones} drones
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {gcs.work_area_count || 0} areas
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {gcs.last_heartbeat ? formatDateTime(gcs.last_heartbeat) : 'Never'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(gcs)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(gcs)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(gcs)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1} to{' '}
                    {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} GCS
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Sheet */}
      <GCSFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        gcs={selectedGCS}
      />

      {/* Detail Sheet */}
      <GCSDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        gcs={selectedGCS}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ground Control Station</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{gcsToDelete?.name}"? This action cannot be
              undone and will deactivate all associated work areas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

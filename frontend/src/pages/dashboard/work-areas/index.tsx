import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Radio,
  Plane,
  Link,
  Unlink,
  Box,
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

import warehousesApi, { DroneWorkArea } from '@/api/endpoints/warehouses'
import { getErrorMessage } from '@/lib/api-error'
import { useFormat } from '@/hooks'
import { usePermissions } from '@/hooks/use-permissions'
import { ExportButton } from '@/components/shared/export-button'
import WorkAreaFormSheet from './work-area-form-sheet'
import WorkAreaDetailSheet from './work-area-detail-sheet'

const PAGE_SIZE = 20

const AREA_TYPES = [
  { value: 'TETHERED', label: 'Tethered', icon: Link, color: 'bg-blue-500' },
  { value: 'UNTETHERED', label: 'Untethered', icon: Unlink, color: 'bg-green-500' },
]

export default function WorkAreasPage() {
  const queryClient = useQueryClient()
  const { formatDate } = useFormat()
  const { canCreate, canUpdate, canDelete } = usePermissions()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedWorkArea, setSelectedWorkArea] = useState<DroneWorkArea | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [workAreaToDelete, setWorkAreaToDelete] = useState<DroneWorkArea | null>(null)

  // Main work areas query with pagination
  const { data, isLoading, error } = useQuery({
    queryKey: ['work-areas', search, statusFilter, typeFilter, page],
    queryFn: () =>
      warehousesApi.getWorkAreas({
        search: search || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        area_type: typeFilter === 'all' ? undefined : typeFilter,
        ordering: 'ground_control_station__zone__warehouse__name,name',
        page,
        page_size: PAGE_SIZE,
      }),
  })

  // Separate stats query
  const { data: statsData } = useQuery({
    queryKey: ['work-areas-stats'],
    queryFn: () =>
      warehousesApi.getWorkAreas({
        page_size: 1000,
      }),
  })

  const workAreas = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Stats from separate query
  const allWorkAreas = statsData?.data?.results || []
  const activeCount = allWorkAreas.filter((wa) => wa.is_active).length
  const tetheredCount = allWorkAreas.filter((wa) => wa.area_type === 'TETHERED').length
  const untetheredCount = allWorkAreas.filter((wa) => wa.area_type === 'UNTETHERED').length

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (uuid: string) =>
      warehousesApi.deleteWorkArea ? warehousesApi.deleteWorkArea(uuid) : Promise.reject('API not available'),
    onSuccess: () => {
      toast.success('Work area deleted successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['work-areas'] })
      queryClient.refetchQueries({ queryKey: ['work-areas-stats'] })
      queryClient.refetchQueries({ queryKey: ['gcs'] })
      setDeleteDialogOpen(false)
      setWorkAreaToDelete(null)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to delete work area'), { duration: 5000 })
    },
  })

  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setTypeFilter('all')
    setPage(1)
  }

  const handleAdd = () => {
    setSelectedWorkArea(null)
    setFormOpen(true)
  }

  const handleEdit = (workArea: DroneWorkArea) => {
    setSelectedWorkArea(workArea)
    setFormOpen(true)
  }

  const handleView = (workArea: DroneWorkArea) => {
    setSelectedWorkArea(workArea)
    setDetailOpen(true)
  }

  const handleDelete = (workArea: DroneWorkArea) => {
    setWorkAreaToDelete(workArea)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (workAreaToDelete) {
      deleteMutation.mutate(workAreaToDelete.uuid)
    }
  }

  const getAreaTypeInfo = (type: string) => {
    return AREA_TYPES.find((t) => t.value === type) || AREA_TYPES[1]
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Work Areas</h1>
          <p className="text-muted-foreground">
            Manage drone work areas and flight zones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton exportType="work-areas" />
          {canCreate('warehouses', 'droneworkarea') && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Work Area
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Work Areas</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allWorkAreas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tethered</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tetheredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Untethered</CardTitle>
            <Unlink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{untetheredCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Work Area List</CardTitle>
          <CardDescription>
            View and manage all drone work areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search work areas..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Area Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {AREA_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              Failed to load work areas. Please try again.
            </div>
          ) : workAreas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasFilters
                ? 'No work areas match your filters. Try adjusting your search criteria.'
                : 'No work areas found. Add your first work area to get started.'}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Area</TableHead>
                      <TableHead>GCS</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Max Drones</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workAreas.map((workArea) => {
                      const typeInfo = getAreaTypeInfo(workArea.area_type)
                      const TypeIcon = typeInfo.icon
                      return (
                        <TableRow key={workArea.uuid}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{workArea.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {workArea.code}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Radio className="h-4 w-4 text-muted-foreground" />
                              <span>{workArea.gcs_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{workArea.zone_name}</div>
                              <div className="text-muted-foreground">{workArea.warehouse_name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <TypeIcon className="h-3 w-3" />
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Plane className="h-4 w-4 text-muted-foreground" />
                              <span>{workArea.max_drones}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={workArea.is_active ? 'success' : 'secondary'}>
                              {workArea.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(workArea.created_at)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(workArea)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {canUpdate('warehouses', 'droneworkarea') && (
                                  <DropdownMenuItem onClick={() => handleEdit(workArea)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canDelete('warehouses', 'droneworkarea') && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDelete(workArea)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
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
                    {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} work areas
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
      <WorkAreaFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        workArea={selectedWorkArea}
      />

      {/* Detail Sheet */}
      <WorkAreaDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        workArea={selectedWorkArea}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Area</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workAreaToDelete?.name}"? This action cannot be
              undone.
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

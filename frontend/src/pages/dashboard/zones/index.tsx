import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Layers,
  Building2,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Plane,
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

import warehousesApi, { WarehouseZone } from '@/api/endpoints/warehouses'
import { getErrorMessage } from '@/lib/api-error'
import { useFormat } from '@/hooks'
import { usePermissions } from '@/hooks/use-permissions'
import { ExportButton } from '@/components/shared/export-button'
import ZoneFormSheet from './zone-form-sheet'
import ZoneDetailSheet from './zone-detail-sheet'

const PAGE_SIZE = 20

const ZONE_TYPES = [
  { value: 'STORAGE', label: 'Storage', color: 'bg-blue-500' },
  { value: 'PICKING', label: 'Picking', color: 'bg-green-500' },
  { value: 'STAGING', label: 'Staging', color: 'bg-yellow-500' },
  { value: 'SHIPPING', label: 'Shipping', color: 'bg-purple-500' },
  { value: 'RECEIVING', label: 'Receiving', color: 'bg-orange-500' },
  { value: 'OTHER', label: 'Other', color: 'bg-gray-500' },
]

export default function ZonesPage() {
  const queryClient = useQueryClient()
  const { formatDate } = useFormat()
  const { canCreate, canUpdate, canDelete } = usePermissions()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedZone, setSelectedZone] = useState<WarehouseZone | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [zoneToDelete, setZoneToDelete] = useState<WarehouseZone | null>(null)

  // Main zones query with pagination
  const { data, isLoading, error } = useQuery({
    queryKey: ['zones', search, statusFilter, typeFilter, page],
    queryFn: () =>
      warehousesApi.getZones({
        search: search || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        zone_type: typeFilter === 'all' ? undefined : typeFilter,
        ordering: 'warehouse__name,name',
        page,
        page_size: PAGE_SIZE,
      }),
  })

  // Separate stats query
  const { data: statsData } = useQuery({
    queryKey: ['zones-stats'],
    queryFn: () =>
      warehousesApi.getZones({
        page_size: 1000,
      }),
  })

  const zones = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Stats from separate query
  const allZones = statsData?.data?.results || []
  const activeCount = allZones.filter((z) => z.is_active).length
  const storageCount = allZones.filter((z) => z.zone_type === 'STORAGE').length
  const noFlyCount = allZones.filter((z) => z.is_no_fly_zone).length

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => warehousesApi.deleteZone(uuid),
    onSuccess: () => {
      toast.success('Zone deleted successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['zones'] })
      queryClient.refetchQueries({ queryKey: ['zones-stats'] })
      queryClient.refetchQueries({ queryKey: ['warehouses'] })
      setDeleteDialogOpen(false)
      setZoneToDelete(null)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to delete zone'), { duration: 5000 })
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
    setSelectedZone(null)
    setFormOpen(true)
  }

  const handleEdit = (zone: WarehouseZone) => {
    setSelectedZone(zone)
    setFormOpen(true)
  }

  const handleView = (zone: WarehouseZone) => {
    setSelectedZone(zone)
    setDetailOpen(true)
  }

  const handleDelete = (zone: WarehouseZone) => {
    setZoneToDelete(zone)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (zoneToDelete) {
      deleteMutation.mutate(zoneToDelete.uuid)
    }
  }

  const getZoneTypeInfo = (type: string) => {
    return ZONE_TYPES.find((t) => t.value === type) || ZONE_TYPES[5]
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zones</h1>
          <p className="text-muted-foreground">
            Manage warehouse zones and operational areas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton exportType="zones" />
          {canCreate('warehouses', 'warehousezone') && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Zone
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Zones</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allZones.length}</div>
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
            <CardTitle className="text-sm font-medium">Storage Zones</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storageCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Fly Zones</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{noFlyCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Zone List</CardTitle>
          <CardDescription>
            View and manage all warehouse zones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search zones..."
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
                <SelectValue placeholder="Zone Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ZONE_TYPES.map((type) => (
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
              Failed to load zones. Please try again.
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasFilters
                ? 'No zones match your filters. Try adjusting your search criteria.'
                : 'No zones found. Add your first zone to get started.'}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>GCS</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.map((zone) => {
                      const typeInfo = getZoneTypeInfo(zone.zone_type)
                      return (
                        <TableRow key={zone.uuid}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{zone.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {zone.code}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{zone.warehouse_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="gap-1"
                            >
                              <div className={`h-2 w-2 rounded-full ${typeInfo.color}`} />
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              Floor {zone.floor_level}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {zone.gcs_count || 0} GCS
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge
                                variant={zone.is_active ? 'success' : 'secondary'}
                              >
                                {zone.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {zone.is_no_fly_zone && (
                                <Badge variant="destructive">No-Fly</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(zone.created_at)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(zone)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {canUpdate('warehouses', 'warehousezone') && (
                                  <DropdownMenuItem onClick={() => handleEdit(zone)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canDelete('warehouses', 'warehousezone') && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDelete(zone)}
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
                    {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} zones
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
      <ZoneFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        zone={selectedZone}
      />

      {/* Detail Sheet */}
      <ZoneDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        zone={selectedZone}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{zoneToDelete?.name}"? This action cannot be
              undone and will deactivate all associated ground control stations.
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

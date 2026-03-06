import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Layers,
  Package,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import inventoryApi, { StorageLocation } from '@/api/endpoints/inventory'
import { CSVImportDialog } from '@/components/shared/csv-import-dialog'
import { CSVExportButton } from '@/components/shared/csv-export-button'
import LocationFormSheet from './location-form-sheet'
import LocationDetailSheet from './location-detail-sheet'

const LOCATION_TYPES = [
  { value: 'RACK', label: 'Rack' },
  { value: 'FLOOR', label: 'Floor' },
  { value: 'SHELF', label: 'Shelf' },
  { value: 'PALLET', label: 'Pallet' },
  { value: 'BIN_AREA', label: 'Bin Area' },
  { value: 'OTHER', label: 'Other' },
]

const PAGE_SIZE = 20

export default function LocationsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<StorageLocation | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  // Build filter params
  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      location_type: typeFilter === 'all' ? undefined : typeFilter,
      ordering: 'zone__warehouse__name,aisle,rack,level',
      page,
      page_size: PAGE_SIZE,
    }

    // Handle status filters
    if (statusFilter === 'active') {
      params.is_active = true
    } else if (statusFilter === 'inactive') {
      params.is_active = false
    } else if (statusFilter === 'full') {
      params.is_full = true
    } else if (statusFilter === 'not_accessible') {
      params.is_accessible = false
    }

    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['storage-locations', search, statusFilter, typeFilter, page],
    queryFn: () => inventoryApi.getStorageLocations(getFilterParams()),
  })

  // Separate query for stats (unfiltered)
  const { data: statsData } = useQuery({
    queryKey: ['storage-locations-stats'],
    queryFn: () => inventoryApi.getStorageLocations({ page_size: 1000 }),
  })

  const locations = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Calculate stats from unfiltered data
  const allLocations = statsData?.data?.results || []
  const activeCount = allLocations.filter((l) => l.is_active).length
  const accessibleCount = allLocations.filter((l) => l.is_accessible).length
  const fullCount = allLocations.filter((l) => l.is_full).length
  const totalStats = statsData?.data?.count || 0

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => inventoryApi.deleteStorageLocation(uuid),
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setLocationToDelete(null)
      // Show toast with longer duration
      toast.success('Location deleted successfully', { duration: 4000 })
      // Force refetch all storage-location queries
      queryClient.refetchQueries({ queryKey: ['storage-locations'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['storage-locations-stats'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['zones'] })
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Failed to delete location', { duration: 4000 })
    },
  })

  const handleAdd = () => {
    setSelectedLocation(null)
    setFormOpen(true)
  }

  const handleEdit = (location: StorageLocation) => {
    setSelectedLocation(location)
    setFormOpen(true)
  }

  const handleView = (location: StorageLocation) => {
    setSelectedLocation(location)
    setDetailOpen(true)
  }

  const handleDelete = (location: StorageLocation) => {
    setLocationToDelete(location)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (locationToDelete) {
      deleteMutation.mutate(locationToDelete.uuid)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setTypeFilter('all')
    setPage(1)
  }

  const hasActiveFilters = search || statusFilter !== 'all' || typeFilter !== 'all'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getLocationTypeLabel = (type: string) => {
    return LOCATION_TYPES.find((t) => t.value === type)?.label || type
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Storage Locations</h1>
          <p className="text-muted-foreground">
            Manage warehouse storage locations and positions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CSVExportButton exportType="locations" />
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accessible</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessibleCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Full</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fullCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Location List</CardTitle>
          <CardDescription>
            View and manage all storage locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
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
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {LOCATION_TYPES.map((type) => (
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
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="not_accessible">Not Accessible</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
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
              Failed to load locations. Please try again.
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No locations found. {hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first storage location to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Zone / Warehouse</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Bins</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.uuid}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{location.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{location.zone_name}</div>
                          <div className="text-muted-foreground">{location.warehouse_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {location.aisle}-{location.rack}-{location.level}
                          {location.position && `-${location.position}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getLocationTypeLabel(location.location_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {location.bin_count} / {location.max_bins}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant={location.is_active ? 'success' : 'secondary'}>
                            {location.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {!location.is_accessible && (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Blocked
                            </Badge>
                          )}
                          {location.is_full && (
                            <Badge variant="warning">Full</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(location.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(location)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(location)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(location)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} locations)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Sheet */}
      <LocationFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        location={selectedLocation}
      />

      {/* Detail Sheet */}
      <LocationDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        location={selectedLocation}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete location{' '}
              <span className="font-medium">{locationToDelete?.code}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        importType="LOCATIONS"
        requiresWarehouse
        onSuccess={() => queryClient.refetchQueries({ queryKey: ['storage-locations'] })}
      />
    </div>
  )
}

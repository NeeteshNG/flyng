import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Package,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Archive,
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

import inventoryApi, { StorageBin } from '@/api/endpoints/inventory'
import { getErrorMessage } from '@/lib/api-error'
import { CSVExportButton } from '@/components/shared/csv-export-button'
import BinFormSheet from './bin-form-sheet'
import BinDetailSheet from './bin-detail-sheet'

const PAGE_SIZE = 20

export default function BinsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedBin, setSelectedBin] = useState<StorageBin | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [binToDelete, setBinToDelete] = useState<StorageBin | null>(null)

  // Build filter params
  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      ordering: 'location__zone__warehouse__name,location__code,position_index',
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
    }

    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['storage-bins', search, statusFilter, page],
    queryFn: () => inventoryApi.getStorageBins(getFilterParams()),
  })

  // Separate query for stats (unfiltered)
  const { data: statsData } = useQuery({
    queryKey: ['storage-bins-stats'],
    queryFn: () => inventoryApi.getStorageBins({ page_size: 1000 }),
  })

  const bins = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Calculate stats from unfiltered data
  const allBins = statsData?.data?.results || []
  const activeCount = allBins.filter((b) => b.is_active).length
  const fullCount = allBins.filter((b) => b.is_full).length
  const emptyCount = allBins.filter((b) => !b.is_full && b.item_count === 0).length
  const totalStats = statsData?.data?.count || 0

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => inventoryApi.deleteStorageBin(uuid),
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setBinToDelete(null)
      toast.success('Bin deleted successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['storage-bins'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['storage-bins-stats'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to delete bin', { duration: 5000 })
    },
  })

  const handleAdd = () => {
    setSelectedBin(null)
    setFormOpen(true)
  }

  const handleEdit = (bin: StorageBin) => {
    setSelectedBin(bin)
    setFormOpen(true)
  }

  const handleView = (bin: StorageBin) => {
    setSelectedBin(bin)
    setDetailOpen(true)
  }

  const handleDelete = (bin: StorageBin) => {
    setBinToDelete(bin)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (binToDelete) {
      deleteMutation.mutate(binToDelete.uuid)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setPage(1)
  }

  const hasActiveFilters = search || statusFilter !== 'all'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Storage Bins</h1>
          <p className="text-muted-foreground">
            Manage storage bins and containers within locations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CSVExportButton exportType="bins" />
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bin
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bins</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Full</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fullCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empty</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emptyCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bin List</CardTitle>
          <CardDescription>
            View and manage all storage bins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search bins..."
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
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="full">Full</SelectItem>
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
              Failed to load bins. Please try again.
            </div>
          ) : bins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bins found. {hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first storage bin to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Warehouse / Zone</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bins.map((bin) => (
                    <TableRow key={bin.uuid}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{bin.code}</div>
                          {bin.label_value && (
                            <div className="text-xs text-muted-foreground">
                              {bin.label_value}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {bin.location_code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{bin.warehouse_name}</div>
                          <div className="text-muted-foreground">{bin.zone_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {bin.template_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {bin.current_weight_kg} kg
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {bin.item_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant={bin.is_active ? 'success' : 'secondary'}>
                            {bin.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {bin.is_full && (
                            <Badge variant="warning">Full</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(bin.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(bin)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(bin)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(bin)}
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
                Page {page} of {totalPages} ({totalCount} bins)
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
      <BinFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        bin={selectedBin}
      />

      {/* Detail Sheet */}
      <BinDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        bin={selectedBin}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bin</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete bin{' '}
              <span className="font-medium">{binToDelete?.code}</span>?
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
    </div>
  )
}

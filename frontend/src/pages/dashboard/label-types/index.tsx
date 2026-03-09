import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePermissions } from '@/hooks/use-permissions'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Tag,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
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

import inventoryApi, { BinLabelType } from '@/api/endpoints/inventory'
import { getErrorMessage } from '@/lib/api-error'
import LabelTypeFormSheet from './label-type-form-sheet'
import LabelTypeDetailSheet from './label-type-detail-sheet'

const PAGE_SIZE = 20

export default function LabelTypesPage() {
  const queryClient = useQueryClient()
  const { canCreate, canUpdate, canDelete } = usePermissions()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedLabelType, setSelectedLabelType] = useState<BinLabelType | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [labelTypeToDelete, setLabelTypeToDelete] = useState<BinLabelType | null>(null)

  // Build filter params
  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      ordering: 'name',
      page,
      page_size: PAGE_SIZE,
    }

    if (statusFilter === 'active') {
      params.is_active = true
    } else if (statusFilter === 'inactive') {
      params.is_active = false
    }

    if (typeFilter !== 'all') {
      params.label_type = parseInt(typeFilter)
    }

    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['label-types', search, statusFilter, typeFilter, page],
    queryFn: () => inventoryApi.getLabelTypes(getFilterParams()),
  })

  // Separate query for stats (unfiltered)
  const { data: statsData } = useQuery({
    queryKey: ['label-types-stats'],
    queryFn: () => inventoryApi.getLabelTypes({ page_size: 1000 }),
  })

  const labelTypes = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Calculate stats from unfiltered data
  const allLabelTypes = statsData?.data?.results || []
  const activeCount = allLabelTypes.filter((lt) => lt.is_active).length
  const arucoCount = allLabelTypes.filter((lt) => lt.label_type === 0).length
  const qrCount = allLabelTypes.filter((lt) => lt.label_type === 1).length
  const totalStats = statsData?.data?.count || 0

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => inventoryApi.deleteLabelType(uuid),
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setLabelTypeToDelete(null)
      toast.success('Label type deleted successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['label-types'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['label-types-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to delete label type', { duration: 5000 })
    },
  })

  const handleAdd = () => {
    setSelectedLabelType(null)
    setFormOpen(true)
  }

  const handleEdit = (labelType: BinLabelType) => {
    setSelectedLabelType(labelType)
    setFormOpen(true)
  }

  const handleView = (labelType: BinLabelType) => {
    setSelectedLabelType(labelType)
    setDetailOpen(true)
  }

  const handleDelete = (labelType: BinLabelType) => {
    setLabelTypeToDelete(labelType)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (labelTypeToDelete) {
      deleteMutation.mutate(labelTypeToDelete.uuid)
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Label Types</h1>
          <p className="text-muted-foreground">
            Manage bin label configurations for drone recognition
          </p>
        </div>
        {canCreate('inventory', 'binlabeltype') && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Label Type
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">ArUco</CardTitle>
            <Tag className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{arucoCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Code</CardTitle>
            <Tag className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qrCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Label Type List</CardTitle>
          <CardDescription>
            View and manage all bin label types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search label types..."
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
                <SelectItem value="0">ArUco</SelectItem>
                <SelectItem value="1">QR Code</SelectItem>
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
              Failed to load label types. Please try again.
            </div>
          ) : labelTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No label types found. {hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first label type to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dictionary</TableHead>
                    <TableHead>Marker Size</TableHead>
                    <TableHead>Templates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labelTypes.map((labelType) => (
                    <TableRow key={labelType.uuid}>
                      <TableCell>
                        <div className="font-medium">{labelType.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={labelType.label_type === 0 ? 'default' : 'secondary'}>
                          {labelType.label_type_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">
                          {labelType.dictionary_size || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{labelType.marker_size_mm} mm</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {labelType.template_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={labelType.is_active ? 'success' : 'secondary'}>
                          {labelType.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(labelType.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(labelType)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canUpdate('inventory', 'binlabeltype') && (
                              <DropdownMenuItem onClick={() => handleEdit(labelType)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete('inventory', 'binlabeltype') && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(labelType)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} label types)
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
      <LabelTypeFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        labelType={selectedLabelType}
      />

      {/* Detail Sheet */}
      <LabelTypeDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        labelType={selectedLabelType}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Label Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete label type{' '}
              <span className="font-medium">{labelTypeToDelete?.name}</span>?
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

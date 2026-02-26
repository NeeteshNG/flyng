import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  LayoutTemplate,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Package,
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

import inventoryApi, { BinTemplate } from '@/api/endpoints/inventory'
import { getErrorMessage } from '@/lib/api-error'
import BinTemplateFormSheet from './bin-template-form-sheet'
import BinTemplateDetailSheet from './bin-template-detail-sheet'

const PAGE_SIZE = 20

export default function BinTemplatesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<BinTemplate | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<BinTemplate | null>(null)

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

    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['bin-templates', search, statusFilter, page],
    queryFn: () => inventoryApi.getBinTemplates(getFilterParams()),
  })

  // Separate query for stats (unfiltered)
  const { data: statsData } = useQuery({
    queryKey: ['bin-templates-stats'],
    queryFn: () => inventoryApi.getBinTemplates({ page_size: 1000 }),
  })

  const templates = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Calculate stats from unfiltered data
  const allTemplates = statsData?.data?.results || []
  const activeCount = allTemplates.filter((t) => t.is_active).length
  const totalBins = allTemplates.reduce((sum, t) => sum + (t.bin_count || 0), 0)
  const totalStats = statsData?.data?.count || 0

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => inventoryApi.deleteBinTemplate(uuid),
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
      toast.success('Bin template deleted successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['bin-templates'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['bin-templates-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to delete bin template', { duration: 5000 })
    },
  })

  const handleAdd = () => {
    setSelectedTemplate(null)
    setFormOpen(true)
  }

  const handleEdit = (template: BinTemplate) => {
    setSelectedTemplate(template)
    setFormOpen(true)
  }

  const handleView = (template: BinTemplate) => {
    setSelectedTemplate(template)
    setDetailOpen(true)
  }

  const handleDelete = (template: BinTemplate) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.uuid)
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
          <h1 className="text-3xl font-bold tracking-tight">Bin Templates</h1>
          <p className="text-muted-foreground">
            Manage bin size and weight templates
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats - activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bins</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Template List</CardTitle>
          <CardDescription>
            View and manage all bin templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
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
              Failed to load bin templates. Please try again.
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found. {hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first bin template to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Label Type</TableHead>
                    <TableHead>Dimensions (cm)</TableHead>
                    <TableHead>Max Weight</TableHead>
                    <TableHead>Bins</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.uuid}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {template.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {template.label_type_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">
                          {template.width} × {template.height} × {template.depth}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{template.max_weight_kg} kg</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {template.bin_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? 'success' : 'secondary'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(template.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(template)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(template)}
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
                Page {page} of {totalPages} ({totalCount} templates)
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
      <BinTemplateFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        template={selectedTemplate}
      />

      {/* Detail Sheet */}
      <BinTemplateDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        template={selectedTemplate}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bin Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete template{' '}
              <span className="font-medium">{templateToDelete?.name}</span>?
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

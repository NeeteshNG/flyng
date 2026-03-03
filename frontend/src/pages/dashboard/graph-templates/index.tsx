import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  BarChart3, CheckCircle, XCircle,
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

import logsApi, { FlightGraphTemplate } from '@/api/endpoints/logs'
import { useFormat } from '@/hooks/use-format'
import { getErrorMessage } from '@/lib/api-error'
import TemplateFormSheet from './template-form-sheet'
import TemplateDetailSheet from './template-detail-sheet'

const GRAPH_TYPES = [
  { value: 'LINE', label: 'Line Chart' },
  { value: 'SCATTER', label: 'Scatter Plot' },
  { value: 'BAR', label: 'Bar Chart' },
  { value: 'AREA', label: 'Area Chart' },
  { value: 'HISTOGRAM', label: 'Histogram' },
  { value: 'HEATMAP', label: 'Heatmap' },
  { value: 'BOX', label: 'Box Plot' },
  { value: 'PATH_3D', label: '3D Flight Path' },
]

const graphTypeBadgeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
  switch (type) {
    case 'LINE':
    case 'AREA': return 'default'
    case 'BAR':
    case 'HISTOGRAM': return 'secondary'
    default: return 'outline'
  }
}

const PAGE_SIZE = 20

export default function GraphTemplatesPage() {
  const queryClient = useQueryClient()
  const { formatDate } = useFormat()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<FlightGraphTemplate | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<FlightGraphTemplate | null>(null)

  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      ordering: 'display_order',
      page,
      page_size: PAGE_SIZE,
    }
    if (typeFilter !== 'all') params.graph_type = typeFilter
    if (activeFilter === 'true') params.is_active = true
    if (activeFilter === 'false') params.is_active = false
    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['graph-templates', search, typeFilter, activeFilter, page],
    queryFn: () => logsApi.getGraphTemplates(getFilterParams()),
  })

  const { data: statsData } = useQuery({
    queryKey: ['graph-templates-stats'],
    queryFn: () => logsApi.getGraphTemplates({ page_size: 1000 }),
  })

  const templates = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const allTemplates = statsData?.data?.results || []
  const totalStats = statsData?.data?.count || 0
  const activeCount = allTemplates.filter((t) => t.is_active).length
  const inactiveCount = allTemplates.filter((t) => !t.is_active).length
  const systemCount = allTemplates.filter((t) => !t.organization).length

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => logsApi.deleteGraphTemplate(uuid),
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
      toast.success('Template deactivated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['graph-templates'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['graph-templates-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to deactivate template'), { duration: 5000 })
    },
  })

  const handleAdd = () => { setSelectedTemplate(null); setFormOpen(true) }
  const handleEdit = (template: FlightGraphTemplate) => { setSelectedTemplate(template); setFormOpen(true) }
  const handleView = (template: FlightGraphTemplate) => { setSelectedTemplate(template); setDetailOpen(true) }
  const handleDelete = (template: FlightGraphTemplate) => { setTemplateToDelete(template); setDeleteDialogOpen(true) }
  const confirmDelete = () => { if (templateToDelete) deleteMutation.mutate(templateToDelete.uuid) }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setActiveFilter('all')
    setPage(1)
  }

  const hasActiveFilters = search || typeFilter !== 'all' || activeFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Graph Templates</h1>
          <p className="text-muted-foreground">Manage flight data visualization templates</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
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
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Templates</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Configure graph visualizations for flight log data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => { setTypeFilter(value); setPage(1) }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Graph Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {GRAPH_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={activeFilter}
              onValueChange={(value) => { setActiveFilter(value); setPage(1) }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
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
              Failed to load templates. Please try again.
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? 'No templates found. Try adjusting your filters.'
                : 'No graph templates yet. Create your first template to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Axes</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Order</TableHead>
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
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {template.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={graphTypeBadgeVariant(template.graph_type)}>
                          {template.graph_type_display}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <span className="text-muted-foreground">X:</span> {template.x_axis_field}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Y:</span> {template.y_axis_field}
                        </div>
                        {template.z_axis_field && (
                          <div>
                            <span className="text-muted-foreground">Z:</span> {template.z_axis_field}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.organization_name ? (
                          <span className="text-sm">{template.organization_name}</span>
                        ) : (
                          <Badge variant="outline">System</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {template.display_order}
                      </TableCell>
                      <TableCell>
                        {template.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
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
                Page {page} of {totalPages} ({totalCount} templates)
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

      <TemplateFormSheet open={formOpen} onOpenChange={setFormOpen} template={selectedTemplate} />
      <TemplateDetailSheet open={detailOpen} onOpenChange={setDetailOpen} template={selectedTemplate} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-medium">{templateToDelete?.name}</span>?
              The template will be marked as inactive.
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

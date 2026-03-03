import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  FileText, CheckCircle, XCircle, Clock,
  Loader2, ChevronLeft, ChevronRight, X, Upload,
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

import logsApi, { DroneFlightLog } from '@/api/endpoints/logs'
import { useFormat } from '@/hooks/use-format'
import { getErrorMessage } from '@/lib/api-error'
import LogFormSheet from './log-form-sheet'
import LogDetailSheet from './log-detail-sheet'

const PAGE_SIZE = 20

export default function LogFilesPage() {
  const queryClient = useQueryClient()
  const { formatDate } = useFormat()
  const [search, setSearch] = useState('')
  const [processedFilter, setProcessedFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<DroneFlightLog | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [logToDelete, setLogToDelete] = useState<DroneFlightLog | null>(null)

  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      ordering: '-flight_date',
      page,
      page_size: PAGE_SIZE,
    }
    if (processedFilter === 'true') params.is_processed = true
    if (processedFilter === 'false') params.is_processed = false
    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['flight-logs', search, processedFilter, page],
    queryFn: () => logsApi.getFlightLogs(getFilterParams()),
  })

  const { data: statsData } = useQuery({
    queryKey: ['flight-logs-stats'],
    queryFn: () => logsApi.getFlightLogs({ page_size: 1000 }),
  })

  const logs = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const allLogs = statsData?.data?.results || []
  const totalStats = statsData?.data?.count || 0
  const processedCount = allLogs.filter((l) => l.is_processed).length
  const unprocessedCount = allLogs.filter((l) => !l.is_processed).length
  const withGraphsCount = allLogs.filter((l) => l.graphs_count > 0).length

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => logsApi.deleteFlightLog(uuid),
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setLogToDelete(null)
      toast.success('Flight log deleted successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['flight-logs'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['flight-logs-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to delete log'), { duration: 5000 })
    },
  })

  const handleAdd = () => { setSelectedLog(null); setFormOpen(true) }
  const handleEdit = (log: DroneFlightLog) => { setSelectedLog(log); setFormOpen(true) }
  const handleView = (log: DroneFlightLog) => { setSelectedLog(log); setDetailOpen(true) }
  const handleDelete = (log: DroneFlightLog) => { setLogToDelete(log); setDeleteDialogOpen(true) }
  const confirmDelete = () => { if (logToDelete) deleteMutation.mutate(logToDelete.uuid) }

  const clearFilters = () => {
    setSearch('')
    setProcessedFilter('all')
    setPage(1)
  }

  const hasActiveFilters = search || processedFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Files</h1>
          <p className="text-muted-foreground">Manage drone flight log files and metadata</p>
        </div>
        <Button onClick={handleAdd}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Log
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unprocessed</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unprocessedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Graphs</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withGraphsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Flight Logs</CardTitle>
          <CardDescription>View and manage uploaded drone flight log files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select
              value={processedFilter}
              onValueChange={(value) => { setProcessedFilter(value); setPage(1) }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Processed</SelectItem>
                <SelectItem value="false">Unprocessed</SelectItem>
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
              Failed to load flight logs. Please try again.
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? 'No logs found. Try adjusting your filters.'
                : 'No flight logs uploaded yet. Upload your first log to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Drone</TableHead>
                    <TableHead>Flight Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Battery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Graphs</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.uuid}>
                      <TableCell>
                        <div>
                          <div className="font-medium truncate max-w-[200px]">{log.filename}</div>
                          <div className="text-xs text-muted-foreground">{log.file_size_display}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.drone_name ? (
                          <div className="text-sm">
                            <div>{log.drone_name}</div>
                            <code className="text-xs text-muted-foreground">{log.drone_serial}</code>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.flight_date ? formatDate(log.flight_date) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{log.duration_display}</TableCell>
                      <TableCell className="text-sm">{log.distance_display}</TableCell>
                      <TableCell className="text-sm">
                        {log.battery_used_percent != null ? (
                          <span>{log.battery_used_percent.toFixed(0)}% used</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {log.is_processed ? (
                          <Badge variant="default">Processed</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.graphs_count}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(log)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(log)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(log)}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} logs)
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

      <LogFormSheet open={formOpen} onOpenChange={setFormOpen} log={selectedLog} />
      <LogDetailSheet open={detailOpen} onOpenChange={setDetailOpen} log={selectedLog} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Flight Log</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium">{logToDelete?.filename}</span>?
              This action cannot be undone.
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
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

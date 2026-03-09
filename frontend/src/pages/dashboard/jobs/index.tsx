import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Edit, Eye, X,
  Briefcase, Clock, CheckCircle, AlertTriangle, PlayCircle, PauseCircle,
  Loader2, ChevronLeft, ChevronRight, RotateCcw, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import jobsApi, { DroneJob } from '@/api/endpoints/jobs'
import { useFormat } from '@/hooks/use-format'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/api-error'
import { ExportButton } from '@/components/shared/export-button'
import JobFormSheet from './job-form-sheet'
import JobDetailSheet from './job-detail-sheet'

const JOB_STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const JOB_TYPES = [
  { value: 'PICK', label: 'Pick' },
  { value: 'SCAN', label: 'Scan' },
  { value: 'COUNT', label: 'Count' },
  { value: 'MOVE', label: 'Move' },
  { value: 'RETURN_HOME', label: 'Return Home' },
]

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'NEW': return 'outline'
    case 'QUEUED': return 'secondary'
    case 'ASSIGNED': return 'secondary'
    case 'IN_PROGRESS': return 'default'
    case 'PAUSED': return 'outline'
    case 'COMPLETED': return 'default'
    case 'FAILED': return 'destructive'
    case 'CANCELLED': return 'outline'
    default: return 'outline'
  }
}

const priorityBadgeVariant = (priority: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (priority) {
    case 'URGENT': return 'destructive'
    case 'HIGH': return 'default'
    case 'NORMAL': return 'secondary'
    case 'LOW': return 'outline'
    default: return 'outline'
  }
}

const PAGE_SIZE = 20

export default function JobsPage() {
  const queryClient = useQueryClient()
  const { formatDate, formatRelative } = useFormat()
  const { canCreate, canUpdate, canDelete } = usePermissions()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<DroneJob | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [jobToCancel, setJobToCancel] = useState<DroneJob | null>(null)

  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      ordering: '-created_at',
      page,
      page_size: PAGE_SIZE,
    }
    if (statusFilter !== 'all') params.status = statusFilter
    if (typeFilter !== 'all') params.job_type = typeFilter
    if (priorityFilter !== 'all') params.priority = priorityFilter
    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', search, statusFilter, typeFilter, priorityFilter, page],
    queryFn: () => jobsApi.getJobs(getFilterParams()),
  })

  const { data: statsData } = useQuery({
    queryKey: ['jobs-stats'],
    queryFn: () => jobsApi.getJobs({ page_size: 1000 }),
  })

  const jobs = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const allJobs = statsData?.data?.results || []
  const totalStats = statsData?.data?.count || 0
  const activeCount = allJobs.filter((j) =>
    ['NEW', 'QUEUED', 'ASSIGNED', 'IN_PROGRESS', 'PAUSED'].includes(j.status)
  ).length
  const completedCount = allJobs.filter((j) => j.status === 'COMPLETED').length
  const failedCount = allJobs.filter((j) => j.status === 'FAILED').length

  const refetchAll = () => {
    queryClient.refetchQueries({ queryKey: ['jobs'], type: 'all' })
    queryClient.refetchQueries({ queryKey: ['jobs-stats'], type: 'all' })
  }

  const cancelMutation = useMutation({
    mutationFn: (uuid: string) => jobsApi.deleteJob(uuid),
    onSuccess: () => {
      setCancelDialogOpen(false)
      setJobToCancel(null)
      toast.success('Job cancelled successfully', { duration: 4000 })
      refetchAll()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to cancel job', { duration: 5000 })
    },
  })

  const transitionMutation = useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: string }) => {
      switch (action) {
        case 'queue': return jobsApi.queueJob(uuid)
        case 'start': return jobsApi.startJob(uuid)
        case 'complete': return jobsApi.completeJob(uuid)
        case 'pause': return jobsApi.pauseJob(uuid)
        case 'resume': return jobsApi.resumeJob(uuid)
        case 'retry': return jobsApi.retryJob(uuid)
        default: throw new Error('Unknown action')
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`Job ${variables.action}d successfully`, { duration: 4000 })
      refetchAll()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Action failed', { duration: 5000 })
    },
  })

  const handleAdd = () => { setSelectedJob(null); setFormOpen(true) }
  const handleEdit = (job: DroneJob) => { setSelectedJob(job); setFormOpen(true) }
  const handleView = (job: DroneJob) => { setSelectedJob(job); setDetailOpen(true) }
  const handleCancel = (job: DroneJob) => { setJobToCancel(job); setCancelDialogOpen(true) }
  const confirmCancel = () => { if (jobToCancel) cancelMutation.mutate(jobToCancel.uuid) }
  const handleTransition = (job: DroneJob, action: string) => {
    transitionMutation.mutate({ uuid: job.uuid, action })
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setTypeFilter('all')
    setPriorityFilter('all')
    setPage(1)
  }

  const hasActiveFilters = search || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all'

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-'
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${(seconds / 3600).toFixed(1)}h`
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drone Jobs</h1>
          <p className="text-muted-foreground">Manage drone pick, scan, count, and move operations</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton exportType="jobs" />
          {canCreate('jobs', 'dronejob') && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Job Queue</CardTitle>
          <CardDescription>View and manage all drone jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
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
                {JOB_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(value) => { setTypeFilter(value); setPage(1) }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={(value) => { setPriorityFilter(value); setPage(1) }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
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
              Failed to load jobs. Please try again.
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? 'No jobs found. Try adjusting your filters.'
                : 'No jobs created yet. Create your first job to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Drone</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.uuid}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{job.job_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {job.item_name || job.order_number || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{job.job_type_display}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(job.status)}>
                          {job.status_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityBadgeVariant(job.priority)}>
                          {job.priority_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.drone_name ? (
                          <div className="text-sm">
                            <div>{job.drone_name}</div>
                            <code className="text-xs text-muted-foreground">{job.drone_serial}</code>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {job.picked_quantity}/{job.quantity}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDuration(job.duration_seconds)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatRelative(job.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(job)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {job.is_active && canUpdate('jobs', 'dronejob') && (
                              <DropdownMenuItem onClick={() => handleEdit(job)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {/* State transition actions */}
                            {job.status === 'NEW' && (
                              <DropdownMenuItem onClick={() => handleTransition(job, 'queue')}>
                                <Clock className="h-4 w-4 mr-2" />
                                Queue
                              </DropdownMenuItem>
                            )}
                            {job.status === 'ASSIGNED' && (
                              <DropdownMenuItem onClick={() => handleTransition(job, 'start')}>
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Start
                              </DropdownMenuItem>
                            )}
                            {job.status === 'IN_PROGRESS' && (
                              <>
                                <DropdownMenuItem onClick={() => handleTransition(job, 'complete')}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Complete
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleTransition(job, 'pause')}>
                                  <PauseCircle className="h-4 w-4 mr-2" />
                                  Pause
                                </DropdownMenuItem>
                              </>
                            )}
                            {job.status === 'PAUSED' && (
                              <DropdownMenuItem onClick={() => handleTransition(job, 'resume')}>
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Resume
                              </DropdownMenuItem>
                            )}
                            {job.can_retry && (
                              <DropdownMenuItem onClick={() => handleTransition(job, 'retry')}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Retry
                              </DropdownMenuItem>
                            )}
                            {job.is_active && canDelete('jobs', 'dronejob') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleCancel(job)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Job
                                </DropdownMenuItem>
                              </>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} jobs)
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

      <JobFormSheet open={formOpen} onOpenChange={setFormOpen} job={selectedJob} />
      <JobDetailSheet open={detailOpen} onOpenChange={setDetailOpen} job={selectedJob} />

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel job{' '}
              <span className="font-medium">{jobToCancel?.job_number}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Job
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Briefcase, Clock, CheckCircle2, AlertTriangle,
  Zap, Pause, ArrowUpDown, X, Activity,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import jobsApi, { type DroneJob } from '@/api/endpoints/jobs'
import { JobQueueCard } from './job-queue-card'

const JOB_PRIORITIES = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
]

const JOB_TYPES = [
  { value: 'PICK', label: 'Pick' },
  { value: 'SCAN', label: 'Scan' },
  { value: 'COUNT', label: 'Count' },
  { value: 'MOVE', label: 'Move' },
  { value: 'RETURN_HOME', label: 'Return Home' },
]

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

export default function JobQueuePage() {
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('active')

  // Queue stats (auto-refresh every 15s for live feel)
  const { data: statsData } = useQuery({
    queryKey: ['job-queue-stats'],
    queryFn: () => jobsApi.getQueueStats(),
    refetchInterval: 15000,
  })
  const stats = statsData?.data

  // Active jobs (auto-refresh every 10s — these change frequently)
  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ['job-queue-active', search, priorityFilter, typeFilter],
    queryFn: () => jobsApi.getJobs({
      is_active: true,
      search: search || undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      job_type: typeFilter !== 'all' ? typeFilter : undefined,
      ordering: 'priority,-created_at',
      page_size: 100,
    }),
    refetchInterval: 10000,
  })
  const activeJobs: DroneJob[] = activeData?.data?.results || []

  // Recent completed/failed (auto-refresh every 15s)
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['job-queue-recent', search],
    queryFn: () => jobsApi.getJobs({
      is_active: false,
      search: search || undefined,
      ordering: '-updated_at',
      page_size: 50,
    }),
    refetchInterval: 15000,
  })
  const recentJobs: DroneJob[] = recentData?.data?.results || []

  // Failed jobs needing attention
  const { data: failedData, isLoading: failedLoading } = useQuery({
    queryKey: ['job-queue-failed'],
    queryFn: () => jobsApi.getJobs({
      status: 'FAILED',
      ordering: '-failed_at',
      page_size: 50,
    }),
    refetchInterval: 15000,
  })
  const failedJobs: DroneJob[] = failedData?.data?.results || []

  const clearFilters = () => {
    setSearch('')
    setPriorityFilter('all')
    setTypeFilter('all')
  }
  const hasActiveFilters = search || priorityFilter !== 'all' || typeFilter !== 'all'

  // Group active jobs by status for the pipeline view
  const jobsByStatus = {
    NEW: activeJobs.filter(j => j.status === 'NEW'),
    QUEUED: activeJobs.filter(j => j.status === 'QUEUED'),
    ASSIGNED: activeJobs.filter(j => j.status === 'ASSIGNED'),
    IN_PROGRESS: activeJobs.filter(j => j.status === 'IN_PROGRESS'),
    PAUSED: activeJobs.filter(j => j.status === 'PAUSED'),
  }

  const renderJobGrid = (jobs: DroneJob[], loading: boolean, emptyMsg: string) => {
    if (loading) {
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      )
    }
    if (jobs.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">{emptyMsg}</div>
      )
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {jobs.map(job => <JobQueueCard key={job.id} job={job} />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Queue</h1>
          <p className="text-muted-foreground">Real-time job queue monitoring</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-green-500 animate-pulse" />
          Live — auto-refreshing
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.active_total ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.queued ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.in_progress ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused</CardTitle>
            <Pause className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.paused ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Done/hr</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.completed_last_hour ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed/hr</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed_last_hour ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(stats?.avg_duration_seconds ?? null)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.needs_attention ?? '-'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Priority breakdown */}
      {stats?.priority && stats.active_total > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Priority:</span>
          {stats.priority.urgent > 0 && (
            <Badge variant="destructive">{stats.priority.urgent} Urgent</Badge>
          )}
          {stats.priority.high > 0 && (
            <Badge variant="default">{stats.priority.high} High</Badge>
          )}
          {stats.priority.normal > 0 && (
            <Badge variant="secondary">{stats.priority.normal} Normal</Badge>
          )}
          {stats.priority.low > 0 && (
            <Badge variant="outline">{stats.priority.low} Low</Badge>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by job number, drone, item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {JOB_PRIORITIES.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {JOB_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Active
            {stats?.active_total != null && stats.active_total > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {stats.active_total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Failed
            {failedJobs.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                {failedJobs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Recent
          </TabsTrigger>
        </TabsList>

        {/* Active Tab — All active jobs as cards */}
        <TabsContent value="active" className="mt-4">
          {renderJobGrid(
            activeJobs,
            activeLoading,
            hasActiveFilters ? 'No active jobs match your filters.' : 'No active jobs in the queue.'
          )}
        </TabsContent>

        {/* Pipeline Tab — Jobs grouped by status columns */}
        <TabsContent value="pipeline" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-5">
            {(
              [
                { key: 'NEW', label: 'New', color: 'text-slate-600' },
                { key: 'QUEUED', label: 'Queued', color: 'text-amber-600' },
                { key: 'ASSIGNED', label: 'Assigned', color: 'text-blue-600' },
                { key: 'IN_PROGRESS', label: 'In Progress', color: 'text-blue-600' },
                { key: 'PAUSED', label: 'Paused', color: 'text-orange-600' },
              ] as const
            ).map(col => (
              <div key={col.key} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className={`text-sm font-semibold ${col.color}`}>{col.label}</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {jobsByStatus[col.key].length}
                  </Badge>
                </div>
                <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
                  {activeLoading ? (
                    <Skeleton className="h-32 w-full rounded-lg" />
                  ) : jobsByStatus[col.key].length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      Empty
                    </div>
                  ) : (
                    jobsByStatus[col.key].map(job => (
                      <JobQueueCard key={job.id} job={job} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Failed Tab — Jobs that need attention */}
        <TabsContent value="failed" className="mt-4">
          {renderJobGrid(
            failedJobs,
            failedLoading,
            'No failed jobs. Everything is running smoothly!'
          )}
        </TabsContent>

        {/* Recent Tab — Completed/cancelled jobs */}
        <TabsContent value="recent" className="mt-4">
          {renderJobGrid(
            recentJobs,
            recentLoading,
            'No recently completed jobs.'
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

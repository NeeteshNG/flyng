import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useFormat } from '@/hooks/use-format'
import type { DroneJob } from '@/api/endpoints/jobs'
import {
  Clock, Plane, Package, AlertTriangle, Pause, RotateCcw,
} from 'lucide-react'

const statusConfig: Record<string, {
  color: string
  bg: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: React.ElementType
}> = {
  NEW: { color: 'text-slate-600', bg: 'bg-slate-100', variant: 'outline', icon: Clock },
  QUEUED: { color: 'text-amber-600', bg: 'bg-amber-100', variant: 'outline', icon: Clock },
  ASSIGNED: { color: 'text-blue-600', bg: 'bg-blue-100', variant: 'secondary', icon: Plane },
  IN_PROGRESS: { color: 'text-blue-600', bg: 'bg-blue-100', variant: 'default', icon: Plane },
  PAUSED: { color: 'text-orange-600', bg: 'bg-orange-100', variant: 'outline', icon: Pause },
  COMPLETED: { color: 'text-green-600', bg: 'bg-green-100', variant: 'secondary', icon: Package },
  FAILED: { color: 'text-red-600', bg: 'bg-red-100', variant: 'destructive', icon: AlertTriangle },
  CANCELLED: { color: 'text-gray-400', bg: 'bg-gray-100', variant: 'outline', icon: Clock },
}

const priorityConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  URGENT: { variant: 'destructive' },
  HIGH: { variant: 'default' },
  NORMAL: { variant: 'secondary' },
  LOW: { variant: 'outline' },
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '-'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

interface JobQueueCardProps {
  job: DroneJob
}

export function JobQueueCard({ job }: JobQueueCardProps) {
  const { formatDateTime } = useFormat()
  const cfg = statusConfig[job.status] || statusConfig.NEW
  const priCfg = priorityConfig[job.priority] || priorityConfig.NORMAL
  const StatusIcon = cfg.icon
  const progress = job.quantity > 0 ? Math.round((job.picked_quantity / job.quantity) * 100) : 0

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all hover:shadow-md',
      job.status === 'FAILED' && 'border-red-200',
      job.status === 'IN_PROGRESS' && 'border-blue-200',
    )}>
      {/* Status color strip */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', cfg.bg)} />

      <CardContent className="p-4 pl-5 space-y-2.5">
        {/* Header: Job number + Priority */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('h-4 w-4', cfg.color)} />
            <span className="font-semibold text-sm">{job.job_number}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant={priCfg.variant} className="text-[10px] px-1.5 py-0">
              {job.priority}
            </Badge>
            <Badge variant={cfg.variant} className="text-xs">
              {job.status_display}
            </Badge>
          </div>
        </div>

        {/* Type + Item */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {job.job_type_display}
            </Badge>
            {job.item_name && (
              <span className="truncate">{job.item_name}</span>
            )}
          </div>
          {job.order_number && (
            <div>Order: {job.order_number}</div>
          )}
        </div>

        {/* Progress bar for in-progress/completed jobs */}
        {job.quantity > 0 && (job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{job.picked_quantity}/{job.quantity}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Drone + Duration */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Plane className="h-3 w-3" />
            <span>{job.drone_name || 'Unassigned'}</span>
          </div>
          {job.duration_seconds != null && job.duration_seconds > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(job.duration_seconds)}</span>
            </div>
          )}
        </div>

        {/* Error message for failed jobs */}
        {job.status === 'FAILED' && job.error_message && (
          <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 truncate">
            {job.error_message}
          </div>
        )}

        {/* Can retry indicator */}
        {job.can_retry && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <RotateCcw className="h-3 w-3" />
            <span>Can retry ({job.retry_count}/{job.max_retries})</span>
          </div>
        )}

        {/* Footer: Warehouse + Time */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
          <span className="truncate">{job.warehouse_name}</span>
          <span className="flex-shrink-0 ml-2">{formatDateTime(job.created_at)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

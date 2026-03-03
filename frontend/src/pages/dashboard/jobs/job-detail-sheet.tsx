import { useQuery } from '@tanstack/react-query'
import {
  Briefcase, Clock, Plane, Package, MapPin, AlertTriangle, History,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'

import jobsApi, { DroneJob, DroneJobEvent } from '@/api/endpoints/jobs'
import { useFormat } from '@/hooks/use-format'

interface JobDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: DroneJob | null
}

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

const eventBadgeVariant = (eventType: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (eventType) {
    case 'COMPLETED': return 'default'
    case 'FAILED':
    case 'ERROR': return 'destructive'
    case 'STARTED':
    case 'NAVIGATING':
    case 'ARRIVED': return 'default'
    case 'PAUSED':
    case 'CANCELLED': return 'outline'
    default: return 'secondary'
  }
}

export default function JobDetailSheet({ open, onOpenChange, job }: JobDetailSheetProps) {
  const { formatDate, formatRelative } = useFormat()

  const { data: detailData } = useQuery({
    queryKey: ['job-detail', job?.uuid],
    queryFn: () => jobsApi.getJob(job!.uuid),
    enabled: !!job?.uuid && open,
  })

  const { data: eventsData } = useQuery({
    queryKey: ['job-events', job?.uuid],
    queryFn: () => jobsApi.getJobEvents(job!.uuid),
    enabled: !!job?.uuid && open,
  })

  const detail = detailData?.data || job
  const events: DroneJobEvent[] = eventsData?.data || []

  if (!detail) return null

  const progressPercent = detail.quantity > 0
    ? Math.round((detail.picked_quantity / detail.quantity) * 100)
    : 0

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return 'N/A'
    if (seconds < 60) return `${Math.round(seconds)} seconds`
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`
    return `${(seconds / 3600).toFixed(1)} hours`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{detail.job_number}</SheetTitle>
          <SheetDescription>Job details and event timeline</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status & Priority badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusBadgeVariant(detail.status)}>
              {detail.status_display}
            </Badge>
            <Badge variant={priorityBadgeVariant(detail.priority)}>
              {detail.priority_display}
            </Badge>
            <Badge variant="outline">{detail.job_type_display}</Badge>
            {detail.can_retry && (
              <Badge variant="secondary">Can Retry</Badge>
            )}
          </div>

          <Separator />

          {/* Progress */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Package className="h-4 w-4" /> Progress
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Picked / Required</span>
                <span className="font-medium">{detail.picked_quantity} / {detail.quantity}</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">{progressPercent}% complete</p>
            </div>
          </div>

          <Separator />

          {/* Job Information */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Briefcase className="h-4 w-4" /> Job Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Job Number</span>
                <p className="font-medium">{detail.job_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Warehouse</span>
                <p className="font-medium">{detail.warehouse_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Organization</span>
                <p className="font-medium">{detail.organization_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Duration</span>
                <p className="font-medium">{formatDuration(detail.duration_seconds)}</p>
              </div>
              {detail.order_number && (
                <div>
                  <span className="text-muted-foreground">Order</span>
                  <p className="font-medium">{detail.order_number}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Retries</span>
                <p className="font-medium">{detail.retry_count} / {detail.max_retries}</p>
              </div>
            </div>
          </div>

          {/* Drone Assignment */}
          {detail.drone_name && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Plane className="h-4 w-4" /> Assigned Drone
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name</span>
                    <p className="font-medium">{detail.drone_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Serial</span>
                    <p className="font-medium font-mono text-xs">{detail.drone_serial}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Locations */}
          {(detail.source_bin_code || detail.destination_bin_code || detail.item_name) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4" /> Locations & Items
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detail.source_bin_code && (
                    <div>
                      <span className="text-muted-foreground">Source Bin</span>
                      <p className="font-medium font-mono">{detail.source_bin_code}</p>
                    </div>
                  )}
                  {detail.destination_bin_code && (
                    <div>
                      <span className="text-muted-foreground">Destination Bin</span>
                      <p className="font-medium font-mono">{detail.destination_bin_code}</p>
                    </div>
                  )}
                  {detail.item_name && (
                    <div>
                      <span className="text-muted-foreground">Item</span>
                      <p className="font-medium">{detail.item_name}</p>
                    </div>
                  )}
                  {detail.item_sku && (
                    <div>
                      <span className="text-muted-foreground">SKU</span>
                      <p className="font-medium font-mono">{detail.item_sku}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Error Info */}
          {(detail.error_code || detail.error_message) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Error Details
                </h3>
                <div className="space-y-2 text-sm">
                  {detail.error_code && (
                    <div>
                      <span className="text-muted-foreground">Error Code</span>
                      <p className="font-medium font-mono">{detail.error_code}</p>
                    </div>
                  )}
                  {detail.error_message && (
                    <div>
                      <span className="text-muted-foreground">Error Message</span>
                      <p className="font-medium">{detail.error_message}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" /> Timeline
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">{formatDate(detail.created_at)}</p>
              </div>
              {detail.queued_at && (
                <div>
                  <span className="text-muted-foreground">Queued</span>
                  <p className="font-medium">{formatDate(detail.queued_at)}</p>
                </div>
              )}
              {detail.assigned_at && (
                <div>
                  <span className="text-muted-foreground">Assigned</span>
                  <p className="font-medium">{formatDate(detail.assigned_at)}</p>
                </div>
              )}
              {detail.started_at && (
                <div>
                  <span className="text-muted-foreground">Started</span>
                  <p className="font-medium">{formatDate(detail.started_at)}</p>
                </div>
              )}
              {detail.completed_at && (
                <div>
                  <span className="text-muted-foreground">Completed</span>
                  <p className="font-medium">{formatDate(detail.completed_at)}</p>
                </div>
              )}
              {detail.failed_at && (
                <div>
                  <span className="text-muted-foreground">Failed</span>
                  <p className="font-medium">{formatDate(detail.failed_at)}</p>
                </div>
              )}
              {detail.cancelled_at && (
                <div>
                  <span className="text-muted-foreground">Cancelled</span>
                  <p className="font-medium">{formatDate(detail.cancelled_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {(detail.notes || detail.internal_notes) && (
            <>
              <Separator />
              <div className="space-y-3 text-sm">
                {detail.notes && (
                  <div>
                    <span className="text-muted-foreground">Notes</span>
                    <p className="font-medium whitespace-pre-wrap">{detail.notes}</p>
                  </div>
                )}
                {detail.internal_notes && (
                  <div>
                    <span className="text-muted-foreground">Internal Notes</span>
                    <p className="font-medium whitespace-pre-wrap">{detail.internal_notes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Event Timeline */}
          {events.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <History className="h-4 w-4" /> Event Timeline ({events.length})
                </h3>
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.uuid} className="flex items-start gap-3 text-sm">
                      <div className="flex-shrink-0 mt-0.5">
                        <Badge variant={eventBadgeVariant(event.event_type)} className="text-xs">
                          {event.event_type_display}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-muted-foreground">{event.description || '-'}</p>
                        {event.drone_name && (
                          <p className="text-xs text-muted-foreground">Drone: {event.drone_name}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatRelative(event.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

import { useQuery } from '@tanstack/react-query'
import {
  FileText, MapPin, Activity, Battery, Clock,
  CheckCircle, XCircle, Download,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

import logsApi, { DroneFlightLog } from '@/api/endpoints/logs'
import { useFormat } from '@/hooks/use-format'
import FlightGraphViewer from './flight-graph-viewer'

interface LogDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: DroneFlightLog | null
}

export default function LogDetailSheet({ open, onOpenChange, log }: LogDetailSheetProps) {
  const { formatDate, formatDateTime } = useFormat()

  const { data: detailData } = useQuery({
    queryKey: ['flight-log-detail', log?.uuid],
    queryFn: () => logsApi.getFlightLog(log!.uuid),
    enabled: !!log?.uuid && open,
  })

  const { data: graphsData } = useQuery({
    queryKey: ['flight-log-graphs', log?.uuid],
    queryFn: () => logsApi.getFlightLogGraphs(log!.uuid),
    enabled: !!log?.uuid && open,
  })

  const detail = detailData?.data || log
  const graphs = graphsData?.data || []
  if (!detail) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {detail.filename}
          </SheetTitle>
          <SheetDescription>
            Flight log details and metadata
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status */}
          <div className="flex items-center gap-2 flex-wrap">
            {detail.is_processed ? (
              <Badge variant="default">Processed</Badge>
            ) : (
              <Badge variant="secondary">Pending</Badge>
            )}
            {detail.graphs_count > 0 && (
              <Badge variant="outline">{detail.graphs_count} graphs</Badge>
            )}
          </div>

          <Separator />

          {/* File Info */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4" /> File Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Filename</span>
                <p className="font-medium break-all">{detail.filename}</p>
              </div>
              <div>
                <span className="text-muted-foreground">File Size</span>
                <p className="font-medium">{detail.file_size_display}</p>
              </div>
              {detail.file_hash && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Hash (SHA256)</span>
                  <p className="font-medium font-mono text-xs break-all">{detail.file_hash}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Uploaded By</span>
                <p className="font-medium">{detail.uploaded_by_name || '-'}</p>
              </div>
            </div>
            {detail.file && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                asChild
              >
                <a href={detail.file} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </a>
              </Button>
            )}
          </div>

          <Separator />

          {/* Drone & Location */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4" /> Drone & Location
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Drone</span>
                <p className="font-medium">{detail.drone_name || '-'}</p>
                {detail.drone_serial && (
                  <code className="text-xs text-muted-foreground">{detail.drone_serial}</code>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Warehouse</span>
                <p className="font-medium">{detail.warehouse_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Organization</span>
                <p className="font-medium">{detail.organization_name}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Flight Statistics */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4" /> Flight Statistics
            </h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Flight Date</span>
                <p className="text-lg font-bold">
                  {detail.flight_date ? formatDate(detail.flight_date) : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Duration</span>
                <p className="text-lg font-bold">{detail.duration_display}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Distance</span>
                <p className="text-lg font-bold">{detail.distance_display}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm mt-3">
              <div>
                <span className="text-muted-foreground">Max Altitude</span>
                <p className="font-medium">
                  {detail.max_altitude != null ? `${detail.max_altitude} m` : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Max Speed</span>
                <p className="font-medium">
                  {detail.max_speed != null ? `${detail.max_speed} m/s` : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Speed</span>
                <p className="font-medium">
                  {detail.avg_speed != null ? `${detail.avg_speed} m/s` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* GPS Positions */}
          {(detail.start_latitude != null || detail.end_latitude != null) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4" /> GPS Positions
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {detail.start_latitude != null && (
                    <div>
                      <span className="text-muted-foreground">Start Position</span>
                      <p className="font-medium font-mono text-xs">
                        {detail.start_latitude?.toFixed(6)}, {detail.start_longitude?.toFixed(6)}
                      </p>
                      {detail.start_altitude != null && (
                        <p className="text-xs text-muted-foreground">Alt: {detail.start_altitude} m</p>
                      )}
                    </div>
                  )}
                  {detail.end_latitude != null && (
                    <div>
                      <span className="text-muted-foreground">End Position</span>
                      <p className="font-medium font-mono text-xs">
                        {detail.end_latitude?.toFixed(6)}, {detail.end_longitude?.toFixed(6)}
                      </p>
                      {detail.end_altitude != null && (
                        <p className="text-xs text-muted-foreground">Alt: {detail.end_altitude} m</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Battery */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Battery className="h-4 w-4" /> Battery
            </h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Start</span>
                <p className="font-medium">
                  {detail.start_battery_percent != null ? `${detail.start_battery_percent}%` : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">End</span>
                <p className="font-medium">
                  {detail.end_battery_percent != null ? `${detail.end_battery_percent}%` : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Used</span>
                <p className="font-medium">
                  {detail.battery_used_percent != null ? `${detail.battery_used_percent}%` : '-'}
                </p>
              </div>
            </div>
            {detail.start_battery_percent != null && detail.end_battery_percent != null && (
              <div className="mt-2">
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${detail.end_battery_percent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining: {detail.end_battery_percent}%
                </p>
              </div>
            )}
          </div>

          {/* Processing Status */}
          <Separator />
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              {detail.is_processed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-orange-500" />
              )}
              Processing
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-medium">
                  {detail.is_processed ? 'Processed' : 'Pending'}
                </p>
              </div>
              {detail.processed_at && (
                <div>
                  <span className="text-muted-foreground">Processed At</span>
                  <p className="font-medium">{formatDateTime(detail.processed_at)}</p>
                </div>
              )}
            </div>
            {detail.processing_error && (
              <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                {detail.processing_error}
              </div>
            )}
          </div>

          {/* Description & Notes */}
          {(detail.description || detail.notes) && (
            <>
              <Separator />
              <div className="space-y-3 text-sm">
                {detail.description && (
                  <div>
                    <span className="text-muted-foreground">Description</span>
                    <p className="font-medium">{detail.description}</p>
                  </div>
                )}
                {detail.notes && (
                  <div>
                    <span className="text-muted-foreground">Notes</span>
                    <p className="font-medium">{detail.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Graphs */}
          {graphs.length > 0 && (
            <>
              <Separator />
              <FlightGraphViewer graphs={graphs} />
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <Clock className="h-3 w-3 inline mr-1" />
              Created: {formatDateTime(detail.created_at)}
            </div>
            <div>Updated: {formatDateTime(detail.updated_at)}</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

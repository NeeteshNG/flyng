import { useQuery } from '@tanstack/react-query'
import {
  BarChart3, Settings, Clock,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

import logsApi, { FlightGraphTemplate } from '@/api/endpoints/logs'
import { useFormat } from '@/hooks/use-format'

interface TemplateDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: FlightGraphTemplate | null
}

export default function TemplateDetailSheet({ open, onOpenChange, template }: TemplateDetailSheetProps) {
  const { formatDateTime } = useFormat()

  const { data: detailData } = useQuery({
    queryKey: ['graph-template-detail', template?.uuid],
    queryFn: () => logsApi.getGraphTemplate(template!.uuid),
    enabled: !!template?.uuid && open,
  })

  const detail = detailData?.data || template
  if (!detail) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {detail.name}
          </SheetTitle>
          <SheetDescription>
            Graph template configuration and details
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={detail.is_active ? 'default' : 'secondary'}>
              {detail.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline">{detail.graph_type_display}</Badge>
            {!detail.organization && (
              <Badge variant="outline">System Template</Badge>
            )}
          </div>

          {detail.description && (
            <p className="text-sm text-muted-foreground">{detail.description}</p>
          )}

          <Separator />

          {/* General Info */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4" /> General
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium">{detail.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Graph Type</span>
                <p className="font-medium">{detail.graph_type_display}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Organization</span>
                <p className="font-medium">{detail.organization_name || 'System-wide'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Display Order</span>
                <p className="font-medium">{detail.display_order}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created By</span>
                <p className="font-medium">{detail.created_by_name || '-'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Axis Configuration */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Settings className="h-4 w-4" /> Axis Configuration
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">X-Axis Field</span>
                  <p className="font-medium font-mono">{detail.x_axis_field}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">X-Axis Label</span>
                  <p className="font-medium">{detail.x_axis_label || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Y-Axis Field</span>
                  <p className="font-medium font-mono">{detail.y_axis_field}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Y-Axis Label</span>
                  <p className="font-medium">{detail.y_axis_label || '-'}</p>
                </div>
              </div>
              {detail.z_axis_field && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Z-Axis Field</span>
                    <p className="font-medium font-mono">{detail.z_axis_field}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Z-Axis Label</span>
                    <p className="font-medium">{detail.z_axis_label || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart Config */}
          {detail.chart_config && Object.keys(detail.chart_config).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4" /> Chart Configuration
                </h3>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(detail.chart_config, null, 2)}
                </pre>
              </div>
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

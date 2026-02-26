import { useQuery } from '@tanstack/react-query'
import {
  LayoutTemplate,
  Calendar,
  CheckCircle,
  XCircle,
  Ruler,
  Weight,
  Tag,
  Settings,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

import inventoryApi, { BinTemplate } from '@/api/endpoints/inventory'

interface BinTemplateDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: BinTemplate | null
}

export default function BinTemplateDetailSheet({
  open,
  onOpenChange,
  template,
}: BinTemplateDetailSheetProps) {
  // Fetch full details
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['bin-template-detail', template?.uuid],
    queryFn: () => inventoryApi.getBinTemplate(template!.uuid),
    enabled: !!template?.uuid && open,
  })

  const detail = detailData?.data || template

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!template) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            {detail?.name || 'Template Details'}
          </SheetTitle>
          <SheetDescription>
            Bin template configuration and dimensions
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-6 py-4">
            {/* Status Banner */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  detail.is_active
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {detail.is_active ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{detail.name}</p>
                  {detail.description && (
                    <p className="text-xs text-muted-foreground">
                      {detail.description}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={detail.is_active ? 'success' : 'secondary'}>
                {detail.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {/* Label Type Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Label Type
              </h3>
              <div className="p-3 rounded-md bg-muted text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Label Type</p>
                  <Badge variant="outline">{detail.label_type_name}</Badge>
                </div>
                {detail.label_type_display && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{detail.label_type_display}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Dimensions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Dimensions
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Width</p>
                  <p className="font-medium">{detail.width} cm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Height</p>
                  <p className="font-medium">{detail.height} cm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Depth</p>
                  <p className="font-medium">{detail.depth} cm</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Weight & Config */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    Max Weight
                  </p>
                  <p className="font-medium">{detail.max_weight_kg} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coordinate Type</p>
                  <p className="font-medium">{detail.coordinate_type_display || ['Center', 'Left', 'Right'][detail.coordinate_type]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bins Using</p>
                  <Badge variant="secondary">{detail.bin_count}</Badge>
                </div>
              </div>
            </div>

            {/* Config JSON */}
            {detail.config && Object.keys(detail.config).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Additional Config</h3>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                    {JSON.stringify(detail.config, null, 2)}
                  </pre>
                </div>
              </>
            )}

            <Separator />

            {/* Timestamps */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timestamps
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(detail.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium">{formatDate(detail.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Template details not available
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

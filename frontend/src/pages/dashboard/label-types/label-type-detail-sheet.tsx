import { useQuery } from '@tanstack/react-query'
import {
  Tag,
  Calendar,
  CheckCircle,
  XCircle,
  Settings,
  Ruler,
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

import inventoryApi, { BinLabelType } from '@/api/endpoints/inventory'

interface LabelTypeDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  labelType: BinLabelType | null
}

export default function LabelTypeDetailSheet({
  open,
  onOpenChange,
  labelType,
}: LabelTypeDetailSheetProps) {
  // Fetch full details
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['label-type-detail', labelType?.uuid],
    queryFn: () => inventoryApi.getLabelType(labelType!.uuid),
    enabled: !!labelType?.uuid && open,
  })

  const detail = detailData?.data || labelType

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

  if (!labelType) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {detail?.name || 'Label Type Details'}
          </SheetTitle>
          <SheetDescription>
            Label type configuration and settings
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
                  <p className="text-xs text-muted-foreground">
                    {detail.label_type_display}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={detail.is_active ? 'success' : 'secondary'}>
                  {detail.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Label Type</p>
                  <Badge variant={detail.label_type === 0 ? 'default' : 'secondary'}>
                    {detail.label_type_display}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Dictionary Size</p>
                  <p className="font-medium font-mono">
                    {detail.dictionary_size || '—'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Physical Properties */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Physical Properties
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Marker Size</p>
                  <p className="font-medium">{detail.marker_size_mm} mm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Templates Using</p>
                  <Badge variant="secondary">{detail.template_count}</Badge>
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
            Label type details not available
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

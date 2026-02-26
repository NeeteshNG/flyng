import { useQuery } from '@tanstack/react-query'
import {
  FolderTree, Calendar, CheckCircle, XCircle, Layers, Package,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

import inventoryApi, { ItemCategory } from '@/api/endpoints/inventory'

interface CategoryDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ItemCategory | null
}

export default function CategoryDetailSheet({ open, onOpenChange, category }: CategoryDetailSheetProps) {
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['item-category-detail', category?.uuid],
    queryFn: () => inventoryApi.getItemCategory(category!.uuid),
    enabled: !!category?.uuid && open,
  })

  const detail = detailData?.data || category

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  if (!category) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            {detail?.name || 'Category Details'}
          </SheetTitle>
          <SheetDescription>Item category information</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${detail.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                  {detail.is_active ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-medium">{detail.name}</p>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{detail.code}</code>
                </div>
              </div>
              <Badge variant={detail.is_active ? 'success' : 'secondary'}>
                {detail.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {detail.description && (
              <>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  <p className="text-sm text-muted-foreground">{detail.description}</p>
                </div>
                <Separator />
              </>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Hierarchy
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Level</p>
                  <Badge variant="outline">{detail.level}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Parent</p>
                  <p className="font-medium">{detail.parent_name || 'None (Root)'}</p>
                </div>
                {detail.full_path && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Full Path</p>
                    <p className="font-medium text-xs">{detail.full_path}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Display Order</p>
                  <p className="font-medium">{detail.display_order}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Counts
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Sub-categories</p>
                  <Badge variant="secondary">{detail.children_count}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Items</p>
                  <Badge variant="secondary">{detail.item_count}</Badge>
                </div>
              </div>
            </div>

            <Separator />

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
          <div className="py-8 text-center text-muted-foreground">Category details not available</div>
        )}
      </SheetContent>
    </Sheet>
  )
}

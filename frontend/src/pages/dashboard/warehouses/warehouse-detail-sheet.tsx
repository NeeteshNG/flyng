import { useQuery } from '@tanstack/react-query'
import {
  MapPin,
  Building2,
  Clock,
  Phone,
  Mail,
  User,
  Layers,
  Globe,
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

import warehousesApi, { Warehouse } from '@/api/endpoints/warehouses'

interface WarehouseDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouse: Warehouse | null
}

export default function WarehouseDetailSheet({
  open,
  onOpenChange,
  warehouse,
}: WarehouseDetailSheetProps) {
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['warehouse', warehouse?.uuid],
    queryFn: () => warehousesApi.getWarehouse(warehouse!.uuid),
    enabled: !!warehouse?.uuid && open,
  })

  const { data: contactsData } = useQuery({
    queryKey: ['warehouse-contacts', warehouse?.uuid],
    queryFn: () => warehousesApi.getWarehouseContacts(warehouse!.uuid),
    enabled: !!warehouse?.uuid && open,
  })

  const warehouseDetail = detailData?.data || warehouse
  const contacts = contactsData?.data?.data || []

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!warehouse) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {warehouse.name}
          </SheetTitle>
          <SheetDescription>{warehouse.code}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge variant={warehouseDetail?.is_active ? 'success' : 'secondary'}>
                {warehouseDetail?.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline">{warehouseDetail?.zone_count || 0} zones</Badge>
            </div>

            {/* Description */}
            {warehouseDetail?.description && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {warehouseDetail.description}
                </p>
              </div>
            )}

            <Separator />

            {/* Location */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h3>
              <div className="text-sm space-y-1">
                <p>{warehouseDetail?.address_line_1}</p>
                {warehouseDetail?.address_line_2 && (
                  <p>{warehouseDetail.address_line_2}</p>
                )}
                <p>
                  {warehouseDetail?.city}, {warehouseDetail?.state} -{' '}
                  {warehouseDetail?.postal_code}
                </p>
                <p>{warehouseDetail?.country}</p>
              </div>
              {warehouseDetail?.coordinates && (
                <p className="text-xs text-muted-foreground">
                  Coordinates: {warehouseDetail.coordinates[0]},{' '}
                  {warehouseDetail.coordinates[1]}
                </p>
              )}
            </div>

            <Separator />

            {/* Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Settings
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Timezone</p>
                  <p className="font-medium">{warehouseDetail?.timezone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Organization</p>
                  <p className="font-medium">{warehouseDetail?.organization_name}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contacts */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Contacts ({contacts.length})
              </h3>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts added</p>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div
                      key={contact.uuid}
                      className="p-3 rounded-lg border bg-muted/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{contact.name}</div>
                        <div className="flex gap-1">
                          {contact.is_primary && (
                            <Badge variant="default" className="text-xs">
                              Primary
                            </Badge>
                          )}
                          {contact.is_emergency && (
                            <Badge variant="destructive" className="text-xs">
                              Emergency
                            </Badge>
                          )}
                        </div>
                      </div>
                      {contact.designation && (
                        <p className="text-sm text-muted-foreground">
                          {contact.designation}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{contact.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{contact.phone_primary}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Zones */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Zones
              </h3>
              <p className="text-sm text-muted-foreground">
                This warehouse has {warehouseDetail?.zone_count || 0} active zones.
              </p>
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Created: {formatDate(warehouseDetail?.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Updated: {formatDate(warehouseDetail?.updated_at)}</span>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

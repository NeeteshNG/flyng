import { useQuery } from '@tanstack/react-query'
import {
  User, MapPin, Phone, Mail, Building2, FileText,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

import ordersApi, { Customer } from '@/api/endpoints/orders'
import { useFormat } from '@/hooks/use-format'

interface CustomerDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
}

export default function CustomerDetailSheet({ open, onOpenChange, customer }: CustomerDetailSheetProps) {
  const { formatDateTime } = useFormat()

  const { data: detailData } = useQuery({
    queryKey: ['customer-detail', customer?.uuid],
    queryFn: () => ordersApi.getCustomer(customer!.uuid),
    enabled: !!customer?.uuid && open,
  })

  const detail = detailData?.data || customer
  if (!detail) return null

  const hasAddress = detail.address_line1 || detail.city || detail.state

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {detail.name}
          </SheetTitle>
          <SheetDescription>
            Customer details and contact information
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status & Code */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={detail.is_active ? 'default' : 'destructive'}>
              {detail.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <code className="text-sm bg-muted px-2 py-0.5 rounded">{detail.code}</code>
            {detail.order_count > 0 && (
              <Badge variant="secondary">{detail.order_count} orders</Badge>
            )}
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4" /> Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Contact Person</span>
                <p className="font-medium">{detail.contact_person || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone</span>
                <p className="font-medium">{detail.phone || '—'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </span>
                <p className="font-medium">{detail.email || '—'}</p>
              </div>
            </div>
          </div>

          {/* Address */}
          {hasAddress && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4" /> Address
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detail.address_line1 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Address</span>
                      <p className="font-medium">
                        {detail.address_line1}
                        {detail.address_line2 && <><br />{detail.address_line2}</>}
                      </p>
                    </div>
                  )}
                  {detail.city && (
                    <div>
                      <span className="text-muted-foreground">City</span>
                      <p className="font-medium">{detail.city}</p>
                    </div>
                  )}
                  {detail.state && (
                    <div>
                      <span className="text-muted-foreground">State</span>
                      <p className="font-medium">{detail.state}</p>
                    </div>
                  )}
                  {detail.postal_code && (
                    <div>
                      <span className="text-muted-foreground">Postal Code</span>
                      <p className="font-medium">{detail.postal_code}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Country</span>
                    <p className="font-medium">{detail.country || '—'}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Business Details */}
          {detail.gst_number && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4" /> Business Details
                </h3>
                <div className="text-sm">
                  <span className="text-muted-foreground">GST Number</span>
                  <p className="font-medium">{detail.gst_number}</p>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {detail.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" /> Notes
                </h3>
                <p className="text-sm text-muted-foreground">{detail.notes}</p>
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>Created: {formatDateTime(detail.created_at)}</div>
            <div>Updated: {formatDateTime(detail.updated_at)}</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

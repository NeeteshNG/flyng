import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'

import inventoryApi, { InventoryStock } from '@/api/endpoints/inventory'
import { getErrorMessage } from '@/lib/api-error'

const formSchema = z.object({
  bin: z.number().min(1, 'Bin is required'),
  item: z.number().min(1, 'Item is required'),
  quantity: z.number().int().min(0, 'Quantity must be 0 or greater'),
  reserved_quantity: z.number().int().min(0, 'Reserved quantity must be 0 or greater'),
  lot_number: z.string().max(100),
  expiry_date: z.string(),
  manufacture_date: z.string(),
  received_at: z.string(),
  last_counted_at: z.string(),
  notes: z.string(),
}).refine((data) => data.reserved_quantity <= data.quantity, {
  message: 'Reserved quantity cannot exceed total quantity',
  path: ['reserved_quantity'],
})

type FormValues = z.infer<typeof formSchema>

interface StockFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stock: InventoryStock | null
}

export default function StockFormSheet({ open, onOpenChange, stock }: StockFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!stock

  const { data: binsData } = useQuery({
    queryKey: ['storage-bins-list'],
    queryFn: () => inventoryApi.getStorageBins({ is_active: true, ordering: 'code', page_size: 1000 }),
  })

  const { data: itemsData } = useQuery({
    queryKey: ['inventory-items-list'],
    queryFn: () => inventoryApi.getInventoryItems({ is_active: true, ordering: 'sku', page_size: 1000 }),
  })

  const bins = binsData?.data?.results || []
  const items = itemsData?.data?.results || []

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bin: 0, item: 0, quantity: 0, reserved_quantity: 0,
      lot_number: '', expiry_date: '', manufacture_date: '',
      received_at: '', last_counted_at: '', notes: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (stock) {
      form.reset({
        bin: stock.bin,
        item: stock.item,
        quantity: stock.quantity,
        reserved_quantity: stock.reserved_quantity,
        lot_number: stock.lot_number || '',
        expiry_date: stock.expiry_date || '',
        manufacture_date: stock.manufacture_date || '',
        received_at: stock.received_at || '',
        last_counted_at: stock.last_counted_at || '',
        notes: stock.notes || '',
      })
    } else {
      form.reset({
        bin: bins[0]?.id || 0, item: items[0]?.id || 0, quantity: 0, reserved_quantity: 0,
        lot_number: '', expiry_date: '', manufacture_date: '',
        received_at: '', last_counted_at: '', notes: '',
      })
    }
  }, [open, stock, form, bins, items])

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => inventoryApi.createStockRecord({
      ...data,
      lot_number: data.lot_number || undefined,
      expiry_date: data.expiry_date || null,
      manufacture_date: data.manufacture_date || null,
      received_at: data.received_at || null,
      last_counted_at: data.last_counted_at || null,
      notes: data.notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Stock record created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['inventory-stock'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['inventory-stock-stats'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['inventory-items'], type: 'all' })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create stock record', { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => inventoryApi.updateStockRecord(stock!.uuid, {
      ...data,
      lot_number: data.lot_number || undefined,
      expiry_date: data.expiry_date || null,
      manufacture_date: data.manufacture_date || null,
      received_at: data.received_at || null,
      last_counted_at: data.last_counted_at || null,
      notes: data.notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Stock record updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['inventory-stock'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['inventory-stock-stats'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['inventory-items'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update stock record', { duration: 5000 })
    },
  })

  const onSubmit = (data: FormValues) => {
    if (isEditing) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Stock Record' : 'Add Stock Record'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update the stock record details below.' : 'Fill in the details to create a new stock record.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="bin" render={({ field }) => (
              <FormItem>
                <FormLabel>Storage Bin</FormLabel>
                <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()} disabled={isEditing}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select bin" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {bins.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.code} — {b.warehouse_name} / {b.zone_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="item" render={({ field }) => (
              <FormItem>
                <FormLabel>Inventory Item</FormLabel>
                <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()} disabled={isEditing}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id.toString()}>
                        {i.sku} — {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reserved_quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserved Qty</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="lot_number" render={({ field }) => (
              <FormItem>
                <FormLabel>Lot Number (Optional)</FormLabel>
                <FormControl><Input placeholder="LOT-2024-001" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="expiry_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date (Optional)</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="manufacture_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Manufacture Date (Optional)</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="received_at" render={({ field }) => (
                <FormItem>
                  <FormLabel>Received At (Optional)</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="last_counted_at" render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Counted (Optional)</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <SheetFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

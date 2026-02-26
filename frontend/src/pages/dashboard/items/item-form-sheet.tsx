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
import { Switch } from '@/components/ui/switch'

import inventoryApi, { InventoryItem } from '@/api/endpoints/inventory'
import { getErrorMessage } from '@/lib/api-error'

const formSchema = z.object({
  category: z.number().nullable(),
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string(),
  barcode: z.string().max(100),
  weight_kg: z.string(),
  length_cm: z.string(),
  width_cm: z.string(),
  height_cm: z.string(),
  unit_of_measure: z.string(),
  unit_price: z.string(),
  min_stock_level: z.number().int().min(0),
  reorder_point: z.number().int().min(0),
  reorder_quantity: z.number().int().min(0),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface ItemFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
}

export default function ItemFormSheet({ open, onOpenChange, item }: ItemFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!item

  const { data: categoriesData } = useQuery({
    queryKey: ['item-categories-list'],
    queryFn: () => inventoryApi.getItemCategories({ is_active: true, ordering: 'level,name', page_size: 1000 }),
  })

  const categories = categoriesData?.data?.results || []

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: null, sku: '', name: '', description: '', barcode: '',
      weight_kg: '', length_cm: '', width_cm: '', height_cm: '',
      unit_of_measure: 'EACH', unit_price: '',
      min_stock_level: 0, reorder_point: 0, reorder_quantity: 0,
      is_active: true,
    },
  })

  useEffect(() => {
    if (!open) return
    if (item) {
      form.reset({
        category: item.category,
        sku: item.sku,
        name: item.name,
        description: item.description || '',
        barcode: item.barcode || '',
        weight_kg: item.weight_kg || '',
        length_cm: item.length_cm || '',
        width_cm: item.width_cm || '',
        height_cm: item.height_cm || '',
        unit_of_measure: item.unit_of_measure,
        unit_price: item.unit_price || '',
        min_stock_level: item.min_stock_level,
        reorder_point: item.reorder_point,
        reorder_quantity: item.reorder_quantity || 0,
        is_active: item.is_active,
      })
    } else {
      form.reset({
        category: null, sku: '', name: '', description: '', barcode: '',
        weight_kg: '', length_cm: '', width_cm: '', height_cm: '',
        unit_of_measure: 'EACH', unit_price: '',
        min_stock_level: 0, reorder_point: 0, reorder_quantity: 0,
        is_active: true,
      })
    }
  }, [open, item, form])

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => inventoryApi.createInventoryItem({
      organization: 1, // TODO: Get from user context
      ...data,
      category: data.category || undefined,
      description: data.description || undefined,
      barcode: data.barcode || undefined,
      weight_kg: data.weight_kg || undefined,
      length_cm: data.length_cm || undefined,
      width_cm: data.width_cm || undefined,
      height_cm: data.height_cm || undefined,
      unit_price: data.unit_price || undefined,
    }),
    onSuccess: () => {
      toast.success('Item created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['inventory-items'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['inventory-items-stats'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['item-categories'], type: 'all' })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create item', { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => inventoryApi.updateInventoryItem(item!.uuid, {
      ...data,
      category: data.category || undefined,
      description: data.description || undefined,
      barcode: data.barcode || undefined,
      weight_kg: data.weight_kg || undefined,
      length_cm: data.length_cm || undefined,
      width_cm: data.width_cm || undefined,
      height_cm: data.height_cm || undefined,
      unit_price: data.unit_price || undefined,
    }),
    onSuccess: () => {
      toast.success('Item updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['inventory-items'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['inventory-items-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update item', { duration: 5000 })
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
          <SheetTitle>{isEditing ? 'Edit Item' : 'Add New Item'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update the item details below.' : 'Fill in the details to create a new inventory item.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category (Optional)</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === 'none' ? null : parseInt(v))} value={field.value?.toString() || 'none'}>
                  <FormControl><SelectTrigger><SelectValue placeholder="No category" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{'—'.repeat(c.level)} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl><Input placeholder="SKU-001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="barcode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode (Optional)</FormLabel>
                  <FormControl><Input placeholder="EAN/UPC" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="Product name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Product description..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="unit_of_measure" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Measure</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="EACH">Each</SelectItem>
                      <SelectItem value="BOX">Box</SelectItem>
                      <SelectItem value="CASE">Case</SelectItem>
                      <SelectItem value="PALLET">Pallet</SelectItem>
                      <SelectItem value="KG">Kilogram</SelectItem>
                      <SelectItem value="GRAM">Gram</SelectItem>
                      <SelectItem value="LITER">Liter</SelectItem>
                      <SelectItem value="ML">Milliliter</SelectItem>
                      <SelectItem value="METER">Meter</SelectItem>
                      <SelectItem value="PACK">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unit_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price (Optional)</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="weight_kg" render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg)</FormLabel>
                  <FormControl><Input type="number" step="0.001" placeholder="0.000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="length_cm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Length (cm)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder="0.0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="width_cm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Width (cm)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder="0.0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="height_cm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (cm)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder="0.0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="min_stock_level" render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Stock</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reorder_point" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Point</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reorder_quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Qty</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                  <p className="text-sm text-muted-foreground">Whether this item is in use</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
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

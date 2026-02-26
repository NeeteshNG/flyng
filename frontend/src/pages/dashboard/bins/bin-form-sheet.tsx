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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'

import inventoryApi, { StorageBin } from '@/api/endpoints/inventory'
import { getErrorMessage } from '@/lib/api-error'

const binFormSchema = z.object({
  location: z.number().min(1, 'Location is required'),
  template: z.number().min(1, 'Template is required'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less'),
  label_value: z.string().max(100, 'Label must be 100 characters or less'),
  position_index: z.number().int().min(0, 'Position must be 0 or greater'),
  is_active: z.boolean(),
  notes: z.string(),
})

type BinFormValues = z.infer<typeof binFormSchema>

interface BinFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bin: StorageBin | null
}

export default function BinFormSheet({
  open,
  onOpenChange,
  bin,
}: BinFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!bin

  // Fetch locations for dropdown
  const { data: locationsData } = useQuery({
    queryKey: ['storage-locations-list'],
    queryFn: () => inventoryApi.getStorageLocations({ is_active: true, ordering: 'zone__warehouse__name,code', page_size: 1000 }),
  })

  // Fetch templates for dropdown
  const { data: templatesData } = useQuery({
    queryKey: ['bin-templates-list'],
    queryFn: () => inventoryApi.getBinTemplates({ ordering: 'name', page_size: 1000 }),
  })

  const locations = locationsData?.data?.results || []
  const templates = templatesData?.data?.results || []

  const form = useForm<BinFormValues>({
    resolver: zodResolver(binFormSchema),
    defaultValues: {
      location: 0,
      template: 0,
      code: '',
      label_value: '',
      position_index: 0,
      is_active: true,
      notes: '',
    },
  })

  useEffect(() => {
    if (!open) return

    if (bin) {
      form.reset({
        location: bin.location,
        template: bin.template,
        code: bin.code,
        label_value: bin.label_value || '',
        position_index: bin.position_index,
        is_active: bin.is_active,
        notes: bin.notes || '',
      })
    } else {
      form.reset({
        location: locations[0]?.id || 0,
        template: templates[0]?.id || 0,
        code: '',
        label_value: '',
        position_index: 0,
        is_active: true,
        notes: '',
      })
    }
  }, [open, bin, form, locations, templates])

  const createMutation = useMutation({
    mutationFn: (data: BinFormValues) => {
      return inventoryApi.createStorageBin({
        ...data,
        label_value: data.label_value || undefined,
        notes: data.notes || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Bin created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['storage-bins'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['storage-bins-stats'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create bin', { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: BinFormValues) => {
      return inventoryApi.updateStorageBin(bin!.uuid, {
        ...data,
        label_value: data.label_value || undefined,
        notes: data.notes || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Bin updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['storage-bins'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['storage-bins-stats'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update bin', { duration: 5000 })
    },
  })

  const onSubmit = (data: BinFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Bin' : 'Add New Bin'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the storage bin details below.'
              : 'Fill in the details to create a new storage bin.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Location Selection */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Location</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.code} - {location.warehouse_name} / {location.zone_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template Selection */}
            <FormField
              control={form.control}
              name="template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bin Template</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name} ({template.width}×{template.height}×{template.depth} cm, {template.max_weight_kg} kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bin Code</FormLabel>
                  <FormControl>
                    <Input placeholder="BIN-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Label Value */}
            <FormField
              control={form.control}
              name="label_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label Value (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Barcode or QR value" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Position Index */}
            <FormField
              control={form.control}
              name="position_index"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position Index</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this bin..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Toggle */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Whether this bin is in use
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <SheetFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
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

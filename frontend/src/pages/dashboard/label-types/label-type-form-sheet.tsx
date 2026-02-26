import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

import inventoryApi, { BinLabelType } from '@/api/endpoints/inventory'
import { getErrorMessage } from '@/lib/api-error'

const labelTypeFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  label_type: z.number().min(0).max(1),
  dictionary_size: z.string().max(20, 'Dictionary size must be 20 characters or less'),
  marker_size_mm: z.number().int().min(10, 'Min 10mm').max(500, 'Max 500mm'),
  is_active: z.boolean(),
})

type LabelTypeFormValues = z.infer<typeof labelTypeFormSchema>

interface LabelTypeFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  labelType: BinLabelType | null
}

export default function LabelTypeFormSheet({
  open,
  onOpenChange,
  labelType,
}: LabelTypeFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!labelType

  const form = useForm<LabelTypeFormValues>({
    resolver: zodResolver(labelTypeFormSchema),
    defaultValues: {
      name: '',
      label_type: 0,
      dictionary_size: '',
      marker_size_mm: 100,
      is_active: true,
    },
  })

  useEffect(() => {
    if (!open) return

    if (labelType) {
      form.reset({
        name: labelType.name,
        label_type: labelType.label_type,
        dictionary_size: labelType.dictionary_size || '',
        marker_size_mm: labelType.marker_size_mm,
        is_active: labelType.is_active,
      })
    } else {
      form.reset({
        name: '',
        label_type: 0,
        dictionary_size: '',
        marker_size_mm: 100,
        is_active: true,
      })
    }
  }, [open, labelType, form])

  const createMutation = useMutation({
    mutationFn: (data: LabelTypeFormValues) => {
      return inventoryApi.createLabelType({
        organization: 1, // TODO: Get from user context
        ...data,
        dictionary_size: data.dictionary_size || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Label type created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['label-types'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['label-types-stats'], type: 'all' })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create label type', { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: LabelTypeFormValues) => {
      return inventoryApi.updateLabelType(labelType!.uuid, {
        ...data,
        dictionary_size: data.dictionary_size || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Label type updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['label-types'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['label-types-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update label type', { duration: 5000 })
    },
  })

  const onSubmit = (data: LabelTypeFormValues) => {
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
          <SheetTitle>{isEditing ? 'Edit Label Type' : 'Add New Label Type'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the label type configuration below.'
              : 'Fill in the details to create a new label type.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="ArUco 4x4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Label Type */}
            <FormField
              control={form.control}
              name="label_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label Type</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">ArUco</SelectItem>
                      <SelectItem value="1">QR Code</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dictionary Size */}
            <FormField
              control={form.control}
              name="dictionary_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dictionary Size</FormLabel>
                  <FormControl>
                    <Input placeholder="4x4_50, 5x5_100, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Marker Size */}
            <FormField
              control={form.control}
              name="marker_size_mm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marker Size (mm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="100"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
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
                      Whether this label type is in use
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

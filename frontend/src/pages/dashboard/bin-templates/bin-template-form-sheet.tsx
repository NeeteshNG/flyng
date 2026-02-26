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

import inventoryApi, { BinTemplate } from '@/api/endpoints/inventory'
import { getErrorMessage } from '@/lib/api-error'

const templateFormSchema = z.object({
  label_type: z.number().min(1, 'Label type is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string(),
  width: z.string().min(1, 'Width is required'),
  height: z.string().min(1, 'Height is required'),
  depth: z.string().min(1, 'Depth is required'),
  max_weight_kg: z.string().min(1, 'Max weight is required'),
  coordinate_type: z.number().min(0).max(2),
  is_active: z.boolean(),
})

type TemplateFormValues = z.infer<typeof templateFormSchema>

interface BinTemplateFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: BinTemplate | null
}

export default function BinTemplateFormSheet({
  open,
  onOpenChange,
  template,
}: BinTemplateFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!template

  // Fetch label types for dropdown
  const { data: labelTypesData } = useQuery({
    queryKey: ['label-types-list'],
    queryFn: () => inventoryApi.getLabelTypes({ is_active: true, ordering: 'name', page_size: 1000 }),
  })

  const labelTypes = labelTypesData?.data?.results || []

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      label_type: 0,
      name: '',
      description: '',
      width: '',
      height: '',
      depth: '',
      max_weight_kg: '',
      coordinate_type: 0,
      is_active: true,
    },
  })

  useEffect(() => {
    if (!open) return

    if (template) {
      form.reset({
        label_type: template.label_type,
        name: template.name,
        description: template.description || '',
        width: template.width,
        height: template.height,
        depth: template.depth,
        max_weight_kg: template.max_weight_kg,
        coordinate_type: template.coordinate_type,
        is_active: template.is_active,
      })
    } else {
      form.reset({
        label_type: labelTypes[0]?.id || 0,
        name: '',
        description: '',
        width: '',
        height: '',
        depth: '',
        max_weight_kg: '',
        coordinate_type: 0,
        is_active: true,
      })
    }
  }, [open, template, form, labelTypes])

  const createMutation = useMutation({
    mutationFn: (data: TemplateFormValues) => {
      return inventoryApi.createBinTemplate({
        organization: 1, // TODO: Get from user context
        ...data,
        description: data.description || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Bin template created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['bin-templates'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['bin-templates-stats'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['label-types'] })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create bin template', { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: TemplateFormValues) => {
      return inventoryApi.updateBinTemplate(template!.uuid, {
        ...data,
        description: data.description || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Bin template updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['bin-templates'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['bin-templates-stats'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['label-types'] })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update bin template', { duration: 5000 })
    },
  })

  const onSubmit = (data: TemplateFormValues) => {
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
          <SheetTitle>{isEditing ? 'Edit Bin Template' : 'Add New Bin Template'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the bin template configuration below.'
              : 'Fill in the details to create a new bin template.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Label Type Selection */}
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
                        <SelectValue placeholder="Select label type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {labelTypes.map((lt) => (
                        <SelectItem key={lt.id} value={lt.id.toString()}>
                          {lt.name} ({lt.label_type_display})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Small Tote" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description of this template..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dimensions */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depth (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Max Weight */}
            <FormField
              control={form.control}
              name="max_weight_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Weight (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="10.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coordinate Type */}
            <FormField
              control={form.control}
              name="coordinate_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coordinate Type</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select coordinate type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Center</SelectItem>
                      <SelectItem value="1">Left</SelectItem>
                      <SelectItem value="2">Right</SelectItem>
                    </SelectContent>
                  </Select>
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
                      Whether this template is in use
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

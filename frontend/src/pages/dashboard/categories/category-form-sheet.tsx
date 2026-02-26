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

import inventoryApi, { ItemCategory } from '@/api/endpoints/inventory'
import { getErrorMessage } from '@/lib/api-error'

const formSchema = z.object({
  parent: z.number().nullable(),
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50),
  description: z.string(),
  display_order: z.number().int().min(0),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface CategoryFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ItemCategory | null
}

export default function CategoryFormSheet({ open, onOpenChange, category }: CategoryFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!category

  const { data: categoriesData } = useQuery({
    queryKey: ['item-categories-list'],
    queryFn: () => inventoryApi.getItemCategories({ is_active: true, ordering: 'level,name', page_size: 1000 }),
  })

  const parentOptions = (categoriesData?.data?.results || []).filter(
    (c) => !category || c.id !== category.id
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parent: null,
      name: '',
      code: '',
      description: '',
      display_order: 0,
      is_active: true,
    },
  })

  useEffect(() => {
    if (!open) return
    if (category) {
      form.reset({
        parent: category.parent,
        name: category.name,
        code: category.code,
        description: category.description || '',
        display_order: category.display_order,
        is_active: category.is_active,
      })
    } else {
      form.reset({
        parent: null,
        name: '',
        code: '',
        description: '',
        display_order: 0,
        is_active: true,
      })
    }
  }, [open, category, form])

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => inventoryApi.createItemCategory({
      organization: 1, // TODO: Get from user context
      ...data,
      parent: data.parent || undefined,
      description: data.description || undefined,
    }),
    onSuccess: () => {
      toast.success('Category created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['item-categories'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['item-categories-stats'], type: 'all' })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create category', { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => inventoryApi.updateItemCategory(category!.uuid, {
      ...data,
      parent: data.parent || undefined,
      description: data.description || undefined,
    }),
    onSuccess: () => {
      toast.success('Category updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['item-categories'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['item-categories-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update category', { duration: 5000 })
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
          <SheetTitle>{isEditing ? 'Edit Category' : 'Add New Category'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update the category details below.' : 'Fill in the details to create a new item category.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="parent" render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Category (Optional)</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === 'none' ? null : parseInt(v))}
                  value={field.value?.toString() || 'none'}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="No parent (root)" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No parent (root)</SelectItem>
                    {parentOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {'—'.repeat(c.level)} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="Electronics" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl><Input placeholder="ELEC" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Category description..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="display_order" render={({ field }) => (
              <FormItem>
                <FormLabel>Display Order</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                  <p className="text-sm text-muted-foreground">Whether this category is in use</p>
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

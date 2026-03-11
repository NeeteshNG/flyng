import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'

import ordersApi, { Customer } from '@/api/endpoints/orders'
import { getErrorMessage } from '@/lib/api-error'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  code: z.string().min(1, 'Code is required').max(50),
  email: z.string().email('Invalid email').or(z.literal('')),
  phone: z.string(),
  contact_person: z.string(),
  address_line1: z.string(),
  address_line2: z.string(),
  city: z.string(),
  state: z.string(),
  postal_code: z.string(),
  country: z.string(),
  gst_number: z.string().max(15),
  is_active: z.boolean(),
  notes: z.string(),
})

type FormValues = z.infer<typeof formSchema>

interface CustomerFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
}

export default function CustomerFormSheet({ open, onOpenChange, customer }: CustomerFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!customer

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      email: '',
      phone: '',
      contact_person: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      gst_number: '',
      is_active: true,
      notes: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (customer) {
      form.reset({
        name: customer.name,
        code: customer.code,
        email: customer.email || '',
        phone: customer.phone || '',
        contact_person: customer.contact_person || '',
        address_line1: customer.address_line1 || '',
        address_line2: customer.address_line2 || '',
        city: customer.city || '',
        state: customer.state || '',
        postal_code: customer.postal_code || '',
        country: customer.country || 'India',
        gst_number: customer.gst_number || '',
        is_active: customer.is_active,
        notes: customer.notes || '',
      })
    } else {
      form.reset({
        name: '',
        code: '',
        email: '',
        phone: '',
        contact_person: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        gst_number: '',
        is_active: true,
        notes: '',
      })
    }
  }, [open, customer, form])

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => ordersApi.createCustomer({
      organization: 1, // TODO: Get from user context
      ...data,
    }),
    onSuccess: () => {
      toast.success('Customer created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['customers'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['customers-stats'], type: 'all' })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create customer', { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => ordersApi.updateCustomer(customer!.uuid, data),
    onSuccess: () => {
      toast.success('Customer updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['customers'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['customers-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update customer', { duration: 5000 })
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
          <SheetTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update the customer details below.' : 'Fill in the details to create a new customer.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="Acme Corp" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl><Input placeholder="ACME" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="contact@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="contact_person" render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="address_line1" render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 1</FormLabel>
                <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="address_line2" render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 2</FormLabel>
                <FormControl><Input placeholder="Suite 100" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl><Input placeholder="Mumbai" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl><Input placeholder="Maharashtra" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="postal_code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl><Input placeholder="400001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl><Input placeholder="India" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="gst_number" render={({ field }) => (
              <FormItem>
                <FormLabel>GST Number</FormLabel>
                <FormControl><Input placeholder="22AAAAA0000A1Z5" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                  <p className="text-sm text-muted-foreground">Whether this customer is active</p>
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

import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import membersApi from '@/api/endpoints/members'
import { getErrorMessage } from '@/lib/api-error'

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().max(150).optional().default(''),
  last_name: z.string().max(150).optional().default(''),
  membership_role: z.enum(['ADMIN', 'MEMBER']),
  user_role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']),
  personal_message: z.string().optional().default(''),
})

type FormValues = z.infer<typeof formSchema>

interface InviteMemberSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function InviteMemberSheet({ open, onOpenChange }: InviteMemberSheetProps) {
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      membership_role: 'MEMBER',
      user_role: 'VIEWER',
      personal_message: '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      email: '',
      first_name: '',
      last_name: '',
      membership_role: 'MEMBER',
      user_role: 'VIEWER',
      personal_message: '',
    })
  }, [open, form])

  const mutation = useMutation({
    mutationFn: (data: FormValues) => membersApi.createInvitation(data),
    onSuccess: () => {
      toast.success('Invitation sent successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['invitations'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['members-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to send invitation', { duration: 5000 })
    },
  })

  const onSubmit = (data: FormValues) => mutation.mutate(data)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Invite Team Member</SheetTitle>
          <SheetDescription>
            Send an invitation to join your organization
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="membership_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membership Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MEMBER">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="user_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permission Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="OPERATOR">Operator</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="personal_message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional message to include with the invitation..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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

import membersApi, { Member } from '@/api/endpoints/members'
import { getErrorMessage } from '@/lib/api-error'

const formSchema = z.object({
  membership_role: z.enum(['ADMIN', 'MEMBER']),
  user_role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']),
  notes: z.string().optional().default(''),
})

type FormValues = z.infer<typeof formSchema>

interface EditRoleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Member | null
}

export default function EditRoleSheet({ open, onOpenChange, member }: EditRoleSheetProps) {
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      membership_role: 'MEMBER',
      user_role: 'VIEWER',
      notes: '',
    },
  })

  useEffect(() => {
    if (!open || !member) return
    form.reset({
      membership_role: member.membership_role === 'OWNER' ? 'ADMIN' : member.membership_role as 'ADMIN' | 'MEMBER',
      user_role: member.user_role,
      notes: member.notes || '',
    })
  }, [open, member, form])

  const mutation = useMutation({
    mutationFn: (data: FormValues) => membersApi.updateMember(member!.id, data),
    onSuccess: () => {
      toast.success('Roles updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['members'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['members-stats'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['member-detail', member?.id], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update roles', { duration: 5000 })
    },
  })

  const onSubmit = (data: FormValues) => mutation.mutate(data)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Roles</SheetTitle>
          <SheetDescription>
            Update roles for {member?.user_full_name || member?.user_email}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
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
                      <SelectItem value="ADMIN">Admin — Can manage members and settings</SelectItem>
                      <SelectItem value="MEMBER">Member — Regular team member</SelectItem>
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
                      <SelectItem value="ADMIN">Admin — Full access to all features</SelectItem>
                      <SelectItem value="MANAGER">Manager — Create and edit resources</SelectItem>
                      <SelectItem value="OPERATOR">Operator — Execute operations</SelectItem>
                      <SelectItem value="VIEWER">Viewer — Read-only access</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Internal notes about this member..."
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
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

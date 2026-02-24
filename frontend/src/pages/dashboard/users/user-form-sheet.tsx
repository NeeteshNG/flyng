import { useEffect, useState } from 'react'
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
import { AvatarUpload } from '@/components/ui/avatar-upload'

import usersApi, { User } from '@/api/endpoints/users'

const userFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface UserFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

export default function UserFormSheet({
  open,
  onOpenChange,
  user,
}: UserFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!user
  const [profilePicture, setProfilePicture] = useState<File | null>(null)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      role: 'VIEWER',
    },
  })

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email,
        password: '',
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || '',
        role: user.role,
      })
      setProfilePicture(null)
    } else {
      form.reset({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'VIEWER',
      })
      setProfilePicture(null)
    }
  }, [user, form])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      // First create the user
      const response = await usersApi.createUser({
        email: data.email,
        password: data.password!,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        role: data.role,
      })

      // Then upload profile picture if provided
      if (profilePicture && response.data.data?.uuid) {
        await usersApi.updateProfilePicture(response.data.data.uuid, profilePicture)
      }

      return response
    },
    onSuccess: () => {
      toast.success('User created successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
      form.reset()
      setProfilePicture(null)
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Failed to create user')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      // First update user data
      await usersApi.updateUser(user!.uuid, {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        role: data.role,
      })

      // Then upload profile picture if changed
      if (profilePicture) {
        await usersApi.updateProfilePicture(user!.uuid, profilePicture)
      }
    },
    onSuccess: () => {
      toast.success('User updated successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
      setProfilePicture(null)
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Failed to update user')
    },
  })

  const onSubmit = (data: UserFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      if (!data.password) {
        form.setError('password', { message: 'Password is required for new users' })
        return
      }
      createMutation.mutate(data)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const getInitials = () => {
    const firstName = form.watch('first_name')
    const lastName = form.watch('last_name')
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) {
      return firstName[0].toUpperCase()
    }
    return 'U'
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit User' : 'Add New User'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the user details below.'
              : 'Fill in the details to create a new user.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Profile Picture */}
            <div className="flex justify-center pb-2">
              <AvatarUpload
                value={isEditing ? user?.profile_picture : null}
                onChange={setProfilePicture}
                fallback={getInitials()}
                disabled={isPending}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      disabled={isEditing}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Min 8 characters"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
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
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
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

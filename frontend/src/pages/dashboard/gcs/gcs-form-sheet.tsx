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
import { getErrorMessage } from '@/lib/api-error'
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

import warehousesApi, { GroundControlStation } from '@/api/endpoints/warehouses'

const gcsFormSchema = z.object({
  zone: z.number().min(1, 'Zone is required'),
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less'),
  description: z.string(),
  hardware_id: z.string().min(1, 'Hardware ID is required'),
  ip_address: z.string(),
  firmware_version: z.string(),
  max_drones: z.number().int().min(1, 'At least 1 drone required'),
  status: z.string(),
  is_active: z.boolean(),
})

type GCSFormValues = z.infer<typeof gcsFormSchema>

interface GCSFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gcs: GroundControlStation | null
}

const GCS_STATUSES = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'ERROR', label: 'Error' },
]

export default function GCSFormSheet({
  open,
  onOpenChange,
  gcs,
}: GCSFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!gcs

  // Fetch zones for dropdown
  const { data: zonesData } = useQuery({
    queryKey: ['zones-list'],
    queryFn: () => warehousesApi.getZones({ is_active: true, ordering: 'warehouse__name,name' }),
  })

  const zones = zonesData?.data?.results || []

  const form = useForm<GCSFormValues>({
    resolver: zodResolver(gcsFormSchema),
    defaultValues: {
      zone: 0,
      name: '',
      code: '',
      description: '',
      hardware_id: '',
      ip_address: '',
      firmware_version: '',
      max_drones: 4,
      status: 'OFFLINE',
      is_active: true,
    },
  })

  useEffect(() => {
    if (!open) return

    if (gcs) {
      form.reset({
        zone: gcs.zone,
        name: gcs.name,
        code: gcs.code,
        description: gcs.description || '',
        hardware_id: gcs.hardware_id,
        ip_address: gcs.ip_address || '',
        firmware_version: gcs.firmware_version || '',
        max_drones: gcs.max_drones,
        status: gcs.status,
        is_active: gcs.is_active,
      })
    } else {
      form.reset({
        zone: zones[0]?.id || 0,
        name: '',
        code: '',
        description: '',
        hardware_id: '',
        ip_address: '',
        firmware_version: '',
        max_drones: 4,
        status: 'OFFLINE',
        is_active: true,
      })
    }
  }, [open, gcs, form, zones])

  const createMutation = useMutation({
    mutationFn: (data: GCSFormValues) => {
      return warehousesApi.createGCS ? warehousesApi.createGCS(data) : Promise.reject('API not available')
    },
    onSuccess: () => {
      toast.success('GCS created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['gcs'] })
      queryClient.refetchQueries({ queryKey: ['gcs-stats'] })
      queryClient.refetchQueries({ queryKey: ['zones'] })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to create GCS'), { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: GCSFormValues) => {
      return warehousesApi.updateGCS ? warehousesApi.updateGCS(gcs!.uuid, data) : Promise.reject('API not available')
    },
    onSuccess: () => {
      toast.success('GCS updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['gcs'] })
      queryClient.refetchQueries({ queryKey: ['gcs-stats'] })
      queryClient.refetchQueries({ queryKey: ['zones'] })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to update GCS'), { duration: 5000 })
    },
  })

  const onSubmit = (data: GCSFormValues) => {
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
          <SheetTitle>{isEditing ? 'Edit GCS' : 'Add New GCS'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the ground control station details below.'
              : 'Fill in the details to create a new ground control station.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Zone Selection */}
            <FormField
              control={form.control}
              name="zone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zone</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select zone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id.toString()}>
                          {zone.name} ({zone.warehouse_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="GCS Alpha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="GCS-MUM-01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the GCS..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hardware Info */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">Hardware</h3>

              <FormField
                control={form.control}
                name="hardware_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hardware ID</FormLabel>
                    <FormControl>
                      <Input placeholder="HW-GCS-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ip_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IP Address</FormLabel>
                      <FormControl>
                        <Input placeholder="192.168.1.100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firmware_version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firmware Version</FormLabel>
                      <FormControl>
                        <Input placeholder="v2.1.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Capacity & Status */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">Configuration</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_drones"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Drones</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="4"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GCS_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Whether this GCS is enabled for operations
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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

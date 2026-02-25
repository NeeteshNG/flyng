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

import inventoryApi, { StorageLocation } from '@/api/endpoints/inventory'
import warehousesApi from '@/api/endpoints/warehouses'

const locationFormSchema = z.object({
  zone: z.number().min(1, 'Zone is required'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less'),
  aisle: z.string().min(1, 'Aisle is required').max(10, 'Aisle must be 10 characters or less'),
  rack: z.string().min(1, 'Rack is required').max(10, 'Rack must be 10 characters or less'),
  level: z.string().min(1, 'Level is required').max(10, 'Level must be 10 characters or less'),
  position: z.string().max(10, 'Position must be 10 characters or less'),
  location_type: z.string().min(1, 'Location type is required'),
  x_coordinate: z.string(),
  y_coordinate: z.string(),
  z_coordinate: z.string(),
  max_bins: z.number().int().min(1, 'At least 1 bin required'),
  is_accessible: z.boolean(),
  is_active: z.boolean(),
  notes: z.string(),
})

type LocationFormValues = z.infer<typeof locationFormSchema>

interface LocationFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location: StorageLocation | null
}

const LOCATION_TYPES = [
  { value: 'RACK', label: 'Rack' },
  { value: 'FLOOR', label: 'Floor' },
  { value: 'SHELF', label: 'Shelf' },
  { value: 'PALLET', label: 'Pallet' },
  { value: 'BIN_AREA', label: 'Bin Area' },
  { value: 'OTHER', label: 'Other' },
]

export default function LocationFormSheet({
  open,
  onOpenChange,
  location,
}: LocationFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!location

  // Fetch zones for dropdown
  const { data: zonesData } = useQuery({
    queryKey: ['zones-list'],
    queryFn: () => warehousesApi.getZones({ is_active: true, ordering: 'warehouse__name,name' }),
  })

  const zones = zonesData?.data?.results || []

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      zone: 0,
      code: '',
      aisle: '',
      rack: '',
      level: '',
      position: '',
      location_type: 'RACK',
      x_coordinate: '',
      y_coordinate: '',
      z_coordinate: '',
      max_bins: 1,
      is_accessible: true,
      is_active: true,
      notes: '',
    },
  })

  useEffect(() => {
    if (!open) return

    if (location) {
      form.reset({
        zone: location.zone,
        code: location.code,
        aisle: location.aisle,
        rack: location.rack,
        level: location.level,
        position: location.position || '',
        location_type: location.location_type,
        x_coordinate: location.x_coordinate || '',
        y_coordinate: location.y_coordinate || '',
        z_coordinate: location.z_coordinate || '',
        max_bins: location.max_bins,
        is_accessible: location.is_accessible,
        is_active: location.is_active,
        notes: location.notes || '',
      })
    } else {
      form.reset({
        zone: zones[0]?.id || 0,
        code: '',
        aisle: '',
        rack: '',
        level: '',
        position: '',
        location_type: 'RACK',
        x_coordinate: '',
        y_coordinate: '',
        z_coordinate: '',
        max_bins: 1,
        is_accessible: true,
        is_active: true,
        notes: '',
      })
    }
  }, [open, location, form, zones])

  const createMutation = useMutation({
    mutationFn: (data: LocationFormValues) => {
      return inventoryApi.createStorageLocation({
        ...data,
        x_coordinate: data.x_coordinate || undefined,
        y_coordinate: data.y_coordinate || undefined,
        z_coordinate: data.z_coordinate || undefined,
        notes: data.notes || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Location created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['storage-locations'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['storage-locations-stats'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['zones'] })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string; code?: string[]; errors?: Record<string, string[]> } } }
      // Handle different error formats from DRF
      const errorData = err.response?.data
      let errorMessage = 'Failed to create location'

      // Try to extract the most specific error message
      if (errorData?.errors?.code?.[0]) {
        // Field-specific error for 'code'
        errorMessage = errorData.errors.code[0]
      } else if (errorData?.errors?.non_field_errors?.[0]) {
        // Unique constraint or other non-field errors
        errorMessage = errorData.errors.non_field_errors[0]
      } else if (errorData?.code?.[0]) {
        // Direct code error array
        errorMessage = errorData.code[0]
      } else if (errorData?.message && errorData.message !== 'Validation error') {
        // Generic message (but not the unhelpful "Validation error")
        errorMessage = errorData.message
      } else if (errorData?.errors) {
        // Try to get first error from any field
        const firstErrorKey = Object.keys(errorData.errors)[0]
        if (firstErrorKey && errorData.errors[firstErrorKey]?.[0]) {
          errorMessage = `${firstErrorKey}: ${errorData.errors[firstErrorKey][0]}`
        }
      }

      toast.error(errorMessage, { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: LocationFormValues) => {
      return inventoryApi.updateStorageLocation(location!.uuid, {
        ...data,
        x_coordinate: data.x_coordinate || undefined,
        y_coordinate: data.y_coordinate || undefined,
        z_coordinate: data.z_coordinate || undefined,
        notes: data.notes || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Location updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['storage-locations'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['storage-locations-stats'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['zones'] })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Failed to update location', { duration: 5000 })
    },
  })

  const onSubmit = (data: LocationFormValues) => {
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
          <SheetTitle>{isEditing ? 'Edit Location' : 'Add New Location'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the storage location details below.'
              : 'Fill in the details to create a new storage location.'}
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

            {/* Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Code</FormLabel>
                  <FormControl>
                    <Input placeholder="A-01-03-02" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Fields */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="aisle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aisle</FormLabel>
                      <FormControl>
                        <Input placeholder="A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rack"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rack</FormLabel>
                      <FormControl>
                        <Input placeholder="01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <FormControl>
                        <Input placeholder="03" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="02" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Type and Capacity */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOCATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_bins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Bins</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Coordinates */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">3D Coordinates (Optional)</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="x_coordinate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>X (m)</FormLabel>
                      <FormControl>
                        <Input placeholder="0.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="y_coordinate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Y (m)</FormLabel>
                      <FormControl>
                        <Input placeholder="0.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="z_coordinate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Z (m)</FormLabel>
                      <FormControl>
                        <Input placeholder="0.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this location..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Toggles */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">Settings</h3>

              <FormField
                control={form.control}
                name="is_accessible"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Accessible</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Whether drones can access this location
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Whether this location is in use
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

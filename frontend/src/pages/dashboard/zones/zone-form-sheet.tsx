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

import warehousesApi, { WarehouseZone } from '@/api/endpoints/warehouses'

const zoneFormSchema = z.object({
  warehouse: z.number().min(1, 'Warehouse is required'),
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less'),
  description: z.string(),
  zone_type: z.string().min(1, 'Zone type is required'),
  floor_level: z.number().int(),
  area_sqft: z.string(),
  max_drones_allowed: z.number().int().min(0),
  priority: z.number().int().min(0),
  is_active: z.boolean(),
  is_no_fly_zone: z.boolean(),
})

type ZoneFormValues = z.infer<typeof zoneFormSchema>

interface ZoneFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zone: WarehouseZone | null
}

const ZONE_TYPES = [
  { value: 'STORAGE', label: 'Storage' },
  { value: 'PICKING', label: 'Picking' },
  { value: 'STAGING', label: 'Staging' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'RECEIVING', label: 'Receiving' },
  { value: 'OTHER', label: 'Other' },
]

export default function ZoneFormSheet({
  open,
  onOpenChange,
  zone,
}: ZoneFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!zone

  // Fetch warehouses for dropdown
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehousesApi.getWarehouses({ is_active: true, ordering: 'name' }),
  })

  const warehouses = warehousesData?.data?.results || []

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      warehouse: 0,
      name: '',
      code: '',
      description: '',
      zone_type: 'STORAGE',
      floor_level: 0,
      area_sqft: '',
      max_drones_allowed: 5,
      priority: 0,
      is_active: true,
      is_no_fly_zone: false,
    },
  })

  useEffect(() => {
    if (!open) return

    if (zone) {
      form.reset({
        warehouse: zone.warehouse,
        name: zone.name,
        code: zone.code,
        description: zone.description || '',
        zone_type: zone.zone_type,
        floor_level: zone.floor_level,
        area_sqft: zone.area_sqft || '',
        max_drones_allowed: zone.max_drones_allowed,
        priority: zone.priority,
        is_active: zone.is_active,
        is_no_fly_zone: zone.is_no_fly_zone,
      })
    } else {
      form.reset({
        warehouse: warehouses[0]?.id || 0,
        name: '',
        code: '',
        description: '',
        zone_type: 'STORAGE',
        floor_level: 0,
        area_sqft: '',
        max_drones_allowed: 5,
        priority: 0,
        is_active: true,
        is_no_fly_zone: false,
      })
    }
  }, [open, zone, form, warehouses])

  const createMutation = useMutation({
    mutationFn: (data: ZoneFormValues) =>
      warehousesApi.createZone({
        ...data,
        area_sqft: data.area_sqft || null,
      }),
    onSuccess: () => {
      toast.success('Zone created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['zones'] })
      queryClient.refetchQueries({ queryKey: ['zones-stats'] })
      queryClient.refetchQueries({ queryKey: ['warehouses'] })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to create zone'), { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ZoneFormValues) =>
      warehousesApi.updateZone(zone!.uuid, {
        ...data,
        area_sqft: data.area_sqft || null,
      }),
    onSuccess: () => {
      toast.success('Zone updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['zones'] })
      queryClient.refetchQueries({ queryKey: ['zones-stats'] })
      queryClient.refetchQueries({ queryKey: ['warehouses'] })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to update zone'), { duration: 5000 })
    },
  })

  const onSubmit = (data: ZoneFormValues) => {
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
          <SheetTitle>{isEditing ? 'Edit Zone' : 'Add New Zone'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the zone details below.'
              : 'Fill in the details to create a new zone.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Warehouse Selection */}
            <FormField
              control={form.control}
              name="warehouse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warehouse</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id.toString()}>
                          {wh.name} ({wh.code})
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
                      <Input placeholder="Storage Zone A" {...field} />
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
                      <Input placeholder="ZONE-A1" {...field} />
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
                      placeholder="Brief description of the zone..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Zone Type and Floor */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="zone_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ZONE_TYPES.map((type) => (
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
                name="floor_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor Level</FormLabel>
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
            </div>

            {/* Area and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="area_sqft"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (sq ft)</FormLabel>
                    <FormControl>
                      <Input placeholder="1000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_drones_allowed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Drones</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority (higher = more important)</FormLabel>
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

            {/* Status Toggles */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">Settings</h3>

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Whether this zone is operational
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
                name="is_no_fly_zone"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>No-Fly Zone</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Restrict drone operations in this zone
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

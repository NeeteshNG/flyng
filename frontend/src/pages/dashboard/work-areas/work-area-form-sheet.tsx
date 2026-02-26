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

import warehousesApi, { DroneWorkArea } from '@/api/endpoints/warehouses'

const workAreaFormSchema = z.object({
  ground_control_station: z.number().min(1, 'GCS is required'),
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less'),
  description: z.string(),
  area_type: z.string().min(1, 'Area type is required'),
  min_x: z.string(),
  max_x: z.string(),
  min_y: z.string(),
  max_y: z.string(),
  min_z: z.string(),
  max_z: z.string(),
  tether_length_m: z.string(),
  tether_anchor_x: z.string(),
  tether_anchor_y: z.string(),
  tether_anchor_z: z.string(),
  max_flight_speed_mps: z.string(),
  max_drones: z.number().int().min(1, 'At least 1 drone required'),
  is_active: z.boolean(),
})

type WorkAreaFormValues = z.infer<typeof workAreaFormSchema>

interface WorkAreaFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workArea: DroneWorkArea | null
}

const AREA_TYPES = [
  { value: 'TETHERED', label: 'Tethered' },
  { value: 'UNTETHERED', label: 'Untethered' },
]

export default function WorkAreaFormSheet({
  open,
  onOpenChange,
  workArea,
}: WorkAreaFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!workArea

  // Fetch GCS for dropdown
  const { data: gcsData } = useQuery({
    queryKey: ['gcs-list'],
    queryFn: () => warehousesApi.getGCS({ is_active: true, ordering: 'zone__warehouse__name,name' }),
  })

  const gcsList = gcsData?.data?.results || []

  const form = useForm<WorkAreaFormValues>({
    resolver: zodResolver(workAreaFormSchema),
    defaultValues: {
      ground_control_station: 0,
      name: '',
      code: '',
      description: '',
      area_type: 'UNTETHERED',
      min_x: '',
      max_x: '',
      min_y: '',
      max_y: '',
      min_z: '0',
      max_z: '10',
      tether_length_m: '',
      tether_anchor_x: '',
      tether_anchor_y: '',
      tether_anchor_z: '',
      max_flight_speed_mps: '2.0',
      max_drones: 2,
      is_active: true,
    },
  })

  const areaType = form.watch('area_type')

  useEffect(() => {
    if (!open) return

    if (workArea) {
      form.reset({
        ground_control_station: workArea.ground_control_station,
        name: workArea.name,
        code: workArea.code,
        description: workArea.description || '',
        area_type: workArea.area_type,
        min_x: workArea.min_x || '',
        max_x: workArea.max_x || '',
        min_y: workArea.min_y || '',
        max_y: workArea.max_y || '',
        min_z: workArea.min_z || '0',
        max_z: workArea.max_z || '10',
        tether_length_m: workArea.tether_length_m || '',
        tether_anchor_x: workArea.tether_anchor_x || '',
        tether_anchor_y: workArea.tether_anchor_y || '',
        tether_anchor_z: workArea.tether_anchor_z || '',
        max_flight_speed_mps: workArea.max_flight_speed_mps || '2.0',
        max_drones: workArea.max_drones,
        is_active: workArea.is_active,
      })
    } else {
      form.reset({
        ground_control_station: gcsList[0]?.id || 0,
        name: '',
        code: '',
        description: '',
        area_type: 'UNTETHERED',
        min_x: '',
        max_x: '',
        min_y: '',
        max_y: '',
        min_z: '0',
        max_z: '10',
        tether_length_m: '',
        tether_anchor_x: '',
        tether_anchor_y: '',
        tether_anchor_z: '',
        max_flight_speed_mps: '2.0',
        max_drones: 2,
        is_active: true,
      })
    }
  }, [open, workArea, form, gcsList])

  const createMutation = useMutation({
    mutationFn: (data: WorkAreaFormValues) => {
      return warehousesApi.createWorkArea ? warehousesApi.createWorkArea(data) : Promise.reject('API not available')
    },
    onSuccess: () => {
      toast.success('Work area created successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['work-areas'] })
      queryClient.refetchQueries({ queryKey: ['work-areas-stats'] })
      queryClient.refetchQueries({ queryKey: ['gcs'] })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to create work area'), { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: WorkAreaFormValues) => {
      return warehousesApi.updateWorkArea ? warehousesApi.updateWorkArea(workArea!.uuid, data) : Promise.reject('API not available')
    },
    onSuccess: () => {
      toast.success('Work area updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['work-areas'] })
      queryClient.refetchQueries({ queryKey: ['work-areas-stats'] })
      queryClient.refetchQueries({ queryKey: ['gcs'] })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to update work area'), { duration: 5000 })
    },
  })

  const onSubmit = (data: WorkAreaFormValues) => {
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
          <SheetTitle>{isEditing ? 'Edit Work Area' : 'Add New Work Area'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the work area details below.'
              : 'Fill in the details to create a new drone work area.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* GCS Selection */}
            <FormField
              control={form.control}
              name="ground_control_station"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ground Control Station</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select GCS" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gcsList.map((gcs) => (
                        <SelectItem key={gcs.id} value={gcs.id.toString()}>
                          {gcs.name} ({gcs.zone_name} - {gcs.warehouse_name})
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
                      <Input placeholder="Work Area 1" {...field} />
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
                      <Input placeholder="WA-MUM-01" {...field} />
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
                      placeholder="Brief description of the work area..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Area Type and Configuration */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">Configuration</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="area_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AREA_TYPES.map((type) => (
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
                  name="max_drones"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Drones</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="max_flight_speed_mps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Flight Speed (m/s)</FormLabel>
                    <FormControl>
                      <Input placeholder="2.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Z Bounds */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">Height Bounds (Z-axis)</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="min_z"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Z (m)</FormLabel>
                      <FormControl>
                        <Input placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_z"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Z (m)</FormLabel>
                      <FormControl>
                        <Input placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Tether Config - only for TETHERED type */}
            {areaType === 'TETHERED' && (
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-medium text-muted-foreground">Tether Configuration</h3>

                <FormField
                  control={form.control}
                  name="tether_length_m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tether Length (m)</FormLabel>
                      <FormControl>
                        <Input placeholder="15.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="tether_anchor_x"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anchor X</FormLabel>
                        <FormControl>
                          <Input placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tether_anchor_y"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anchor Y</FormLabel>
                        <FormControl>
                          <Input placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tether_anchor_z"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anchor Z</FormLabel>
                        <FormControl>
                          <Input placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Status Toggle */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Whether this work area is operational
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

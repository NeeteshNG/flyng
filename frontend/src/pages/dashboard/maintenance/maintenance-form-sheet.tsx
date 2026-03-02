import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'

import dronesApi, { Drone, DroneMaintenanceRecord } from '@/api/endpoints/drones'
import { getErrorMessage } from '@/lib/api-error'

interface MaintenanceFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: DroneMaintenanceRecord | null
}

const MAINTENANCE_TYPES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CORRECTIVE', label: 'Corrective' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'FIRMWARE_UPDATE', label: 'Firmware Update' },
  { value: 'CALIBRATION', label: 'Calibration' },
  { value: 'BATTERY_REPLACEMENT', label: 'Battery Replacement' },
  { value: 'MOTOR_REPLACEMENT', label: 'Motor Replacement' },
  { value: 'SENSOR_REPAIR', label: 'Sensor Repair' },
  { value: 'INSPECTION', label: 'Inspection' },
]

export default function MaintenanceFormSheet({ open, onOpenChange, record }: MaintenanceFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!record

  const [drone, setDrone] = useState<string>('')
  const [maintenanceType, setMaintenanceType] = useState('SCHEDULED')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [partsReplaced, setPartsReplaced] = useState('')
  const [cost, setCost] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')

  const { data: dronesData } = useQuery({
    queryKey: ['drones-filter-list'],
    queryFn: () => dronesApi.getDrones({ page_size: 500, is_active: true }),
  })
  const dronesList = dronesData?.data?.results || []

  useEffect(() => {
    if (open) {
      if (record) {
        setDrone(String(record.drone))
        setMaintenanceType(record.maintenance_type)
        setTitle(record.title)
        setDescription(record.description || '')
        setPartsReplaced(record.parts_replaced || '')
        setCost(record.cost || '')
        setScheduledAt(record.scheduled_at ? record.scheduled_at.slice(0, 16) : '')
        setNotes(record.notes || '')
      } else {
        setDrone('')
        setMaintenanceType('SCHEDULED')
        setTitle('')
        setDescription('')
        setPartsReplaced('')
        setCost('')
        setScheduledAt('')
        setNotes('')
      }
    }
  }, [open, record])

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof dronesApi.createMaintenanceRecord>[0]) =>
      isEditing
        ? dronesApi.updateMaintenanceRecord(record!.uuid, data)
        : dronesApi.createMaintenanceRecord(data),
    onSuccess: () => {
      toast.success(
        isEditing ? 'Record updated successfully' : 'Maintenance record created',
        { duration: 4000 }
      )
      queryClient.refetchQueries({ queryKey: ['maintenance'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['maintenance-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to save record', { duration: 5000 })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!drone) {
      toast.error('Please select a drone', { duration: 5000 })
      return
    }
    if (!title.trim()) {
      toast.error('Title is required', { duration: 5000 })
      return
    }

    mutation.mutate({
      drone: Number(drone),
      maintenance_type: maintenanceType,
      title: title.trim(),
      description: description.trim() || undefined,
      parts_replaced: partsReplaced.trim() || undefined,
      cost: cost || undefined,
      scheduled_at: scheduledAt || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Record' : 'New Maintenance Record'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update maintenance record details'
              : 'Log a new maintenance activity for a drone'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <Label htmlFor="drone">Drone *</Label>
            <Select value={drone} onValueChange={setDrone} disabled={isEditing}>
              <SelectTrigger id="drone">
                <SelectValue placeholder="Select drone" />
              </SelectTrigger>
              <SelectContent>
                {dronesList.map((d: Drone) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name} ({d.serial_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Maintenance Type *</Label>
              <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="scheduled">Scheduled At</Label>
              <Input
                id="scheduled"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Quarterly motor inspection"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of work performed..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="parts">Parts Replaced</Label>
            <Textarea
              id="parts"
              value={partsReplaced}
              onChange={(e) => setPartsReplaced(e.target.value)}
              placeholder="List of parts replaced..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="cost">Cost (INR)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g., 5000"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Record' : 'Create Record'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

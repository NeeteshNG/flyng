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

import logsApi, { DroneFlightLog } from '@/api/endpoints/logs'
import dronesApi from '@/api/endpoints/drones'
import warehousesApi from '@/api/endpoints/warehouses'
import { getErrorMessage } from '@/lib/api-error'

interface LogFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: DroneFlightLog | null
}

export default function LogFormSheet({ open, onOpenChange, log }: LogFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!log

  const [file, setFile] = useState<File | null>(null)
  const [warehouse, setWarehouse] = useState<string>('')
  const [drone, setDrone] = useState<string>('')
  const [flightDate, setFlightDate] = useState('')
  const [flightDuration, setFlightDuration] = useState('')
  const [flightDistance, setFlightDistance] = useState('')
  const [maxAltitude, setMaxAltitude] = useState('')
  const [maxSpeed, setMaxSpeed] = useState('')
  const [avgSpeed, setAvgSpeed] = useState('')
  const [startBattery, setStartBattery] = useState('')
  const [endBattery, setEndBattery] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehousesApi.getWarehouses({ page_size: 500, is_active: true }),
  })
  const warehouses = warehousesData?.data?.results || []

  const { data: dronesData } = useQuery({
    queryKey: ['drones-list'],
    queryFn: () => dronesApi.getDrones({ page_size: 500 }),
  })
  const drones = dronesData?.data?.results || []

  useEffect(() => {
    if (open) {
      if (log) {
        setFile(null)
        setWarehouse(log.warehouse ? String(log.warehouse) : '')
        setDrone(log.drone ? String(log.drone) : '')
        setFlightDate(log.flight_date || '')
        setFlightDuration(log.flight_duration_seconds ? String(log.flight_duration_seconds) : '')
        setFlightDistance(log.flight_distance_meters ? String(log.flight_distance_meters) : '')
        setMaxAltitude(log.max_altitude ? String(log.max_altitude) : '')
        setMaxSpeed(log.max_speed ? String(log.max_speed) : '')
        setAvgSpeed(log.avg_speed ? String(log.avg_speed) : '')
        setStartBattery(log.start_battery_percent ? String(log.start_battery_percent) : '')
        setEndBattery(log.end_battery_percent ? String(log.end_battery_percent) : '')
        setDescription(log.description || '')
        setNotes(log.notes || '')
      } else {
        setFile(null)
        setWarehouse('')
        setDrone('')
        setFlightDate('')
        setFlightDuration('')
        setFlightDistance('')
        setMaxAltitude('')
        setMaxSpeed('')
        setAvgSpeed('')
        setStartBattery('')
        setEndBattery('')
        setDescription('')
        setNotes('')
      }
    }
  }, [open, log])

  const createMutation = useMutation({
    mutationFn: (data: FormData) => logsApi.createFlightLog(data),
    onSuccess: () => {
      toast.success('Flight log uploaded successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['flight-logs'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['flight-logs-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to upload log'), { duration: 5000 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof logsApi.updateFlightLog>[1]) =>
      logsApi.updateFlightLog(log!.uuid, data),
    onSuccess: () => {
      toast.success('Flight log updated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['flight-logs'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['flight-logs-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to update log'), { duration: 5000 })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isEditing) {
      updateMutation.mutate({
        warehouse: warehouse ? Number(warehouse) : undefined,
        drone: drone ? Number(drone) : undefined,
        flight_date: flightDate || undefined,
        flight_duration_seconds: flightDuration ? Number(flightDuration) : undefined,
        flight_distance_meters: flightDistance ? Number(flightDistance) : undefined,
        max_altitude: maxAltitude ? Number(maxAltitude) : undefined,
        max_speed: maxSpeed ? Number(maxSpeed) : undefined,
        avg_speed: avgSpeed ? Number(avgSpeed) : undefined,
        start_battery_percent: startBattery ? Number(startBattery) : undefined,
        end_battery_percent: endBattery ? Number(endBattery) : undefined,
        description: description || undefined,
        notes: notes || undefined,
      })
    } else {
      if (!file) {
        toast.error('Please select a log file to upload', { duration: 5000 })
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('filename', file.name)
      formData.append('file_size_bytes', String(file.size))

      // Organization is required - derive from warehouse
      const selectedWarehouse = warehouses.find((w) => String(w.id) === warehouse)
      if (selectedWarehouse) {
        formData.append('organization', String(selectedWarehouse.organization))
        formData.append('warehouse', warehouse)
      }

      if (drone) formData.append('drone', drone)
      if (flightDate) formData.append('flight_date', flightDate)
      if (flightDuration) formData.append('flight_duration_seconds', flightDuration)
      if (flightDistance) formData.append('flight_distance_meters', flightDistance)
      if (maxAltitude) formData.append('max_altitude', maxAltitude)
      if (maxSpeed) formData.append('max_speed', maxSpeed)
      if (avgSpeed) formData.append('avg_speed', avgSpeed)
      if (startBattery) formData.append('start_battery_percent', startBattery)
      if (endBattery) formData.append('end_battery_percent', endBattery)
      if (description) formData.append('description', description)
      if (notes) formData.append('notes', notes)

      createMutation.mutate(formData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Flight Log' : 'Upload Flight Log'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update flight log metadata'
              : 'Upload a new drone flight log file'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {!isEditing && (
            <div>
              <Label htmlFor="file">Log File *</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".ulg,.ulog,.log,.csv"
              />
              {file && (
                <p className="text-xs text-muted-foreground mt-1">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="warehouse">Warehouse</Label>
              <Select value={warehouse} onValueChange={setWarehouse}>
                <SelectTrigger id="warehouse">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="drone">Drone</Label>
              <Select value={drone} onValueChange={setDrone}>
                <SelectTrigger id="drone">
                  <SelectValue placeholder="Select drone" />
                </SelectTrigger>
                <SelectContent>
                  {drones.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name} ({d.serial_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="flight_date">Flight Date</Label>
            <Input
              id="flight_date"
              type="date"
              value={flightDate}
              onChange={(e) => setFlightDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                step="0.1"
                value={flightDuration}
                onChange={(e) => setFlightDuration(e.target.value)}
                placeholder="e.g., 1200"
              />
            </div>
            <div>
              <Label htmlFor="distance">Distance (meters)</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                value={flightDistance}
                onChange={(e) => setFlightDistance(e.target.value)}
                placeholder="e.g., 5000"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="max_altitude">Max Altitude (m)</Label>
              <Input
                id="max_altitude"
                type="number"
                step="0.1"
                value={maxAltitude}
                onChange={(e) => setMaxAltitude(e.target.value)}
                placeholder="e.g., 50"
              />
            </div>
            <div>
              <Label htmlFor="max_speed">Max Speed (m/s)</Label>
              <Input
                id="max_speed"
                type="number"
                step="0.1"
                value={maxSpeed}
                onChange={(e) => setMaxSpeed(e.target.value)}
                placeholder="e.g., 15"
              />
            </div>
            <div>
              <Label htmlFor="avg_speed">Avg Speed (m/s)</Label>
              <Input
                id="avg_speed"
                type="number"
                step="0.1"
                value={avgSpeed}
                onChange={(e) => setAvgSpeed(e.target.value)}
                placeholder="e.g., 8"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_battery">Start Battery (%)</Label>
              <Input
                id="start_battery"
                type="number"
                min="0"
                max="100"
                value={startBattery}
                onChange={(e) => setStartBattery(e.target.value)}
                placeholder="e.g., 100"
              />
            </div>
            <div>
              <Label htmlFor="end_battery">End Battery (%)</Label>
              <Input
                id="end_battery"
                type="number"
                min="0"
                max="100"
                value={endBattery}
                onChange={(e) => setEndBattery(e.target.value)}
                placeholder="e.g., 45"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the flight..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Log' : 'Upload Log'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

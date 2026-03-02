import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'

import dronesApi, { Drone } from '@/api/endpoints/drones'
import warehousesApi from '@/api/endpoints/warehouses'
import { getErrorMessage } from '@/lib/api-error'

interface DroneFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drone: Drone | null
}

const DRONE_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'IN_FLIGHT', label: 'In Flight' },
  { value: 'CHARGING', label: 'Charging' },
  { value: 'IDLE', label: 'Idle' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'ERROR', label: 'Error' },
]

const AUTONOMY_MODES = [
  { value: '0', label: 'Manual' },
  { value: '1', label: 'Semi-Autonomous' },
  { value: '2', label: 'Autonomous' },
]

export default function DroneFormSheet({ open, onOpenChange, drone }: DroneFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!drone

  const [workArea, setWorkArea] = useState<string>('')
  const [serialNumber, setSerialNumber] = useState('')
  const [name, setName] = useState('')
  const [model, setModel] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [firmwareVersion, setFirmwareVersion] = useState('')
  const [hardwareVersion, setHardwareVersion] = useState('')
  const [status, setStatus] = useState('OFFLINE')
  const [autonomyMode, setAutonomyMode] = useState('0')
  const [homeX, setHomeX] = useState('')
  const [homeY, setHomeY] = useState('')
  const [homeZ, setHomeZ] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [maxPayloadKg, setMaxPayloadKg] = useState('')
  const [maxFlightTimeMin, setMaxFlightTimeMin] = useState('')

  const { data: workAreasData } = useQuery({
    queryKey: ['work-areas-list'],
    queryFn: () => warehousesApi.getWorkAreas({ page_size: 500, is_active: true }),
  })
  const workAreas = workAreasData?.data?.results || []

  useEffect(() => {
    if (open) {
      if (drone) {
        setWorkArea(String(drone.work_area))
        setSerialNumber(drone.serial_number)
        setName(drone.name)
        setModel(drone.model || '')
        setManufacturer(drone.manufacturer || '')
        setFirmwareVersion(drone.firmware_version || '')
        setHardwareVersion(drone.hardware_version || '')
        setStatus(drone.status)
        setAutonomyMode(String(drone.autonomy_mode))
        setHomeX(drone.home_x || '')
        setHomeY(drone.home_y || '')
        setHomeZ(drone.home_z || '')
        setIpAddress(drone.ip_address || '')
        setMaxPayloadKg(drone.max_payload_kg || '')
        setMaxFlightTimeMin(drone.max_flight_time_min ? String(drone.max_flight_time_min) : '')
      } else {
        setWorkArea('')
        setSerialNumber('')
        setName('')
        setModel('')
        setManufacturer('')
        setFirmwareVersion('')
        setHardwareVersion('')
        setStatus('OFFLINE')
        setAutonomyMode('0')
        setHomeX('')
        setHomeY('')
        setHomeZ('')
        setIpAddress('')
        setMaxPayloadKg('')
        setMaxFlightTimeMin('')
      }
    }
  }, [open, drone])

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof dronesApi.createDrone>[0]) =>
      isEditing ? dronesApi.updateDrone(drone!.uuid, data) : dronesApi.createDrone(data),
    onSuccess: () => {
      toast.success(
        isEditing ? 'Drone updated successfully' : 'Drone registered successfully',
        { duration: 4000 }
      )
      queryClient.refetchQueries({ queryKey: ['drones'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['drones-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to save drone', { duration: 5000 })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!workArea) {
      toast.error('Please select a work area', { duration: 5000 })
      return
    }
    if (!serialNumber.trim()) {
      toast.error('Serial number is required', { duration: 5000 })
      return
    }
    if (!name.trim()) {
      toast.error('Drone name is required', { duration: 5000 })
      return
    }

    mutation.mutate({
      work_area: Number(workArea),
      serial_number: serialNumber.trim(),
      name: name.trim(),
      model: model.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      firmware_version: firmwareVersion.trim() || undefined,
      hardware_version: hardwareVersion.trim() || undefined,
      status,
      autonomy_mode: Number(autonomyMode),
      home_x: homeX || undefined,
      home_y: homeY || undefined,
      home_z: homeZ || undefined,
      ip_address: ipAddress.trim() || undefined,
      max_payload_kg: maxPayloadKg || undefined,
      max_flight_time_min: maxFlightTimeMin ? Number(maxFlightTimeMin) : undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Drone' : 'Register Drone'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update drone configuration and settings'
              : 'Register a new drone in the system'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <Label htmlFor="work_area">Work Area *</Label>
            <Select value={workArea} onValueChange={setWorkArea}>
              <SelectTrigger id="work_area">
                <SelectValue placeholder="Select work area" />
              </SelectTrigger>
              <SelectContent>
                {workAreas.map((wa) => (
                  <SelectItem key={wa.id} value={String(wa.id)}>
                    {wa.name} ({wa.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Drone Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Alpha-01"
              />
            </div>
            <div>
              <Label htmlFor="serial">Serial Number *</Label>
              <Input
                id="serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g., DRN-2024-001"
                disabled={isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., X500"
              />
            </div>
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g., DJI"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firmware">Firmware Version</Label>
              <Input
                id="firmware"
                value={firmwareVersion}
                onChange={(e) => setFirmwareVersion(e.target.value)}
                placeholder="e.g., v2.1.0"
              />
            </div>
            <div>
              <Label htmlFor="hardware">Hardware Version</Label>
              <Input
                id="hardware"
                value={hardwareVersion}
                onChange={(e) => setHardwareVersion(e.target.value)}
                placeholder="e.g., rev3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRONE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="autonomy">Autonomy Mode</Label>
              <Select value={autonomyMode} onValueChange={setAutonomyMode}>
                <SelectTrigger id="autonomy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTONOMY_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payload">Max Payload (kg)</Label>
              <Input
                id="payload"
                type="number"
                step="0.01"
                value={maxPayloadKg}
                onChange={(e) => setMaxPayloadKg(e.target.value)}
                placeholder="e.g., 2.5"
              />
            </div>
            <div>
              <Label htmlFor="flight_time">Max Flight Time (min)</Label>
              <Input
                id="flight_time"
                type="number"
                value={maxFlightTimeMin}
                onChange={(e) => setMaxFlightTimeMin(e.target.value)}
                placeholder="e.g., 30"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ip">IP Address</Label>
            <Input
              id="ip"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="e.g., 192.168.1.100"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Home Position (optional)</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Input
                type="number"
                step="0.001"
                value={homeX}
                onChange={(e) => setHomeX(e.target.value)}
                placeholder="X"
              />
              <Input
                type="number"
                step="0.001"
                value={homeY}
                onChange={(e) => setHomeY(e.target.value)}
                placeholder="Y"
              />
              <Input
                type="number"
                step="0.001"
                value={homeZ}
                onChange={(e) => setHomeZ(e.target.value)}
                placeholder="Z"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Drone' : 'Register Drone'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

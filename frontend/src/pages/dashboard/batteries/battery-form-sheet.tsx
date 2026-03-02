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

import batteriesApi, { DroneBattery } from '@/api/endpoints/batteries'
import warehousesApi from '@/api/endpoints/warehouses'
import { getErrorMessage } from '@/lib/api-error'

interface BatteryFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  battery: DroneBattery | null
}

const BATTERY_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'IN_USE', label: 'In Use' },
  { value: 'CHARGING', label: 'Charging' },
  { value: 'LOW', label: 'Low' },
  { value: 'FAULTY', label: 'Faulty' },
  { value: 'RETIRED', label: 'Retired' },
]

const HEALTH_STATUSES = [
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
  { value: 'REPLACE', label: 'Replace' },
]

const CHEMISTRY_TYPES = [
  { value: 'LIPO', label: 'LiPo' },
  { value: 'LIION', label: 'Li-Ion' },
  { value: 'LIFEPO4', label: 'LiFePO4' },
  { value: 'NIMH', label: 'NiMH' },
]

export default function BatteryFormSheet({ open, onOpenChange, battery }: BatteryFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!battery

  const [warehouse, setWarehouse] = useState<string>('')
  const [serialNumber, setSerialNumber] = useState('')
  const [name, setName] = useState('')
  const [chemistry, setChemistry] = useState('LIPO')
  const [capacityMah, setCapacityMah] = useState('')
  const [voltageNominal, setVoltageNominal] = useState('')
  const [cellCount, setCellCount] = useState('4')
  const [status, setStatus] = useState('AVAILABLE')
  const [healthStatus, setHealthStatus] = useState('EXCELLENT')
  const [currentChargePercent, setCurrentChargePercent] = useState('100')
  const [maxCycles, setMaxCycles] = useState('500')
  const [manufacturer, setManufacturer] = useState('')
  const [modelNumber, setModelNumber] = useState('')
  const [notes, setNotes] = useState('')

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehousesApi.getWarehouses({ page_size: 500, is_active: true }),
  })
  const warehouses = warehousesData?.data?.results || []

  useEffect(() => {
    if (open) {
      if (battery) {
        setWarehouse(String(battery.warehouse))
        setSerialNumber(battery.serial_number)
        setName(battery.name)
        setChemistry(battery.chemistry)
        setCapacityMah(String(battery.capacity_mah))
        setVoltageNominal(battery.voltage_nominal)
        setCellCount(String(battery.cell_count))
        setStatus(battery.status)
        setHealthStatus(battery.health_status)
        setCurrentChargePercent(String(battery.current_charge_percent))
        setMaxCycles(String(battery.max_cycles))
        setManufacturer(battery.manufacturer || '')
        setModelNumber(battery.model_number || '')
        setNotes(battery.notes || '')
      } else {
        setWarehouse('')
        setSerialNumber('')
        setName('')
        setChemistry('LIPO')
        setCapacityMah('')
        setVoltageNominal('')
        setCellCount('4')
        setStatus('AVAILABLE')
        setHealthStatus('EXCELLENT')
        setCurrentChargePercent('100')
        setMaxCycles('500')
        setManufacturer('')
        setModelNumber('')
        setNotes('')
      }
    }
  }, [open, battery])

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof batteriesApi.createBattery>[0]) =>
      isEditing ? batteriesApi.updateBattery(battery!.uuid, data) : batteriesApi.createBattery(data),
    onSuccess: () => {
      toast.success(
        isEditing ? 'Battery updated successfully' : 'Battery added successfully',
        { duration: 4000 }
      )
      queryClient.refetchQueries({ queryKey: ['batteries'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['batteries-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to save battery', { duration: 5000 })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!warehouse) {
      toast.error('Please select a warehouse', { duration: 5000 })
      return
    }
    if (!serialNumber.trim()) {
      toast.error('Serial number is required', { duration: 5000 })
      return
    }
    if (!name.trim()) {
      toast.error('Battery name is required', { duration: 5000 })
      return
    }
    if (!capacityMah) {
      toast.error('Capacity is required', { duration: 5000 })
      return
    }
    if (!voltageNominal) {
      toast.error('Nominal voltage is required', { duration: 5000 })
      return
    }

    mutation.mutate({
      warehouse: Number(warehouse),
      serial_number: serialNumber.trim(),
      name: name.trim(),
      chemistry,
      capacity_mah: Number(capacityMah),
      voltage_nominal: voltageNominal,
      cell_count: Number(cellCount),
      status,
      health_status: healthStatus,
      current_charge_percent: Number(currentChargePercent),
      max_cycles: Number(maxCycles),
      manufacturer: manufacturer.trim() || undefined,
      model_number: modelNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Battery' : 'Add Battery'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update battery details and specifications'
              : 'Register a new battery in the system'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <Label htmlFor="warehouse">Warehouse *</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Battery Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., BAT-Alpha-01"
              />
            </div>
            <div>
              <Label htmlFor="serial">Serial Number *</Label>
              <Input
                id="serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g., BAT-2024-001"
                disabled={isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="chemistry">Chemistry</Label>
              <Select value={chemistry} onValueChange={setChemistry}>
                <SelectTrigger id="chemistry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHEMISTRY_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cells">Cell Count (S)</Label>
              <Input
                id="cells"
                type="number"
                min={1}
                max={12}
                value={cellCount}
                onChange={(e) => setCellCount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capacity">Capacity (mAh) *</Label>
              <Input
                id="capacity"
                type="number"
                min={1000}
                max={50000}
                value={capacityMah}
                onChange={(e) => setCapacityMah(e.target.value)}
                placeholder="e.g., 5200"
              />
            </div>
            <div>
              <Label htmlFor="voltage">Nominal Voltage (V) *</Label>
              <Input
                id="voltage"
                type="number"
                step="0.01"
                min={3}
                max={100}
                value={voltageNominal}
                onChange={(e) => setVoltageNominal(e.target.value)}
                placeholder="e.g., 14.8"
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
                  {BATTERY_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="health">Health Status</Label>
              <Select value={healthStatus} onValueChange={setHealthStatus}>
                <SelectTrigger id="health">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEALTH_STATUSES.map((h) => (
                    <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="charge">Current Charge (%)</Label>
              <Input
                id="charge"
                type="number"
                min={0}
                max={100}
                value={currentChargePercent}
                onChange={(e) => setCurrentChargePercent(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="maxCycles">Max Cycles</Label>
              <Input
                id="maxCycles"
                type="number"
                min={1}
                value={maxCycles}
                onChange={(e) => setMaxCycles(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g., Tattu"
              />
            </div>
            <div>
              <Label htmlFor="modelNum">Model Number</Label>
              <Input
                id="modelNum"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="e.g., R-Line 4S"
              />
            </div>
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
              {isEditing ? 'Update Battery' : 'Add Battery'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

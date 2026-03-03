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

import jobsApi, { DroneJob } from '@/api/endpoints/jobs'
import warehousesApi from '@/api/endpoints/warehouses'
import { getErrorMessage } from '@/lib/api-error'

interface JobFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: DroneJob | null
}

const JOB_TYPES = [
  { value: 'PICK', label: 'Pick' },
  { value: 'SCAN', label: 'Scan' },
  { value: 'COUNT', label: 'Count' },
  { value: 'MOVE', label: 'Move' },
  { value: 'RETURN_HOME', label: 'Return Home' },
]

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

export default function JobFormSheet({ open, onOpenChange, job }: JobFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!job

  const [jobNumber, setJobNumber] = useState('')
  const [warehouse, setWarehouse] = useState<string>('')
  const [jobType, setJobType] = useState('PICK')
  const [priority, setPriority] = useState('NORMAL')
  const [quantity, setQuantity] = useState('1')
  const [maxRetries, setMaxRetries] = useState('3')
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-filter-list'],
    queryFn: () => warehousesApi.getWarehouses({ page_size: 500, is_active: true }),
  })
  const warehousesList = warehousesData?.data?.results || []

  useEffect(() => {
    if (open) {
      if (job) {
        setJobNumber(job.job_number)
        setWarehouse(String(job.warehouse))
        setJobType(job.job_type)
        setPriority(job.priority)
        setQuantity(String(job.quantity))
        setMaxRetries(String(job.max_retries))
        setNotes(job.notes || '')
        setInternalNotes(job.internal_notes || '')
      } else {
        setJobNumber('')
        setWarehouse('')
        setJobType('PICK')
        setPriority('NORMAL')
        setQuantity('1')
        setMaxRetries('3')
        setNotes('')
        setInternalNotes('')
      }
    }
  }, [open, job])

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof jobsApi.createJob>[0]) =>
      isEditing
        ? jobsApi.updateJob(job!.uuid, data)
        : jobsApi.createJob(data),
    onSuccess: () => {
      toast.success(
        isEditing ? 'Job updated successfully' : 'Job created successfully',
        { duration: 4000 }
      )
      queryClient.refetchQueries({ queryKey: ['jobs'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['jobs-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to save job', { duration: 5000 })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!jobNumber.trim()) {
      toast.error('Job number is required', { duration: 5000 })
      return
    }
    if (!warehouse) {
      toast.error('Please select a warehouse', { duration: 5000 })
      return
    }

    const selectedWarehouse = warehousesList.find((w) => String(w.id) === warehouse)
    const organizationId = selectedWarehouse?.organization

    if (!organizationId) {
      toast.error('Could not determine organization from warehouse', { duration: 5000 })
      return
    }

    mutation.mutate({
      organization: organizationId,
      warehouse: Number(warehouse),
      job_number: jobNumber.trim(),
      job_type: jobType,
      priority,
      quantity: Number(quantity) || 1,
      max_retries: Number(maxRetries) || 3,
      notes: notes.trim() || undefined,
      internal_notes: internalNotes.trim() || undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Job' : 'Create Job'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update drone job details'
              : 'Create a new drone job for pick, scan, or move operations'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <Label htmlFor="jobNumber">Job Number *</Label>
            <Input
              id="jobNumber"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              placeholder="e.g., JOB-2024-001"
              disabled={isEditing}
            />
          </div>

          <div>
            <Label htmlFor="warehouse">Warehouse *</Label>
            <Select value={warehouse} onValueChange={setWarehouse} disabled={isEditing}>
              <SelectTrigger id="warehouse">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehousesList.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobType">Job Type *</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger id="jobType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="maxRetries">Max Retries</Label>
              <Input
                id="maxRetries"
                type="number"
                min="0"
                max="10"
                value={maxRetries}
                onChange={(e) => setMaxRetries(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Job instructions or notes..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="internalNotes">Internal Notes</Label>
            <Textarea
              id="internalNotes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Internal tracking notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Job' : 'Create Job'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

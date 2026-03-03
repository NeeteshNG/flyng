import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Switch } from '@/components/ui/switch'

import logsApi, { FlightGraphTemplate } from '@/api/endpoints/logs'
import { getErrorMessage } from '@/lib/api-error'

interface TemplateFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: FlightGraphTemplate | null
}

const GRAPH_TYPES = [
  { value: 'LINE', label: 'Line Chart' },
  { value: 'SCATTER', label: 'Scatter Plot' },
  { value: 'BAR', label: 'Bar Chart' },
  { value: 'AREA', label: 'Area Chart' },
  { value: 'HISTOGRAM', label: 'Histogram' },
  { value: 'HEATMAP', label: 'Heatmap' },
  { value: 'BOX', label: 'Box Plot' },
  { value: 'PATH_3D', label: '3D Flight Path' },
]

export default function TemplateFormSheet({ open, onOpenChange, template }: TemplateFormSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!template

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [graphType, setGraphType] = useState('LINE')
  const [xAxisField, setXAxisField] = useState('timestamp')
  const [yAxisField, setYAxisField] = useState('')
  const [zAxisField, setZAxisField] = useState('')
  const [xAxisLabel, setXAxisLabel] = useState('')
  const [yAxisLabel, setYAxisLabel] = useState('')
  const [zAxisLabel, setZAxisLabel] = useState('')
  const [displayOrder, setDisplayOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name)
        setDescription(template.description || '')
        setGraphType(template.graph_type)
        setXAxisField(template.x_axis_field)
        setYAxisField(template.y_axis_field)
        setZAxisField(template.z_axis_field || '')
        setXAxisLabel(template.x_axis_label || '')
        setYAxisLabel(template.y_axis_label || '')
        setZAxisLabel(template.z_axis_label || '')
        setDisplayOrder(String(template.display_order))
        setIsActive(template.is_active)
      } else {
        setName('')
        setDescription('')
        setGraphType('LINE')
        setXAxisField('timestamp')
        setYAxisField('')
        setZAxisField('')
        setXAxisLabel('')
        setYAxisLabel('')
        setZAxisLabel('')
        setDisplayOrder('0')
        setIsActive(true)
      }
    }
  }, [open, template])

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof logsApi.createGraphTemplate>[0]) =>
      isEditing
        ? logsApi.updateGraphTemplate(template!.uuid, data)
        : logsApi.createGraphTemplate(data),
    onSuccess: () => {
      toast.success(
        isEditing ? 'Template updated successfully' : 'Template created successfully',
        { duration: 4000 }
      )
      queryClient.refetchQueries({ queryKey: ['graph-templates'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['graph-templates-stats'], type: 'all' })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to save template'), { duration: 5000 })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Template name is required', { duration: 5000 })
      return
    }
    if (!yAxisField.trim()) {
      toast.error('Y-axis field is required', { duration: 5000 })
      return
    }

    mutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      graph_type: graphType,
      x_axis_field: xAxisField.trim(),
      y_axis_field: yAxisField.trim(),
      z_axis_field: zAxisField.trim() || undefined,
      x_axis_label: xAxisLabel.trim() || undefined,
      y_axis_label: yAxisLabel.trim() || undefined,
      z_axis_label: zAxisLabel.trim() || undefined,
      display_order: Number(displayOrder) || 0,
      is_active: isActive,
    })
  }

  const showZAxis = graphType === 'PATH_3D' || graphType === 'HEATMAP'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Template' : 'Create Template'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update graph template configuration'
              : 'Create a new graph template for flight data visualization'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Altitude Over Time"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this graph template..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="graph_type">Graph Type *</Label>
              <Select value={graphType} onValueChange={setGraphType}>
                <SelectTrigger id="graph_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRAPH_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Data Fields</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="x_field" className="text-xs text-muted-foreground">X-Axis Field *</Label>
                <Input
                  id="x_field"
                  value={xAxisField}
                  onChange={(e) => setXAxisField(e.target.value)}
                  placeholder="e.g., timestamp"
                />
              </div>
              <div>
                <Label htmlFor="y_field" className="text-xs text-muted-foreground">Y-Axis Field *</Label>
                <Input
                  id="y_field"
                  value={yAxisField}
                  onChange={(e) => setYAxisField(e.target.value)}
                  placeholder="e.g., altitude"
                />
              </div>
            </div>
            {showZAxis && (
              <div>
                <Label htmlFor="z_field" className="text-xs text-muted-foreground">Z-Axis Field</Label>
                <Input
                  id="z_field"
                  value={zAxisField}
                  onChange={(e) => setZAxisField(e.target.value)}
                  placeholder="e.g., depth"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Axis Labels (optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="x_label" className="text-xs text-muted-foreground">X-Axis Label</Label>
                <Input
                  id="x_label"
                  value={xAxisLabel}
                  onChange={(e) => setXAxisLabel(e.target.value)}
                  placeholder="e.g., Time (s)"
                />
              </div>
              <div>
                <Label htmlFor="y_label" className="text-xs text-muted-foreground">Y-Axis Label</Label>
                <Input
                  id="y_label"
                  value={yAxisLabel}
                  onChange={(e) => setYAxisLabel(e.target.value)}
                  placeholder="e.g., Altitude (m)"
                />
              </div>
            </div>
            {showZAxis && (
              <div>
                <Label htmlFor="z_label" className="text-xs text-muted-foreground">Z-Axis Label</Label>
                <Input
                  id="z_label"
                  value={zAxisLabel}
                  onChange={(e) => setZAxisLabel(e.target.value)}
                  placeholder="e.g., Depth (m)"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="is_active">Active</Label>
              <p className="text-xs text-muted-foreground">Template is available for graph generation</p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

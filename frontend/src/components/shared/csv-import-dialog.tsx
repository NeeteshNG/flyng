import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

import importsApi, { type ImportJob, type ImportType } from '@/api/endpoints/imports'
import warehousesApi from '@/api/endpoints/warehouses'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getErrorMessage } from '@/lib/api-error'

interface CSVImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  importType: ImportType
  requiresWarehouse?: boolean
  onSuccess?: () => void
}

export function CSVImportDialog({
  open,
  onOpenChange,
  importType,
  requiresWarehouse = false,
  onSuccess,
}: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [warehouseUuid, setWarehouseUuid] = useState<string>('')
  const [result, setResult] = useState<ImportJob | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setFile(null)
      setWarehouseUuid('')
      setResult(null)
      setDragOver(false)
    }
  }, [open])

  // Fetch warehouses if required
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehousesApi.getWarehouses({ is_active: true, ordering: 'name' }),
    enabled: open && requiresWarehouse,
  })
  const warehouses = warehousesData?.data?.results || []

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('No file selected')
      return importsApi.upload(file, importType, warehouseUuid || undefined)
    },
    onSuccess: (response) => {
      const job = response.data.data
      setResult(job)
      if (job.error_count === 0) {
        toast.success(
          `Imported ${job.success_count} rows successfully`,
          { duration: 4000 },
        )
      } else {
        toast.error(
          `Import completed with ${job.error_count} errors`,
          { duration: 5000 },
        )
      }
      onSuccess?.()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to upload CSV'), { duration: 5000 })
    },
  })

  // Template download
  const handleDownloadTemplate = useCallback(async () => {
    try {
      const response = await importsApi.downloadTemplate(importType)
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${importType.toLowerCase()}_template.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download template', { duration: 5000 })
    }
  }, [importType])

  // Error CSV download
  const handleDownloadErrors = useCallback(async () => {
    if (!result) return
    try {
      const response = await importsApi.downloadErrors(result.uuid)
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${result.uuid}_errors.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download error report', { duration: 5000 })
    }
  }, [result])

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.name.endsWith('.csv')) {
      setFile(dropped)
      setResult(null)
    } else {
      toast.error('Please drop a CSV file', { duration: 5000 })
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
    }
  }, [])

  const canUpload = file && (!requiresWarehouse || warehouseUuid)

  const importTypeLabels: Record<ImportType, string> = {
    ITEMS: 'Items',
    CATEGORIES: 'Categories',
    LOCATIONS: 'Locations',
    INVENTORY: 'Inventory Stock',
    ORDERS: 'Orders',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import {importTypeLabels[importType]}</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import data.{' '}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-primary underline hover:no-underline"
            >
              Download template
            </button>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warehouse selector */}
          {requiresWarehouse && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Warehouse</label>
              <Select value={warehouseUuid} onValueChange={setWarehouseUuid}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.uuid} value={wh.uuid}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* File drop zone */}
          {!result && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
            >
              {file ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileUp className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a CSV file, or{' '}
                    <label className="text-primary underline cursor-pointer hover:no-underline">
                      browse
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </p>
                </>
              )}
            </div>
          )}

          {/* Result summary */}
          {result && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                {result.error_count > 0 ? (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                <span className="font-medium">
                  {result.status === 'COMPLETED'
                    ? 'Import Complete'
                    : result.status === 'COMPLETED_WITH_ERRORS'
                      ? 'Completed with Errors'
                      : result.status === 'FAILED'
                        ? 'Import Failed'
                        : result.status}
                </span>
              </div>

              {result.error_message && (
                <p className="text-sm text-destructive">{result.error_message}</p>
              )}

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 rounded bg-green-50 dark:bg-green-950">
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {result.success_count}
                  </div>
                  <div className="text-muted-foreground text-xs">Success</div>
                </div>
                <div className="text-center p-2 rounded bg-red-50 dark:bg-red-950">
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    {result.error_count}
                  </div>
                  <div className="text-muted-foreground text-xs">Errors</div>
                </div>
                <div className="text-center p-2 rounded bg-gray-50 dark:bg-gray-900">
                  <div className="font-semibold text-muted-foreground">
                    {result.skipped_count}
                  </div>
                  <div className="text-muted-foreground text-xs">Skipped</div>
                </div>
              </div>

              {result.error_count > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleDownloadErrors}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Error Report
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={!canUpload || uploadMutation.isPending}
              >
                {uploadMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Upload & Import
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

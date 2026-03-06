import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import importsApi, { type ExportType } from '@/api/endpoints/imports'
import { Button } from '@/components/ui/button'

interface CSVExportButtonProps {
  exportType: ExportType
  params?: Record<string, string>
  label?: string
}

export function CSVExportButton({
  exportType,
  params,
  label = 'Export CSV',
}: CSVExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await importsApi.exportCSV(exportType, params)
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportType}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded', { duration: 4000 })
    } catch {
      toast.error('Failed to export data', { duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  )
}

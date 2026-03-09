import { useState } from 'react'
import {
  Braces,
  ChevronDown,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import importsApi, { type ExportFormat, type ExportType } from '@/api/endpoints/imports'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const FORMAT_OPTIONS: { format: ExportFormat; label: string; icon: typeof Download }[] = [
  { format: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { format: 'json', label: 'JSON', icon: Braces },
  { format: 'xml', label: 'XML', icon: FileCode },
  { format: 'pdf', label: 'PDF', icon: FileText },
]

interface ExportButtonProps {
  exportType: ExportType
  params?: Record<string, string>
}

export function ExportButton({ exportType, params }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async (format: ExportFormat) => {
    setLoading(true)
    try {
      const response = await importsApi.exportData(exportType, format, params)
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportType}.${format}`
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {FORMAT_OPTIONS.map(({ format, label, icon: Icon }) => (
          <DropdownMenuItem key={format} onClick={() => handleExport(format)}>
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

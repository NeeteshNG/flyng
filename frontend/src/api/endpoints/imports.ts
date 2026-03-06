import apiClient from '../client'

// Types
export interface ImportJob {
  uuid: string
  import_type: string
  status: string
  original_filename: string
  total_rows: number
  processed_rows: number
  success_count: number
  error_count: number
  skipped_count: number
  progress_percent: number
  error_summary: Array<{ row: number; error: string }>
  error_message: string
  has_errors: boolean
  duration_seconds: number | null
  created_by_email: string
  created_at: string
  completed_at: string | null
  started_at: string | null
  notes: string
}

export interface ImportJobListResponse {
  success: boolean
  data: ImportJob[]
}

export interface ImportJobDetailResponse {
  success: boolean
  data: ImportJob
}

export type ImportType = 'ITEMS' | 'LOCATIONS' | 'INVENTORY' | 'ORDERS' | 'CATEGORIES'

export type ExportType =
  | 'items' | 'locations' | 'stock' | 'orders' | 'categories'
  | 'warehouses' | 'zones' | 'ground-stations' | 'work-areas'
  | 'drones' | 'batteries' | 'bins' | 'jobs' | 'low-stock'

// API functions
const importsApi = {
  /** Upload a CSV file for import */
  upload: (file: File, importType: ImportType, warehouseUuid?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('import_type', importType)
    if (warehouseUuid) {
      formData.append('warehouse', warehouseUuid)
    }
    return apiClient.post<ImportJobDetailResponse>('/imports/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** List import jobs */
  list: (params?: { import_type?: string; status?: string }) =>
    apiClient.get<ImportJobListResponse>('/imports/', { params }),

  /** Get import job details */
  get: (uuid: string) =>
    apiClient.get<ImportJobDetailResponse>(`/imports/${uuid}/`),

  /** Download error CSV for an import job */
  downloadErrors: (uuid: string) =>
    apiClient.get(`/imports/${uuid}/errors/`, { responseType: 'blob' }),

  /** Download CSV template for an import type */
  downloadTemplate: (importType: ImportType) =>
    apiClient.get(`/imports/template/${importType}/`, { responseType: 'blob' }),

  /** Export data as CSV */
  exportCSV: (exportType: ExportType, params?: Record<string, string>) =>
    apiClient.get(`/exports/${exportType}/`, { params, responseType: 'blob' }),
}

export default importsApi

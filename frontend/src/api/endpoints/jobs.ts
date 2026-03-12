import apiClient from '../client'

// Types
export interface DroneJob {
  id: number
  uuid: string
  organization: number
  organization_name: string
  warehouse: number
  warehouse_name: string
  drone: number | null
  drone_name: string | null
  drone_serial: string | null
  order: number | null
  order_number: string | null
  order_line: number | null
  order_line_id: number | null
  job_number: string
  job_type: string
  job_type_display: string
  status: string
  status_display: string
  priority: string
  priority_display: string
  item: number | null
  item_name: string | null
  item_sku: string | null
  source_bin: number | null
  source_bin_code: string | null
  destination_bin: number | null
  destination_bin_code: string | null
  quantity: number
  picked_quantity: number
  queued_at: string | null
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  failed_at: string | null
  cancelled_at: string | null
  error_code: string
  error_message: string
  retry_count: number
  max_retries: number
  notes: string
  internal_notes: string
  is_active: boolean
  is_complete: boolean
  is_failed: boolean
  is_cancelled: boolean
  can_retry: boolean
  duration_seconds: number | null
  events_count: number
  created_at: string
  updated_at: string
}

export interface DroneJobEvent {
  id: number
  uuid: string
  job: number
  job_number: string
  drone: number | null
  drone_name: string | null
  event_type: string
  event_type_display: string
  description: string
  x_position: string | null
  y_position: string | null
  z_position: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface JobQueueStats {
  active_total: number
  new: number
  queued: number
  assigned: number
  in_progress: number
  completed: number
  failed: number
  cancelled: number
  paused: number
  priority: {
    urgent: number
    high: number
    normal: number
    low: number
  }
  completed_last_hour: number
  failed_last_hour: number
  avg_duration_seconds: number | null
  needs_attention: number
}

// List response types
interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

type JobListResponse = PaginatedResponse<DroneJob>
type JobEventListResponse = PaginatedResponse<DroneJobEvent>

const jobsApi = {
  // === Jobs ===

  getJobs: (params?: {
    page?: number
    page_size?: number
    search?: string
    organization?: number
    warehouse?: number
    drone?: number
    order?: number
    status?: string
    job_type?: string
    priority?: string
    is_active?: boolean
    created_after?: string
    created_before?: string
    ordering?: string
  }) => {
    return apiClient.get<JobListResponse>('/jobs/', { params })
  },

  getJob: (uuid: string) => {
    return apiClient.get<DroneJob>(`/jobs/${uuid}/`)
  },

  createJob: (data: {
    organization: number
    warehouse: number
    drone?: number
    order?: number
    order_line?: number
    job_number: string
    job_type?: string
    status?: string
    priority?: string
    source_bin?: number
    destination_bin?: number
    item?: number
    quantity?: number
    max_retries?: number
    notes?: string
    internal_notes?: string
  }) => {
    return apiClient.post<DroneJob>('/jobs/', data)
  },

  updateJob: (uuid: string, data: Partial<{
    organization: number
    warehouse: number
    drone: number
    order: number
    order_line: number
    job_number: string
    job_type: string
    status: string
    priority: string
    source_bin: number
    destination_bin: number
    item: number
    quantity: number
    picked_quantity: number
    max_retries: number
    notes: string
    internal_notes: string
  }>) => {
    return apiClient.patch<DroneJob>(`/jobs/${uuid}/`, data)
  },

  deleteJob: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(`/jobs/${uuid}/`)
  },

  // === State Transition Actions ===

  queueJob: (uuid: string) => {
    return apiClient.post<DroneJob>(`/jobs/${uuid}/queue/`)
  },

  assignJob: (uuid: string, droneId: number) => {
    return apiClient.post<DroneJob>(`/jobs/${uuid}/assign/`, { drone: droneId })
  },

  startJob: (uuid: string) => {
    return apiClient.post<DroneJob>(`/jobs/${uuid}/start/`)
  },

  completeJob: (uuid: string, pickedQuantity?: number) => {
    return apiClient.post<DroneJob>(`/jobs/${uuid}/complete/`, {
      picked_quantity: pickedQuantity,
    })
  },

  failJob: (uuid: string, errorCode?: string, errorMessage?: string) => {
    return apiClient.post<DroneJob>(`/jobs/${uuid}/fail/`, {
      error_code: errorCode,
      error_message: errorMessage,
    })
  },

  pauseJob: (uuid: string) => {
    return apiClient.post<DroneJob>(`/jobs/${uuid}/pause/`)
  },

  resumeJob: (uuid: string) => {
    return apiClient.post<DroneJob>(`/jobs/${uuid}/resume/`)
  },

  retryJob: (uuid: string) => {
    return apiClient.post<DroneJob>(`/jobs/${uuid}/retry/`)
  },

  // === Job Events ===

  getJobEvents: (uuid: string) => {
    return apiClient.get<DroneJobEvent[]>(`/jobs/${uuid}/events/`)
  },

  getAllJobEvents: (params?: {
    page?: number
    page_size?: number
    search?: string
    job?: number
    drone?: number
    event_type?: string
    created_after?: string
    created_before?: string
    ordering?: string
  }) => {
    return apiClient.get<JobEventListResponse>('/job-events/', { params })
  },

  getJobEvent: (uuid: string) => {
    return apiClient.get<DroneJobEvent>(`/job-events/${uuid}/`)
  },

  // === Next Job (GCS Integration) ===

  getNextJob: (params?: { warehouse?: number; drone?: number }) => {
    return apiClient.get<DroneJob>('/jobs/next/', { params })
  },

  // === Job Queue Live View ===

  getQueueStats: () => {
    return apiClient.get<JobQueueStats>('/jobs/queue-stats/')
  },
}

export default jobsApi

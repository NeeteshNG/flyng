import apiClient from '../client'

// Types
export interface DroneFlightLog {
  id: number
  uuid: string
  organization: number
  organization_name: string
  warehouse: number | null
  warehouse_name: string | null
  drone: number | null
  drone_name: string | null
  drone_serial: string | null
  file: string
  filename: string
  file_size_bytes: number
  file_size_display: string
  file_hash: string
  flight_date: string | null
  flight_duration_seconds: number | null
  duration_display: string
  flight_distance_meters: number | null
  distance_display: string
  start_latitude: number | null
  start_longitude: number | null
  start_altitude: number | null
  end_latitude: number | null
  end_longitude: number | null
  end_altitude: number | null
  max_altitude: number | null
  max_speed: number | null
  avg_speed: number | null
  start_battery_percent: number | null
  end_battery_percent: number | null
  battery_used_percent: number | null
  is_processed: boolean
  processed_at: string | null
  processing_error: string
  description: string
  notes: string
  uploaded_by: number | null
  uploaded_by_name: string | null
  graphs_count: number
  created_at: string
  updated_at: string
}

export interface FlightGraphTemplate {
  id: number
  uuid: string
  organization: number | null
  organization_name: string | null
  name: string
  description: string
  graph_type: string
  graph_type_display: string
  x_axis_field: string
  y_axis_field: string
  z_axis_field: string
  x_axis_label: string
  y_axis_label: string
  z_axis_label: string
  chart_config: Record<string, unknown>
  display_order: number
  is_active: boolean
  created_by: number | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export interface FlightLogGraph {
  id: number
  uuid: string
  log: number
  log_filename: string
  template: number
  template_name: string
  template_graph_type: string
  title: string
  display_title: string
  graph_data: Record<string, unknown>
  is_generated: boolean
  generated_at: string | null
  generation_error: string
  image: string | null
  created_at: string
  updated_at: string
}

export interface ExplorerData {
  log_uuid: string
  filename: string
  is_processed: boolean
  topic_metadata: Record<string, { columns: string[]; count: number }>
  topics: Record<string, Record<string, unknown>[]>
  columns: string[]
  summary: { total_points: number; topics_found: string[] }
}

// List response types
interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

type FlightLogListResponse = PaginatedResponse<DroneFlightLog>
type GraphTemplateListResponse = PaginatedResponse<FlightGraphTemplate>
type FlightLogGraphListResponse = PaginatedResponse<FlightLogGraph>

const logsApi = {
  // === Flight Logs ===

  getFlightLogs: (params?: {
    page?: number
    page_size?: number
    search?: string
    organization?: number
    warehouse?: number
    drone?: number
    is_processed?: boolean
    flight_date_after?: string
    flight_date_before?: string
    ordering?: string
  }) => {
    return apiClient.get<FlightLogListResponse>('/flight-logs/', { params })
  },

  getFlightLog: (uuid: string) => {
    return apiClient.get<DroneFlightLog>(`/flight-logs/${uuid}/`)
  },

  createFlightLog: (data: FormData) => {
    return apiClient.post<DroneFlightLog>('/flight-logs/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  updateFlightLog: (uuid: string, data: Partial<{
    warehouse: number
    drone: number
    flight_date: string
    flight_duration_seconds: number
    flight_distance_meters: number
    start_latitude: number
    start_longitude: number
    start_altitude: number
    end_latitude: number
    end_longitude: number
    end_altitude: number
    max_altitude: number
    max_speed: number
    avg_speed: number
    start_battery_percent: number
    end_battery_percent: number
    battery_used_percent: number
    description: string
    notes: string
  }>) => {
    return apiClient.patch<DroneFlightLog>(`/flight-logs/${uuid}/`, data)
  },

  deleteFlightLog: (uuid: string) => {
    return apiClient.delete(`/flight-logs/${uuid}/`)
  },

  processFlightLog: (uuid: string) => {
    return apiClient.post<{ success: boolean; data: DroneFlightLog }>(`/flight-logs/${uuid}/process/`)
  },

  getFlightLogGraphs: (uuid: string) => {
    return apiClient.get<FlightLogGraph[]>(`/flight-logs/${uuid}/graphs/`)
  },

  getExplorerData: (uuid: string) => {
    return apiClient.get<ExplorerData>(`/flight-logs/${uuid}/explorer-data/`)
  },

  // === Graph Templates ===

  getGraphTemplates: (params?: {
    page?: number
    page_size?: number
    search?: string
    organization?: number
    graph_type?: string
    is_active?: boolean
    is_system?: boolean
    ordering?: string
  }) => {
    return apiClient.get<GraphTemplateListResponse>('/graph-templates/', { params })
  },

  getGraphTemplate: (uuid: string) => {
    return apiClient.get<FlightGraphTemplate>(`/graph-templates/${uuid}/`)
  },

  createGraphTemplate: (data: {
    organization?: number | null
    name: string
    description?: string
    graph_type?: string
    x_axis_field?: string
    y_axis_field: string
    z_axis_field?: string
    x_axis_label?: string
    y_axis_label?: string
    z_axis_label?: string
    chart_config?: Record<string, unknown>
    display_order?: number
    is_active?: boolean
  }) => {
    return apiClient.post<FlightGraphTemplate>('/graph-templates/', data)
  },

  updateGraphTemplate: (uuid: string, data: Partial<{
    organization: number | null
    name: string
    description: string
    graph_type: string
    x_axis_field: string
    y_axis_field: string
    z_axis_field: string
    x_axis_label: string
    y_axis_label: string
    z_axis_label: string
    chart_config: Record<string, unknown>
    display_order: number
    is_active: boolean
  }>) => {
    return apiClient.patch<FlightGraphTemplate>(`/graph-templates/${uuid}/`, data)
  },

  deleteGraphTemplate: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(`/graph-templates/${uuid}/`)
  },

  // === Flight Log Graphs ===

  getFlightLogGraphsList: (params?: {
    page?: number
    page_size?: number
    search?: string
    log?: number
    template?: number
    is_generated?: boolean
    ordering?: string
  }) => {
    return apiClient.get<FlightLogGraphListResponse>('/flight-log-graphs/', { params })
  },

  getFlightLogGraph: (uuid: string) => {
    return apiClient.get<FlightLogGraph>(`/flight-log-graphs/${uuid}/`)
  },

  createFlightLogGraph: (data: {
    log: number
    template: number
    title?: string
  }) => {
    return apiClient.post<FlightLogGraph>('/flight-log-graphs/', data)
  },
}

export default logsApi

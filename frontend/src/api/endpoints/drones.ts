import apiClient from '../client'

// Types
export interface Drone {
  id: number
  uuid: string
  work_area: number
  work_area_name: string
  work_area_code: string
  gcs_name: string
  gcs_code?: string
  zone_name: string
  warehouse_name: string
  serial_number: string
  name: string
  model: string
  manufacturer: string
  firmware_version: string
  hardware_version?: string
  status: string
  status_display: string
  autonomy_mode: number
  autonomy_display: string
  current_battery: number | null
  battery_name: string | null
  home_x: string | null
  home_y: string | null
  home_z: string | null
  home_position: [number, number, number] | null
  ip_address: string | null
  last_heartbeat: string | null
  is_online?: boolean
  max_payload_kg: string | null
  max_flight_time_min: number | null
  total_flight_hours: string
  total_flights: number
  total_distance_km: string
  last_maintenance_at: string | null
  next_maintenance_due: string | null
  is_active: boolean
  maintenance_count: number
  created_at: string
  updated_at: string
}

export interface DroneTelemetryLog {
  id: number
  uuid: string
  drone: number
  drone_name: string
  drone_serial: string
  timestamp: string
  flight_mode: string
  flight_mode_display: string
  position_x: string | null
  position_y: string | null
  position_z: string | null
  position?: [number, number, number] | null
  velocity_x?: string | null
  velocity_y?: string | null
  velocity_z?: string | null
  velocity?: [number, number, number] | null
  roll?: string | null
  pitch?: string | null
  yaw?: string | null
  attitude?: [number, number, number] | null
  battery_voltage: string | null
  battery_percentage: number | null
  battery_current?: string | null
  ground_speed: string | null
  air_speed?: string | null
  temperature: string | null
  rssi: number | null
  sensor_data?: Record<string, unknown> | null
  created_at: string
}

export interface DroneMaintenanceRecord {
  id: number
  uuid: string
  drone: number
  drone_name: string
  drone_serial: string
  performed_by: number | null
  performed_by_name: string | null
  maintenance_type: string
  maintenance_type_display: string
  title: string
  description?: string
  parts_replaced?: string
  cost: string | null
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  downtime_minutes: number | null
  flight_hours_at_maintenance?: string | null
  flights_at_maintenance?: number | null
  notes?: string
  is_completed: boolean
  duration_minutes?: number | null
  created_at: string
}

// List response types
interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

type DroneListResponse = PaginatedResponse<Drone>
type TelemetryListResponse = PaginatedResponse<DroneTelemetryLog>
type MaintenanceListResponse = PaginatedResponse<DroneMaintenanceRecord>

const dronesApi = {
  // === Drones ===

  getDrones: (params?: {
    page?: number
    page_size?: number
    search?: string
    work_area?: number
    gcs?: number
    zone?: number
    warehouse?: number
    status?: string
    autonomy_mode?: number
    is_active?: boolean
    manufacturer?: string
    ordering?: string
  }) => {
    return apiClient.get<DroneListResponse>('/drones/', { params })
  },

  getDrone: (uuid: string) => {
    return apiClient.get<Drone>(`/drones/${uuid}/`)
  },

  createDrone: (data: {
    work_area: number
    serial_number: string
    name: string
    model?: string
    manufacturer?: string
    firmware_version?: string
    hardware_version?: string
    status?: string
    autonomy_mode?: number
    home_x?: string
    home_y?: string
    home_z?: string
    ip_address?: string
    max_payload_kg?: string
    max_flight_time_min?: number
    is_active?: boolean
  }) => {
    return apiClient.post<Drone>('/drones/', data)
  },

  updateDrone: (uuid: string, data: Partial<{
    work_area: number
    serial_number: string
    name: string
    model: string
    manufacturer: string
    firmware_version: string
    hardware_version: string
    status: string
    autonomy_mode: number
    home_x: string
    home_y: string
    home_z: string
    ip_address: string
    max_payload_kg: string
    max_flight_time_min: number
    is_active: boolean
  }>) => {
    return apiClient.patch<Drone>(`/drones/${uuid}/`, data)
  },

  deleteDrone: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(`/drones/${uuid}/`)
  },

  getDroneTelemetry: (uuid: string) => {
    return apiClient.get<DroneTelemetryLog[]>(`/drones/${uuid}/telemetry/`)
  },

  getDroneMaintenance: (uuid: string) => {
    return apiClient.get<DroneMaintenanceRecord[]>(`/drones/${uuid}/maintenance/`)
  },

  // === Telemetry Logs ===

  getTelemetryLogs: (params?: {
    page?: number
    page_size?: number
    search?: string
    drone?: number
    flight_mode?: string
    timestamp_after?: string
    timestamp_before?: string
    ordering?: string
  }) => {
    return apiClient.get<TelemetryListResponse>('/drone-telemetry/', { params })
  },

  getTelemetryLog: (uuid: string) => {
    return apiClient.get<DroneTelemetryLog>(`/drone-telemetry/${uuid}/`)
  },

  createTelemetryLog: (data: {
    drone: number
    timestamp: string
    flight_mode?: string
    position_x?: string
    position_y?: string
    position_z?: string
    velocity_x?: string
    velocity_y?: string
    velocity_z?: string
    roll?: string
    pitch?: string
    yaw?: string
    battery_voltage?: string
    battery_percentage?: number
    battery_current?: string
    ground_speed?: string
    air_speed?: string
    temperature?: string
    rssi?: number
    sensor_data?: Record<string, unknown>
  }) => {
    return apiClient.post<DroneTelemetryLog>('/drone-telemetry/', data)
  },

  // === Maintenance Records ===

  getMaintenanceRecords: (params?: {
    page?: number
    page_size?: number
    search?: string
    drone?: number
    maintenance_type?: string
    performed_by?: number
    is_completed?: boolean
    ordering?: string
  }) => {
    return apiClient.get<MaintenanceListResponse>('/drone-maintenance/', { params })
  },

  getMaintenanceRecord: (uuid: string) => {
    return apiClient.get<DroneMaintenanceRecord>(`/drone-maintenance/${uuid}/`)
  },

  createMaintenanceRecord: (data: {
    drone: number
    performed_by?: number
    maintenance_type: string
    title: string
    description?: string
    parts_replaced?: string
    cost?: string
    scheduled_at?: string
    started_at?: string
    completed_at?: string
    downtime_minutes?: number
    notes?: string
  }) => {
    return apiClient.post<DroneMaintenanceRecord>('/drone-maintenance/', data)
  },

  updateMaintenanceRecord: (uuid: string, data: Partial<{
    drone: number
    performed_by: number
    maintenance_type: string
    title: string
    description: string
    parts_replaced: string
    cost: string
    scheduled_at: string
    started_at: string
    completed_at: string
    downtime_minutes: number
    notes: string
  }>) => {
    return apiClient.patch<DroneMaintenanceRecord>(`/drone-maintenance/${uuid}/`, data)
  },

  completeMaintenanceRecord: (uuid: string) => {
    return apiClient.post<DroneMaintenanceRecord>(`/drone-maintenance/${uuid}/complete/`)
  },
}

export default dronesApi

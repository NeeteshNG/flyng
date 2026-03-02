import apiClient from '../client'

// Types
export interface DroneBattery {
  id: number
  uuid: string
  serial_number: string
  name: string
  warehouse: number
  warehouse_name: string
  chemistry: string
  chemistry_display: string
  capacity_mah: number
  current_capacity_mah: number | null
  voltage_nominal: string
  cell_count: number
  status: string
  status_display: string
  health_status: string
  health_display: string
  current_charge_percent: number
  cycle_count: number
  max_cycles: number
  health_percentage: number | null
  cycles_remaining: number
  is_low_charge: boolean
  needs_replacement: boolean
  purchase_date: string | null
  warranty_expires_at: string | null
  last_charged_at: string | null
  last_health_check_at: string | null
  manufacturer: string
  model_number: string
  notes?: string
  is_active: boolean
  charging_sessions_count: number
  swaps_count: number
  created_at: string
  updated_at: string
}

export interface BatteryChargingSession {
  id: number
  uuid: string
  battery: number
  battery_name: string
  battery_serial: string
  charger_id: string
  charger_location?: string
  started_at: string
  ended_at: string | null
  status: string
  status_display: string
  start_charge_percent: number
  end_charge_percent: number | null
  start_voltage?: string | null
  end_voltage?: string | null
  energy_consumed_wh?: string | null
  peak_charging_rate_amps?: string | null
  temperature_start_c?: string | null
  temperature_max_c?: string | null
  error_code?: string
  error_message?: string
  notes?: string
  duration_minutes: number | null
  charge_gained: number | null
  created_at: string
}

export interface BatterySwapRecord {
  id: number
  uuid: string
  drone: number
  drone_name: string
  drone_serial: string
  old_battery: number | null
  old_battery_name: string | null
  old_battery_serial: string | null
  new_battery: number
  new_battery_name: string
  new_battery_serial: string
  swapped_at: string
  swap_reason: string
  swap_reason_display: string
  performed_by: number | null
  performed_by_name: string | null
  old_battery_charge: number | null
  new_battery_charge: number
  location: string
  swap_duration_seconds: number | null
  notes?: string
  created_at: string
}

// List response types
interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

type BatteryListResponse = PaginatedResponse<DroneBattery>
type ChargingSessionListResponse = PaginatedResponse<BatteryChargingSession>
type SwapRecordListResponse = PaginatedResponse<BatterySwapRecord>

const batteriesApi = {
  // === Batteries ===

  getBatteries: (params?: {
    page?: number
    page_size?: number
    search?: string
    warehouse?: number
    status?: string
    health_status?: string
    chemistry?: string
    is_active?: boolean
    manufacturer?: string
    low_charge?: boolean
    needs_replacement?: boolean
    ordering?: string
  }) => {
    return apiClient.get<BatteryListResponse>('/batteries/', { params })
  },

  getBattery: (uuid: string) => {
    return apiClient.get<DroneBattery>(`/batteries/${uuid}/`)
  },

  createBattery: (data: {
    serial_number: string
    name: string
    warehouse: number
    chemistry?: string
    capacity_mah: number
    current_capacity_mah?: number
    voltage_nominal: string
    cell_count?: number
    status?: string
    health_status?: string
    current_charge_percent?: number
    cycle_count?: number
    max_cycles?: number
    purchase_date?: string
    warranty_expires_at?: string
    manufacturer?: string
    model_number?: string
    notes?: string
    is_active?: boolean
  }) => {
    return apiClient.post<DroneBattery>('/batteries/', data)
  },

  updateBattery: (uuid: string, data: Partial<{
    serial_number: string
    name: string
    warehouse: number
    chemistry: string
    capacity_mah: number
    current_capacity_mah: number
    voltage_nominal: string
    cell_count: number
    status: string
    health_status: string
    current_charge_percent: number
    cycle_count: number
    max_cycles: number
    purchase_date: string
    warranty_expires_at: string
    manufacturer: string
    model_number: string
    notes: string
    is_active: boolean
  }>) => {
    return apiClient.patch<DroneBattery>(`/batteries/${uuid}/`, data)
  },

  deleteBattery: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(`/batteries/${uuid}/`)
  },

  getBatteryChargingHistory: (uuid: string) => {
    return apiClient.get<BatteryChargingSession[]>(`/batteries/${uuid}/charging_history/`)
  },

  getBatterySwapHistory: (uuid: string) => {
    return apiClient.get<BatterySwapRecord[]>(`/batteries/${uuid}/swap_history/`)
  },

  // === Charging Sessions ===

  getChargingSessions: (params?: {
    page?: number
    page_size?: number
    search?: string
    battery?: number
    status?: string
    started_after?: string
    started_before?: string
    ordering?: string
  }) => {
    return apiClient.get<ChargingSessionListResponse>('/battery-charging-sessions/', { params })
  },

  getChargingSession: (uuid: string) => {
    return apiClient.get<BatteryChargingSession>(`/battery-charging-sessions/${uuid}/`)
  },

  createChargingSession: (data: {
    battery: number
    charger_id?: string
    charger_location?: string
    started_at: string
    ended_at?: string
    status?: string
    start_charge_percent: number
    end_charge_percent?: number
    start_voltage?: string
    end_voltage?: string
    energy_consumed_wh?: string
    peak_charging_rate_amps?: string
    temperature_start_c?: string
    temperature_max_c?: string
    notes?: string
  }) => {
    return apiClient.post<BatteryChargingSession>('/battery-charging-sessions/', data)
  },

  // === Swap Records ===

  getSwapRecords: (params?: {
    page?: number
    page_size?: number
    search?: string
    drone?: number
    old_battery?: number
    new_battery?: number
    swap_reason?: string
    swapped_after?: string
    swapped_before?: string
    ordering?: string
  }) => {
    return apiClient.get<SwapRecordListResponse>('/battery-swap-records/', { params })
  },

  getSwapRecord: (uuid: string) => {
    return apiClient.get<BatterySwapRecord>(`/battery-swap-records/${uuid}/`)
  },

  createSwapRecord: (data: {
    drone: number
    old_battery?: number
    new_battery: number
    swapped_at: string
    swap_reason?: string
    performed_by?: number
    old_battery_charge?: number
    new_battery_charge: number
    location?: string
    swap_duration_seconds?: number
    notes?: string
  }) => {
    return apiClient.post<BatterySwapRecord>('/battery-swap-records/', data)
  },
}

export default batteriesApi

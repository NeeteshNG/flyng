import apiClient from '../client'

// Types
export interface Warehouse {
  id: number
  uuid: string
  organization: number
  organization_name: string
  name: string
  code: string
  description: string
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  postal_code: string
  country: string
  full_address?: string
  latitude: string | null
  longitude: string | null
  coordinates?: [number, number] | null
  timezone: string
  is_active: boolean
  profile?: WarehouseProfile
  contacts?: WarehouseContact[]
  zone_count?: number
  contact_count?: number
  created_at: string
  updated_at: string
}

export interface WarehouseProfile {
  id: number
  uuid: string
  operating_hours_start: string | null
  operating_hours_end: string | null
  operates_24x7: boolean
  total_area_sqft: string | null
  ceiling_height_ft: string | null
  max_drone_capacity: number
  measurement_standard: string
  currency: string
  date_format: string
  language: string
  emergency_contact_number: string
  safety_clearance_height_ft: string
  max_flight_speed_mps: string
  enable_autonomous_ops: boolean
  enable_night_ops: boolean
}

export interface WarehouseContact {
  id: number
  uuid: string
  warehouse: number
  name: string
  designation: string
  email: string
  phone_primary: string
  phone_secondary: string
  is_primary: boolean
  is_emergency: boolean
  is_active: boolean
  notes: string
  created_at: string
  updated_at: string
}

export interface WarehouseZone {
  id: number
  uuid: string
  warehouse: number
  warehouse_name: string
  name: string
  code: string
  description: string
  zone_type: 'STORAGE' | 'PICKING' | 'STAGING' | 'SHIPPING' | 'RECEIVING' | 'OTHER'
  floor_level: number
  area_sqft: string | null
  min_x: string | null
  max_x: string | null
  min_y: string | null
  max_y: string | null
  bounds?: [number, number, number, number] | null
  max_drones_allowed: number
  priority: number
  is_active: boolean
  is_no_fly_zone: boolean
  gcs_count?: number
  created_at: string
  updated_at: string
}

export interface GroundControlStation {
  id: number
  uuid: string
  zone: number
  zone_name: string
  warehouse_name: string
  name: string
  code: string
  description: string
  x_position: string | null
  y_position: string | null
  z_position: string
  position?: [number, number, number] | null
  hardware_id: string
  ip_address: string | null
  firmware_version: string
  max_drones: number
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR'
  is_active: boolean
  last_heartbeat: string | null
  work_area_count?: number
  created_at: string
  updated_at: string
}

export interface DroneWorkArea {
  id: number
  uuid: string
  ground_control_station: number
  gcs_name: string
  zone_name: string
  warehouse_name: string
  name: string
  code: string
  description: string
  area_type: 'TETHERED' | 'UNTETHERED'
  min_x: string | null
  max_x: string | null
  min_y: string | null
  max_y: string | null
  min_z: string
  max_z: string
  bounds?: [number, number, number, number, number, number] | null
  tether_length_m: string | null
  tether_anchor_x: string | null
  tether_anchor_y: string | null
  tether_anchor_z: string | null
  tether_anchor?: [number, number, number] | null
  max_flight_speed_mps: string
  max_drones: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Request types
export interface WarehouseCreateRequest {
  organization: number
  name: string
  code: string
  description?: string
  address_line_1: string
  address_line_2?: string
  city: string
  state: string
  postal_code: string
  country?: string
  latitude?: string | null
  longitude?: string | null
  timezone?: string
  is_active?: boolean
}

export interface WarehouseUpdateRequest {
  name?: string
  code?: string
  description?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  latitude?: string | null
  longitude?: string | null
  timezone?: string
  is_active?: boolean
}

export interface WarehouseZoneCreateRequest {
  warehouse: number
  name: string
  code: string
  description?: string
  zone_type?: string
  floor_level?: number
  area_sqft?: string | null
  min_x?: string | null
  max_x?: string | null
  min_y?: string | null
  max_y?: string | null
  max_drones_allowed?: number
  priority?: number
  is_active?: boolean
  is_no_fly_zone?: boolean
}

// Response types
export interface WarehouseListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Warehouse[]
}

export interface ZoneListResponse {
  count: number
  next: string | null
  previous: string | null
  results: WarehouseZone[]
}

export interface GCSListResponse {
  count: number
  next: string | null
  previous: string | null
  results: GroundControlStation[]
}

export interface WorkAreaListResponse {
  count: number
  next: string | null
  previous: string | null
  results: DroneWorkArea[]
}

// API functions
const warehousesApi = {
  // Warehouses
  getWarehouses: (params?: {
    page?: number
    page_size?: number
    search?: string
    is_active?: boolean
    city?: string
    state?: string
    ordering?: string
  }) => {
    return apiClient.get<WarehouseListResponse>('/warehouses/', { params })
  },

  getWarehouse: (uuid: string) => {
    return apiClient.get<Warehouse>(`/warehouses/${uuid}/`)
  },

  createWarehouse: (data: WarehouseCreateRequest) => {
    return apiClient.post<{ success: boolean; message: string; data: Warehouse }>(
      '/warehouses/',
      data
    )
  },

  updateWarehouse: (uuid: string, data: WarehouseUpdateRequest) => {
    return apiClient.patch<{ success: boolean; message: string; data: Warehouse }>(
      `/warehouses/${uuid}/`,
      data
    )
  },

  deleteWarehouse: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/warehouses/${uuid}/`
    )
  },

  getWarehouseContacts: (uuid: string) => {
    return apiClient.get<{ success: boolean; data: WarehouseContact[] }>(
      `/warehouses/${uuid}/contacts/`
    )
  },

  getWarehouseZones: (uuid: string) => {
    return apiClient.get<{ success: boolean; data: WarehouseZone[] }>(
      `/warehouses/${uuid}/zones/`
    )
  },

  // Zones
  getZones: (params?: {
    page?: number
    page_size?: number
    search?: string
    warehouse?: number
    zone_type?: string
    is_active?: boolean
    ordering?: string
  }) => {
    return apiClient.get<ZoneListResponse>('/zones/', { params })
  },

  getZone: (uuid: string) => {
    return apiClient.get<WarehouseZone>(`/zones/${uuid}/`)
  },

  createZone: (data: WarehouseZoneCreateRequest) => {
    return apiClient.post<{ success: boolean; message: string; data: WarehouseZone }>(
      '/zones/',
      data
    )
  },

  updateZone: (uuid: string, data: Partial<WarehouseZoneCreateRequest>) => {
    return apiClient.patch<{ success: boolean; message: string; data: WarehouseZone }>(
      `/zones/${uuid}/`,
      data
    )
  },

  deleteZone: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/zones/${uuid}/`
    )
  },

  // Ground Control Stations
  getGCS: (params?: {
    page?: number
    page_size?: number
    search?: string
    zone?: number
    status?: string
    is_active?: boolean
    ordering?: string
  }) => {
    return apiClient.get<GCSListResponse>('/ground-control-stations/', { params })
  },

  getGCSDetail: (uuid: string) => {
    return apiClient.get<GroundControlStation>(`/ground-control-stations/${uuid}/`)
  },

  createGCS: (data: {
    zone: number
    name: string
    code: string
    description?: string
    hardware_id: string
    ip_address?: string
    firmware_version?: string
    max_drones?: number
    status?: string
    is_active?: boolean
  }) => {
    return apiClient.post<{ success: boolean; message: string; data: GroundControlStation }>(
      '/ground-control-stations/',
      data
    )
  },

  updateGCS: (uuid: string, data: Partial<{
    zone: number
    name: string
    code: string
    description: string
    hardware_id: string
    ip_address: string
    firmware_version: string
    max_drones: number
    status: string
    is_active: boolean
  }>) => {
    return apiClient.patch<{ success: boolean; message: string; data: GroundControlStation }>(
      `/ground-control-stations/${uuid}/`,
      data
    )
  },

  deleteGCS: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/ground-control-stations/${uuid}/`
    )
  },

  // Work Areas
  getWorkAreas: (params?: {
    page?: number
    page_size?: number
    search?: string
    ground_control_station?: number
    area_type?: string
    is_active?: boolean
    ordering?: string
  }) => {
    return apiClient.get<WorkAreaListResponse>('/work-areas/', { params })
  },

  getWorkAreaDetail: (uuid: string) => {
    return apiClient.get<DroneWorkArea>(`/work-areas/${uuid}/`)
  },

  createWorkArea: (data: {
    ground_control_station: number
    name: string
    code: string
    description?: string
    area_type?: string
    min_x?: string
    max_x?: string
    min_y?: string
    max_y?: string
    min_z?: string
    max_z?: string
    tether_length_m?: string
    tether_anchor_x?: string
    tether_anchor_y?: string
    tether_anchor_z?: string
    max_flight_speed_mps?: string
    max_drones?: number
    is_active?: boolean
  }) => {
    return apiClient.post<{ success: boolean; message: string; data: DroneWorkArea }>(
      '/work-areas/',
      data
    )
  },

  updateWorkArea: (uuid: string, data: Partial<{
    ground_control_station: number
    name: string
    code: string
    description: string
    area_type: string
    min_x: string
    max_x: string
    min_y: string
    max_y: string
    min_z: string
    max_z: string
    tether_length_m: string
    tether_anchor_x: string
    tether_anchor_y: string
    tether_anchor_z: string
    max_flight_speed_mps: string
    max_drones: number
    is_active: boolean
  }>) => {
    return apiClient.patch<{ success: boolean; message: string; data: DroneWorkArea }>(
      `/work-areas/${uuid}/`,
      data
    )
  },

  deleteWorkArea: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/work-areas/${uuid}/`
    )
  },
}

export default warehousesApi

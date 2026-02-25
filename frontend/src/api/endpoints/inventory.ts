import apiClient from '../client'

// Types
export interface StorageLocation {
  id: number
  uuid: string
  zone: number
  zone_name: string
  warehouse_name: string
  code: string
  aisle: string
  rack: string
  level: string
  position: string
  location_type: 'RACK' | 'FLOOR' | 'SHELF' | 'PALLET' | 'BIN_AREA' | 'OTHER'
  x_coordinate: string | null
  y_coordinate: string | null
  z_coordinate: string | null
  max_bins: number
  is_accessible: boolean
  is_full: boolean
  is_active: boolean
  notes: string
  bin_count: number
  full_address?: string
  created_at: string
  updated_at: string
}

// Response types
export interface StorageLocationListResponse {
  count: number
  next: string | null
  previous: string | null
  results: StorageLocation[]
}

// API functions
const inventoryApi = {
  // Storage Locations
  getStorageLocations: (params?: {
    page?: number
    page_size?: number
    search?: string
    zone?: number
    warehouse?: number
    location_type?: string
    aisle?: string
    is_active?: boolean
    is_accessible?: boolean
    is_full?: boolean
    ordering?: string
  }) => {
    return apiClient.get<StorageLocationListResponse>('/storage-locations/', { params })
  },

  getStorageLocation: (uuid: string) => {
    return apiClient.get<StorageLocation>(`/storage-locations/${uuid}/`)
  },

  createStorageLocation: (data: {
    zone: number
    code: string
    aisle: string
    rack: string
    level: string
    position?: string
    location_type?: string
    x_coordinate?: string
    y_coordinate?: string
    z_coordinate?: string
    max_bins?: number
    is_accessible?: boolean
    is_active?: boolean
    notes?: string
  }) => {
    return apiClient.post<{ success: boolean; message: string; data: StorageLocation }>(
      '/storage-locations/',
      data
    )
  },

  updateStorageLocation: (uuid: string, data: Partial<{
    zone: number
    code: string
    aisle: string
    rack: string
    level: string
    position: string
    location_type: string
    x_coordinate: string
    y_coordinate: string
    z_coordinate: string
    max_bins: number
    is_accessible: boolean
    is_active: boolean
    notes: string
  }>) => {
    return apiClient.patch<{ success: boolean; message: string; data: StorageLocation }>(
      `/storage-locations/${uuid}/`,
      data
    )
  },

  deleteStorageLocation: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/storage-locations/${uuid}/`
    )
  },
}

export default inventoryApi

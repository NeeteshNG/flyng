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

export interface StorageBin {
  id: number
  uuid: string
  location: number
  location_code: string
  location_full_address: string
  zone_name: string
  warehouse_name: string
  template: number
  template_name: string
  template_capacity?: string
  code: string
  label_value: string
  position_index: number
  current_weight_kg: string
  item_count: number
  is_full: boolean
  is_active: boolean
  notes: string
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

export interface StorageBinListResponse {
  count: number
  next: string | null
  previous: string | null
  results: StorageBin[]
}

export interface BinLabelType {
  id: number
  uuid: string
  organization: number
  name: string
  label_type: number
  label_type_display: string
  dictionary_size: string
  marker_size_mm: number
  config: Record<string, unknown>
  is_active: boolean
  template_count: number
  created_at: string
  updated_at: string
}

export interface BinLabelTypeListResponse {
  count: number
  next: string | null
  previous: string | null
  results: BinLabelType[]
}

export interface BinTemplate {
  id: number
  uuid: string
  organization: number
  label_type: number
  label_type_name: string
  label_type_display?: string
  coordinate_type_display?: string
  name: string
  description: string
  width: string
  height: string
  depth: string
  max_weight_kg: string
  coordinate_type: number
  config?: Record<string, unknown>
  is_active: boolean
  bin_count: number
  created_at: string
  updated_at: string
}

export interface BinTemplateListResponse {
  count: number
  next: string | null
  previous: string | null
  results: BinTemplate[]
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

  // Storage Bins
  getStorageBins: (params?: {
    page?: number
    page_size?: number
    search?: string
    location?: number
    zone?: number
    warehouse?: number
    template?: number
    is_active?: boolean
    is_full?: boolean
    ordering?: string
  }) => {
    return apiClient.get<StorageBinListResponse>('/storage-bins/', { params })
  },

  getStorageBin: (uuid: string) => {
    return apiClient.get<StorageBin>(`/storage-bins/${uuid}/`)
  },

  createStorageBin: (data: {
    location: number
    template: number
    code: string
    label_value?: string
    position_index?: number
    is_active?: boolean
    notes?: string
  }) => {
    return apiClient.post<{ success: boolean; message: string; data: StorageBin }>(
      '/storage-bins/',
      data
    )
  },

  updateStorageBin: (uuid: string, data: Partial<{
    location: number
    template: number
    code: string
    label_value: string
    position_index: number
    is_active: boolean
    notes: string
  }>) => {
    return apiClient.patch<{ success: boolean; message: string; data: StorageBin }>(
      `/storage-bins/${uuid}/`,
      data
    )
  },

  deleteStorageBin: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/storage-bins/${uuid}/`
    )
  },

  // Bin Templates
  getBinTemplates: (params?: {
    page?: number
    page_size?: number
    search?: string
    label_type?: number
    is_active?: boolean
    ordering?: string
  }) => {
    return apiClient.get<BinTemplateListResponse>('/bin-templates/', { params })
  },

  getBinTemplate: (uuid: string) => {
    return apiClient.get<BinTemplate>(`/bin-templates/${uuid}/`)
  },

  createBinTemplate: (data: {
    organization: number
    label_type: number
    name: string
    description?: string
    width: string
    height: string
    depth: string
    max_weight_kg: string
    coordinate_type?: number
    config?: Record<string, unknown>
    is_active?: boolean
  }) => {
    return apiClient.post<{ success: boolean; message: string; data: BinTemplate }>(
      '/bin-templates/',
      data
    )
  },

  updateBinTemplate: (uuid: string, data: Partial<{
    organization: number
    label_type: number
    name: string
    description: string
    width: string
    height: string
    depth: string
    max_weight_kg: string
    coordinate_type: number
    config: Record<string, unknown>
    is_active: boolean
  }>) => {
    return apiClient.patch<{ success: boolean; message: string; data: BinTemplate }>(
      `/bin-templates/${uuid}/`,
      data
    )
  },

  deleteBinTemplate: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/bin-templates/${uuid}/`
    )
  },

  // Label Types
  getLabelTypes: (params?: {
    page?: number
    page_size?: number
    search?: string
    label_type?: number
    is_active?: boolean
    ordering?: string
  }) => {
    return apiClient.get<BinLabelTypeListResponse>('/label-types/', { params })
  },

  getLabelType: (uuid: string) => {
    return apiClient.get<BinLabelType>(`/label-types/${uuid}/`)
  },

  createLabelType: (data: {
    organization: number
    name: string
    label_type: number
    dictionary_size?: string
    marker_size_mm?: number
    config?: Record<string, unknown>
    is_active?: boolean
  }) => {
    return apiClient.post<{ success: boolean; message: string; data: BinLabelType }>(
      '/label-types/',
      data
    )
  },

  updateLabelType: (uuid: string, data: Partial<{
    organization: number
    name: string
    label_type: number
    dictionary_size: string
    marker_size_mm: number
    config: Record<string, unknown>
    is_active: boolean
  }>) => {
    return apiClient.patch<{ success: boolean; message: string; data: BinLabelType }>(
      `/label-types/${uuid}/`,
      data
    )
  },

  deleteLabelType: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/label-types/${uuid}/`
    )
  },
}

export default inventoryApi

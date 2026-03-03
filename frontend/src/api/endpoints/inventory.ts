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

export interface ItemCategory {
  id: number
  uuid: string
  organization: number
  parent: number | null
  parent_name: string | null
  name: string
  code: string
  description: string
  level: number
  display_order: number
  is_active: boolean
  full_path?: string
  children_count: number
  item_count: number
  created_at: string
  updated_at: string
}

export interface ItemCategoryListResponse {
  count: number
  next: string | null
  previous: string | null
  results: ItemCategory[]
}

export interface InventoryItem {
  id: number
  uuid: string
  organization: number
  category: number | null
  category_name: string | null
  sku: string
  name: string
  description?: string
  barcode: string
  weight_kg: string | null
  length_cm: string | null
  width_cm: string | null
  height_cm: string | null
  unit_of_measure: string
  uom_display: string
  unit_price: string | null
  min_stock_level: number
  reorder_point: number
  reorder_quantity?: number
  is_active: boolean
  volume_cm3?: string | null
  total_stock: number | null
  created_at: string
  updated_at: string
}

export interface InventoryItemListResponse {
  count: number
  next: string | null
  previous: string | null
  results: InventoryItem[]
}

export interface InventoryStock {
  id: number
  uuid: string
  bin: number
  bin_code: string
  location_code: string
  warehouse_name?: string
  zone_name?: string
  item: number
  item_sku: string
  item_name: string
  quantity: number
  reserved_quantity: number
  available_quantity: number
  lot_number: string
  expiry_date: string | null
  manufacture_date?: string | null
  received_at?: string | null
  last_counted_at?: string | null
  is_expired: boolean
  total_weight_kg?: string | null
  notes?: string
  created_at: string
  updated_at: string
}

export interface InventoryStockListResponse {
  count: number
  next: string | null
  previous: string | null
  results: InventoryStock[]
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

  // Item Categories
  getItemCategories: (params?: {
    page?: number
    page_size?: number
    search?: string
    organization?: number
    parent?: number
    level?: number
    is_active?: boolean
    ordering?: string
  }) => {
    return apiClient.get<ItemCategoryListResponse>('/item-categories/', { params })
  },

  getItemCategory: (uuid: string) => {
    return apiClient.get<ItemCategory>(`/item-categories/${uuid}/`)
  },

  createItemCategory: (data: {
    organization: number
    parent?: number | null
    name: string
    code: string
    description?: string
    display_order?: number
    is_active?: boolean
  }) => {
    return apiClient.post<ItemCategory>('/item-categories/', data)
  },

  updateItemCategory: (uuid: string, data: Partial<{
    organization: number
    parent: number | null
    name: string
    code: string
    description: string
    display_order: number
    is_active: boolean
  }>) => {
    return apiClient.patch<ItemCategory>(`/item-categories/${uuid}/`, data)
  },

  deleteItemCategory: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/item-categories/${uuid}/`
    )
  },

  // Inventory Items
  getInventoryItems: (params?: {
    page?: number
    page_size?: number
    search?: string
    organization?: number
    category?: number
    unit_of_measure?: string
    is_active?: boolean
    low_stock?: boolean
    ordering?: string
  }) => {
    return apiClient.get<InventoryItemListResponse>('/items/', { params })
  },

  getItemStats: () => {
    return apiClient.get<{ total: number; active: number; low_stock: number; total_stock_qty: number }>('/items/stats/')
  },

  getInventoryItem: (uuid: string) => {
    return apiClient.get<InventoryItem>(`/items/${uuid}/`)
  },

  createInventoryItem: (data: {
    organization: number
    category?: number | null
    sku: string
    name: string
    description?: string
    barcode?: string
    weight_kg?: string
    length_cm?: string
    width_cm?: string
    height_cm?: string
    unit_of_measure?: string
    unit_price?: string
    min_stock_level?: number
    reorder_point?: number
    reorder_quantity?: number
    is_active?: boolean
  }) => {
    return apiClient.post<InventoryItem>('/items/', data)
  },

  updateInventoryItem: (uuid: string, data: Partial<{
    organization: number
    category: number | null
    sku: string
    name: string
    description: string
    barcode: string
    weight_kg: string
    length_cm: string
    width_cm: string
    height_cm: string
    unit_of_measure: string
    unit_price: string
    min_stock_level: number
    reorder_point: number
    reorder_quantity: number
    is_active: boolean
  }>) => {
    return apiClient.patch<InventoryItem>(`/items/${uuid}/`, data)
  },

  deleteInventoryItem: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/items/${uuid}/`
    )
  },

  // Inventory Stock
  getInventoryStock: (params?: {
    page?: number
    page_size?: number
    search?: string
    bin?: number
    item?: number
    location?: number
    zone?: number
    warehouse?: number
    lot_number?: string
    ordering?: string
  }) => {
    return apiClient.get<InventoryStockListResponse>('/stock/', { params })
  },

  getStockRecord: (uuid: string) => {
    return apiClient.get<InventoryStock>(`/stock/${uuid}/`)
  },

  createStockRecord: (data: {
    bin: number
    item: number
    quantity: number
    reserved_quantity?: number
    lot_number?: string
    expiry_date?: string | null
    manufacture_date?: string | null
    received_at?: string | null
    last_counted_at?: string | null
    notes?: string
  }) => {
    return apiClient.post<InventoryStock>('/stock/', data)
  },

  updateStockRecord: (uuid: string, data: Partial<{
    bin: number
    item: number
    quantity: number
    reserved_quantity: number
    lot_number: string
    expiry_date: string | null
    manufacture_date: string | null
    received_at: string | null
    last_counted_at: string | null
    notes: string
  }>) => {
    return apiClient.patch<InventoryStock>(`/stock/${uuid}/`, data)
  },

  deleteStockRecord: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/stock/${uuid}/`
    )
  },
}

export default inventoryApi

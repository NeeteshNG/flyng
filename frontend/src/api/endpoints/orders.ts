import apiClient from '../client'

// Types
export interface PickOrderLine {
  id: number
  order: number
  item: number
  item_sku: string
  item_name: string
  source_bin: number
  bin_code: string
  stock: number | null
  quantity: number
  picked_quantity: number
  line_number: number
  is_picked: boolean
  picked_at: string | null
  picked_by: number | null
  picked_by_name: string | null
  lot_number: string
  notes: string
  created_at: string
  updated_at: string
}

export interface PickOrder {
  id: number
  uuid: string
  organization: number
  warehouse: number
  warehouse_name: string
  batch: number | null
  batch_number: string | null
  order_number: string
  external_reference: string
  status: string
  status_display: string
  priority: string
  priority_display: string
  customer_name: string
  customer_code: string
  shipping_address_line1?: string
  shipping_address_line2?: string
  shipping_city?: string
  shipping_state?: string
  shipping_postal_code?: string
  shipping_country?: string
  shipping_address?: string
  order_date: string
  due_date: string | null
  confirmed_at: string | null
  picking_started_at: string | null
  picking_completed_at: string | null
  packed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  assigned_to: number | null
  assigned_to_name: string | null
  assigned_at: string | null
  created_by: number | null
  created_by_name: string | null
  cancellation_reason?: string
  total_lines: number
  picked_lines: number
  pending_lines: number
  total_items: number | null
  picked_items: number | null
  is_overdue: boolean
  notes: string
  internal_notes?: string
  lines?: PickOrderLine[]
  created_at: string
  updated_at: string
}

export interface PickOrderBatch {
  id: number
  uuid: string
  organization: number
  warehouse: number
  warehouse_name: string
  batch_number: string
  name: string
  description: string
  is_completed: boolean
  completed_at: string | null
  assigned_to: number | null
  assigned_to_name: string | null
  created_by: number | null
  created_by_name: string | null
  order_count: number
  notes: string
  created_at: string
  updated_at: string
}

export interface PickOrderListResponse {
  count: number
  next: string | null
  previous: string | null
  results: PickOrder[]
}

export interface PickOrderLineListResponse {
  count: number
  next: string | null
  previous: string | null
  results: PickOrderLine[]
}

export interface PickOrderBatchListResponse {
  count: number
  next: string | null
  previous: string | null
  results: PickOrderBatch[]
}

// API functions
const ordersApi = {
  // Pick Orders
  getOrders: (params?: {
    page?: number
    page_size?: number
    search?: string
    organization?: number
    warehouse?: number
    batch?: number
    status?: string
    priority?: string
    assigned_to?: number
    created_by?: number
    order_date_from?: string
    order_date_to?: string
    due_date_from?: string
    due_date_to?: string
    ordering?: string
  }) => {
    return apiClient.get<PickOrderListResponse>('/orders/', { params })
  },

  getOrder: (uuid: string) => {
    return apiClient.get<PickOrder>(`/orders/${uuid}/`)
  },

  createOrder: (data: {
    organization: number
    warehouse: number
    batch?: number | null
    order_number?: string
    external_reference?: string
    priority?: string
    customer_name?: string
    customer_code?: string
    shipping_address_line1?: string
    shipping_address_line2?: string
    shipping_city?: string
    shipping_state?: string
    shipping_postal_code?: string
    shipping_country?: string
    order_date?: string
    due_date?: string | null
    assigned_to?: number | null
    notes?: string
    internal_notes?: string
    lines?: {
      item: number
      source_bin: number
      stock?: number | null
      quantity: number
      lot_number?: string
      notes?: string
    }[]
  }) => {
    return apiClient.post<PickOrder>('/orders/', data)
  },

  updateOrder: (uuid: string, data: Partial<{
    organization: number
    warehouse: number
    batch: number | null
    external_reference: string
    priority: string
    customer_name: string
    customer_code: string
    shipping_address_line1: string
    shipping_address_line2: string
    shipping_city: string
    shipping_state: string
    shipping_postal_code: string
    shipping_country: string
    order_date: string
    due_date: string | null
    assigned_to: number | null
    notes: string
    internal_notes: string
  }>) => {
    return apiClient.patch<PickOrder>(`/orders/${uuid}/`, data)
  },

  deleteOrder: (uuid: string, reason?: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/orders/${uuid}/`,
      { data: { reason } }
    )
  },

  // Order state transitions
  confirmOrder: (uuid: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/orders/${uuid}/confirm/`
    )
  },

  startPicking: (uuid: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/orders/${uuid}/start-picking/`
    )
  },

  completePicking: (uuid: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/orders/${uuid}/complete-picking/`
    )
  },

  packOrder: (uuid: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/orders/${uuid}/pack/`
    )
  },

  shipOrder: (uuid: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/orders/${uuid}/ship/`
    )
  },

  deliverOrder: (uuid: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/orders/${uuid}/deliver/`
    )
  },

  holdOrder: (uuid: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/orders/${uuid}/hold/`
    )
  },

  // Order Lines
  getOrderLines: (params?: {
    page?: number
    page_size?: number
    search?: string
    order?: number
    item?: number
    source_bin?: number
    is_picked?: boolean
    ordering?: string
  }) => {
    return apiClient.get<PickOrderLineListResponse>('/order-lines/', { params })
  },

  createOrderLine: (data: {
    order: number
    item: number
    source_bin: number
    stock?: number | null
    quantity: number
    line_number?: number
    lot_number?: string
    notes?: string
  }) => {
    return apiClient.post<PickOrderLine>('/order-lines/', data)
  },

  updateOrderLine: (id: number, data: Partial<{
    item: number
    source_bin: number
    stock: number | null
    quantity: number
    picked_quantity: number
    line_number: number
    lot_number: string
    notes: string
  }>) => {
    return apiClient.patch<PickOrderLine>(`/order-lines/${id}/`, data)
  },

  deleteOrderLine: (id: number) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/order-lines/${id}/`
    )
  },

  pickLine: (id: number, data: { quantity: number; notes?: string }) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/order-lines/${id}/pick/`,
      data
    )
  },

  // Order Batches
  getBatches: (params?: {
    page?: number
    page_size?: number
    search?: string
    organization?: number
    warehouse?: number
    is_completed?: boolean
    assigned_to?: number
    ordering?: string
  }) => {
    return apiClient.get<PickOrderBatchListResponse>('/order-batches/', { params })
  },

  getBatch: (uuid: string) => {
    return apiClient.get<PickOrderBatch>(`/order-batches/${uuid}/`)
  },

  createBatch: (data: {
    organization: number
    warehouse: number
    batch_number?: string
    name?: string
    description?: string
    assigned_to?: number | null
    notes?: string
  }) => {
    return apiClient.post<PickOrderBatch>('/order-batches/', data)
  },

  updateBatch: (uuid: string, data: Partial<{
    name: string
    description: string
    assigned_to: number | null
    notes: string
  }>) => {
    return apiClient.patch<PickOrderBatch>(`/order-batches/${uuid}/`, data)
  },

  deleteBatch: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/order-batches/${uuid}/`
    )
  },

  completeBatch: (uuid: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/order-batches/${uuid}/complete/`
    )
  },
}

export default ordersApi

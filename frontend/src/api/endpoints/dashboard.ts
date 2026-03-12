import apiClient from '../client'

// =============================================================================
// Types
// =============================================================================

export interface DashboardStats {
  drones: {
    total: number
    by_status: Record<string, number>
    in_flight: number
    available: number
  }
  warehouses: {
    total: number
  }
  batteries: {
    total: number
    by_status: Record<string, number>
  }
  items: {
    total: number
    total_stock_qty: number
    low_stock_count: number
  }
  orders: {
    total: number
    by_status: Record<string, number>
    today: number
    in_progress: number
  }
  jobs: {
    total: number
    by_status: Record<string, number>
    completed: number
  }
  recent_jobs: {
    id: number
    job_number: string
    status: string
    status_display: string
    drone_name: string | null
    source_bin_code: string | null
    destination_bin_code: string | null
    created_at: string
  }[]
  order_activity: {
    date: string
    count: number
  }[]
}

export interface AnalyticsData {
  meta: {
    date_from: string
    date_to: string
  }
  activity: {
    date: string
    orders: number
    jobs: number
  }[]
  distributions: {
    drones: { name: string; value: number }[]
    orders: { name: string; value: number }[]
    jobs: { name: string; value: number }[]
    batteries: { name: string; value: number }[]
    battery_health: { name: string; value: number }[]
  }
  inventory: {
    total_items: number
    in_stock: number
    low_stock: number
    out_of_stock: number
  }
}

export interface KpiValue {
  value: number
  change_percent: number
  trend: 'up' | 'down' | 'stable'
}

export interface DateRangeParams {
  range?: string
  date_from?: string
  date_to?: string
}

export interface OrderAnalytics {
  meta: { date_from: string; date_to: string }
  kpis: {
    total_orders: KpiValue
    fulfillment_rate: KpiValue
    avg_cycle_time_hours: KpiValue
    overdue_count: KpiValue
    picking_accuracy: KpiValue
  }
  orders_over_time: {
    period: string
    total: number
    completed: number
    cancelled: number
  }[]
  orders_by_priority: { name: string; value: number }[]
  orders_by_status: { name: string; value: number }[]
  top_picked_items: { name: string; sku: string; quantity: number }[]
  top_pick_locations: { bin_code: string; aisle: string; picks: number; quantity: number }[]
  top_drop_locations: { bin_code: string; aisle: string; drops: number; quantity: number }[]
}

export interface FleetAnalytics {
  meta: { date_from: string; date_to: string }
  kpis: {
    fleet_utilization: KpiValue
    job_success_rate: KpiValue
    avg_job_duration_minutes: KpiValue
    battery_avg_charge: KpiValue
    batteries_needing_replacement: KpiValue
    total_flight_hours: KpiValue
    avg_speed: KpiValue
    avg_altitude: KpiValue
  }
  jobs_over_time: {
    period: string
    completed: number
    failed: number
    cancelled: number
  }[]
  jobs_by_type: { name: string; value: number }[]
  drone_status: { name: string; value: number }[]
  battery_health: { name: string; value: number }[]
  battery_status: { name: string; value: number }[]
  drone_telemetry: {
    name: string
    serial: string
    entries: number
    avg_speed: number
    avg_altitude: number
    avg_battery: number
  }[]
}

export interface InventoryAnalytics {
  kpis: {
    total_skus: KpiValue
    low_stock_count: KpiValue
    below_reorder_count: KpiValue
    expiring_soon_count: KpiValue
    storage_utilization: KpiValue
  }
  stock_by_category: { name: string; value: number }[]
  inventory_summary: {
    total_items: number
    in_stock: number
    low_stock: number
    out_of_stock: number
  }
}

// =============================================================================
// API Functions
// =============================================================================

function buildParams(params?: DateRangeParams) {
  const query: Record<string, string> = {}
  if (params?.range && params.range !== 'custom') query.range = params.range
  if (params?.date_from) query.date_from = params.date_from
  if (params?.date_to) query.date_to = params.date_to
  return { params: query }
}

const dashboardApi = {
  getStats: () => {
    return apiClient.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats/')
  },

  getAnalytics: (params?: DateRangeParams) => {
    return apiClient.get<{ success: boolean; data: AnalyticsData }>(
      '/dashboard/analytics/',
      buildParams(params)
    )
  },

  getOrderAnalytics: (params?: DateRangeParams) => {
    return apiClient.get<{ success: boolean; data: OrderAnalytics }>(
      '/dashboard/analytics/orders/',
      buildParams(params)
    )
  },

  getFleetAnalytics: (params?: DateRangeParams) => {
    return apiClient.get<{ success: boolean; data: FleetAnalytics }>(
      '/dashboard/analytics/fleet/',
      buildParams(params)
    )
  },

  getInventoryAnalytics: (params?: DateRangeParams) => {
    return apiClient.get<{ success: boolean; data: InventoryAnalytics }>(
      '/dashboard/analytics/inventory/',
      buildParams(params)
    )
  },
}

export default dashboardApi

import apiClient from '../client'

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

const dashboardApi = {
  getStats: () => {
    return apiClient.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats/')
  },

  getAnalytics: () => {
    return apiClient.get<{ success: boolean; data: AnalyticsData }>('/dashboard/analytics/')
  },
}

export default dashboardApi

import apiClient from '../client'

export interface ReferenceOption {
  value: string
  label: string
}

export interface ReferenceData {
  timezones: ReferenceOption[]
  currencies: ReferenceOption[]
}

export interface OrganizationSettings {
  // Regional
  timezone: string
  date_format: string
  currency: string
  language: string
  // Inventory
  min_stock_threshold: number
  enable_low_stock_alerts: boolean
  auto_reorder_enabled: boolean
  // Notifications
  email_notifications_enabled: boolean
  daily_summary_enabled: boolean
  daily_summary_time: string
  // Drone Operations
  drone_idle_timeout_minutes: number
  battery_low_threshold_percent: number
  battery_critical_threshold_percent: number
  // Order
  auto_assign_jobs: boolean
  order_priority_enabled: boolean
  // Security
  session_timeout_minutes: number
  require_2fa_for_admins: boolean
  password_expiry_days: number
  // Webhooks
  webhook_url: string
  webhook_secret_set: boolean
}

const settingsApi = {
  getSettings: () => {
    return apiClient.get<{ success: boolean; data: OrganizationSettings }>(
      '/settings/'
    )
  },

  updateSettings: (data: Partial<OrganizationSettings>) => {
    return apiClient.patch<{ success: boolean; data: OrganizationSettings }>(
      '/settings/',
      data
    )
  },

  regenerateWebhookSecret: () => {
    return apiClient.post<{ success: boolean; message: string }>(
      '/settings/regenerate-webhook-secret/'
    )
  },

  getReferenceData: () => {
    return apiClient.get<{ success: boolean; data: ReferenceData }>(
      '/reference-data/'
    )
  },
}

export default settingsApi

import apiClient from '../client'

export interface UserPreferencesRaw {
  theme: string | null
  timezone: string | null
  date_format: string | null
  language: string | null
  email_notifications_enabled: boolean | null
  daily_summary_enabled: boolean | null
  daily_summary_time: string | null
}

export interface EffectivePreferences {
  theme: string
  timezone: string
  date_format: string
  language: string
  email_notifications_enabled: boolean
  daily_summary_enabled: boolean
  daily_summary_time: string
  overrides: Record<string, boolean>
}

export interface UserPreferencesResponse {
  effective: EffectivePreferences
  raw: UserPreferencesRaw
}

const preferencesApi = {
  getPreferences: () => {
    return apiClient.get<{ success: boolean; data: UserPreferencesResponse }>(
      '/users/preferences/'
    )
  },

  updatePreferences: (data: Partial<UserPreferencesRaw>) => {
    return apiClient.patch<{
      success: boolean
      data: UserPreferencesRaw
      message: string
    }>('/users/preferences/', data)
  },

  resetPreferences: () => {
    return apiClient.delete<{ success: boolean; message: string }>(
      '/users/preferences/'
    )
  },
}

export default preferencesApi

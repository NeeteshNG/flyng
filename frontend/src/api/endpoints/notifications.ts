import apiClient from '../client'

// Types
export interface Notification {
  id: number
  uuid: string
  notification_type: string
  notification_type_display: string
  priority: string
  priority_display: string
  title: string
  message: string
  is_read: boolean
  read_at: string | null
  link: string
  source_type: string
  source_id: string
  created_at: string
}

export interface NotificationListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Notification[]
}

export interface UnreadCountResponse {
  unread_count: number
}

// API functions
const notificationsApi = {
  getNotifications: (params?: {
    page?: number
    page_size?: number
    is_read?: boolean
    notification_type?: string
    priority?: string
    ordering?: string
  }) => {
    return apiClient.get<NotificationListResponse>('/notifications/', { params })
  },

  getNotification: (uuid: string) => {
    return apiClient.get<Notification>(`/notifications/${uuid}/`)
  },

  dismissNotification: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/notifications/${uuid}/`
    )
  },

  markAsRead: (uuid: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/notifications/${uuid}/mark-read/`
    )
  },

  markAllAsRead: () => {
    return apiClient.post<{ success: boolean; message: string; count: number }>(
      '/notifications/mark-all-read/'
    )
  },

  getUnreadCount: () => {
    return apiClient.get<UnreadCountResponse>('/notifications/unread-count/')
  },
}

export default notificationsApi

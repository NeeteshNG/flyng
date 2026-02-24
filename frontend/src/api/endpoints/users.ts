import apiClient from '../client'

export interface User {
  id: number
  uuid: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER'
  is_verified: boolean
  is_active: boolean
  two_factor_enabled: boolean
  profile_picture: string | null
  created_at: string
  updated_at: string
  last_login: string | null
}

export interface UserListResponse {
  success: boolean
  count: number
  next: string | null
  previous: string | null
  results: User[]
}

export interface UserCreateRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  role?: string
}

export interface UserUpdateRequest {
  first_name?: string
  last_name?: string
  phone?: string
  role?: string
  is_active?: boolean
}

const usersApi = {
  // Get list of users with pagination and filtering
  getUsers: (params?: {
    page?: number
    page_size?: number
    search?: string
    role?: string
    is_active?: boolean
    ordering?: string
  }) => {
    return apiClient.get<UserListResponse>('/users/', { params })
  },

  // Get single user by UUID
  getUser: (uuid: string) => {
    return apiClient.get<{ success: boolean; data: User }>(`/users/${uuid}/`)
  },

  // Create new user (admin only)
  createUser: (data: UserCreateRequest) => {
    return apiClient.post<{ success: boolean; message: string; data: User }>(
      '/auth/register/',
      data
    )
  },

  // Update user
  updateUser: (uuid: string, data: UserUpdateRequest) => {
    return apiClient.patch<{ success: boolean; message: string; data: User }>(
      `/users/${uuid}/`,
      data
    )
  },

  // Delete user (soft delete - sets is_active to false)
  deleteUser: (uuid: string) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/users/${uuid}/`
    )
  },

  // Unlock user account
  unlockUser: (uuid: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/users/${uuid}/unlock/`
    )
  },

  // Force password change
  forcePasswordChange: (uuid: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/users/${uuid}/force-password-change/`
    )
  },

  // Update profile picture
  updateProfilePicture: (uuid: string, file: File) => {
    const formData = new FormData()
    formData.append('profile_picture', file)
    return apiClient.patch<{ success: boolean; message: string; data: User }>(
      `/users/${uuid}/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
  },

  // Remove profile picture
  removeProfilePicture: (uuid: string) => {
    return apiClient.patch<{ success: boolean; message: string; data: User }>(
      `/users/${uuid}/`,
      { profile_picture: null }
    )
  },
}

export default usersApi

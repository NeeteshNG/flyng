import apiClient from '../client'

export interface LoginRequest {
  email: string
  password: string
  totp_code?: string
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    access: string
    refresh: string
    user: {
      id: number
      uuid: string
      email: string
      first_name: string
      last_name: string
      role: string
      two_factor_enabled: boolean
    }
  }
  requires_2fa?: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
  phone?: string
}

export interface User {
  id: string
  uuid: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: string
  is_active: boolean
  is_verified: boolean
  two_factor_enabled: boolean
  profile_picture: string | null
  last_login: string | null
  password_changed_at: string | null
  created_at: string
  updated_at: string
}

export interface ProfileUpdateRequest {
  first_name?: string
  last_name?: string
  phone?: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
  new_password_confirm: string
}

export interface SendOTPRequest {
  email: string
  otp_type: 'password_reset' | 'email_verification' | 'email_change'
}

export interface VerifyOTPRequest {
  email: string
  otp: string
  otp_type: string
}

export interface ResetPasswordRequest {
  email: string
  reset_token: string
  new_password: string
  new_password_confirm: string
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/users/login/', data),

  register: (data: RegisterRequest) =>
    apiClient.post('/users/register/', data),

  logout: (refreshToken: string) =>
    apiClient.post('/users/logout/', { refresh: refreshToken }),

  refreshToken: (refreshToken: string) =>
    apiClient.post<{ access: string }>('/users/token/refresh/', { refresh: refreshToken }),

  getProfile: () =>
    apiClient.get<{ success: boolean; data: User }>('/users/profile/'),

  updateProfile: (data: ProfileUpdateRequest) =>
    apiClient.patch<{ success: boolean; data: User }>('/users/profile/', data),

  updateProfilePicture: (file: File) => {
    const formData = new FormData()
    formData.append('profile_picture', file)
    return apiClient.patch<{ success: boolean; data: User }>(
      '/users/profile/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
  },

  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post('/users/change-password/', data),

  sendOTP: (data: SendOTPRequest) =>
    apiClient.post('/users/send-otp/', data),

  verifyOTP: (data: VerifyOTPRequest) =>
    apiClient.post('/users/verify-otp/', data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post('/users/reset-password/', data),

  // 2FA
  setup2FA: () =>
    apiClient.post<{ secret: string; qr_code: string }>('/users/2fa/setup/'),

  enable2FA: (totp_code: string) =>
    apiClient.post<{ backup_codes: string[] }>('/users/2fa/enable/', { totp_code }),

  disable2FA: (password: string, totp_code: string) =>
    apiClient.post('/users/2fa/disable/', { password, totp_code }),

  regenerateBackupCodes: (password: string) =>
    apiClient.post<{ backup_codes: string[] }>('/users/2fa/backup-codes/', { password }),

  // Sessions
  getSessions: () =>
    apiClient.get('/users/sessions/'),

  terminateSession: (sessionId?: string) =>
    apiClient.post('/users/sessions/terminate/', sessionId ? { session_id: sessionId } : {}),

  // Email change
  requestEmailChange: (new_email: string, password: string) =>
    apiClient.post('/users/email-change/request/', { new_email, password }),

  confirmEmailChange: (otp: string) =>
    apiClient.post('/users/email-change/confirm/', { otp }),
}

export default authApi

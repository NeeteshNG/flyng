import api from './api'
import { LoginCredentials, RegisterData, AuthResponse } from '@/types/auth'

export const authService = {
  login: (credentials: LoginCredentials) =>
    api.post<AuthResponse>('/users/login/', credentials),

  register: (data: RegisterData) =>
    api.post('/users/register/', data),

  logout: (refreshToken: string) =>
    api.post('/users/logout/', { refresh: refreshToken }),

  refreshToken: (refreshToken: string) =>
    api.post('/users/token/refresh/', { refresh: refreshToken }),

  getProfile: () =>
    api.get('/users/profile/'),

  updateProfile: (data: Partial<RegisterData>) =>
    api.patch('/users/profile/', data),

  changePassword: (data: { old_password: string; new_password: string; new_password_confirm: string }) =>
    api.post('/users/change-password/', data),

  sendOTP: (email: string) =>
    api.post('/users/send-otp/', { email }),

  verifyOTP: (email: string, otp: string) =>
    api.post('/users/verify-otp/', { email, otp }),

  resetPassword: (data: { email: string; otp: string; new_password: string; new_password_confirm: string }) =>
    api.post('/users/reset-password/', data),
}

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { store } from '@/store'
import { setTokens, logout } from '@/store/slices/authSlice'

// Get API base URL from runtime env or environment variables
const getApiBaseUrl = (): string => {
  // Check runtime env first (for Docker deployment)
  if (typeof window !== 'undefined' && (window as any).env?.VITE_API_BASE_URL) {
    return (window as any).env.VITE_API_BASE_URL
  }
  // Fallback to Vite env variable
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${getApiBaseUrl()}/users/token/refresh/`,
            { refresh: refreshToken }
          )

          const { access } = response.data
          store.dispatch(setTokens({ access, refresh: refreshToken }))

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`
          }

          return api(originalRequest)
        } catch (refreshError) {
          // Refresh failed, logout user
          store.dispatch(logout())
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, logout
        store.dispatch(logout())
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api

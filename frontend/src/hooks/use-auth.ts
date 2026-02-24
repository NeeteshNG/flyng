import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import authApi, { LoginRequest, RegisterRequest } from '@/api/endpoints/auth'
import { toast } from 'sonner'

export function useAuth() {
  const navigate = useNavigate()
  const {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    setTokens,
    clearAuth,
    setLoading,
  } = useAuthStore()

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('accessToken')
      if (!accessToken) {
        setLoading(false)
        return
      }

      try {
        const response = await authApi.getProfile()
        setUser(response.data.data)
      } catch {
        clearAuth()
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [setUser, clearAuth, setLoading])

  const login = useCallback(
    async (data: LoginRequest) => {
      try {
        const response = await authApi.login(data)

        if (response.data.requires_2fa) {
          return { requires2FA: true }
        }

        const { access, refresh } = response.data.data
        setTokens(access, refresh)

        // Fetch full user profile
        const profileResponse = await authApi.getProfile()
        setUser(profileResponse.data.data)

        toast.success('Login successful!')
        navigate('/dashboard')
        return { success: true }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } }
        const message = err.response?.data?.message || 'Login failed'
        toast.error(message)
        return { error: message }
      }
    },
    [navigate, setTokens, setUser]
  )

  const register = useCallback(
    async (data: RegisterRequest) => {
      try {
        await authApi.register(data)
        toast.success('Registration successful! Please login.')
        navigate('/auth/login')
        return { success: true }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { detail?: string; email?: string[] } } }
        const message =
          err.response?.data?.detail ||
          err.response?.data?.email?.[0] ||
          'Registration failed'
        toast.error(message)
        return { error: message }
      }
    },
    [navigate]
  )

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    } catch {
      // Ignore logout errors
    } finally {
      clearAuth()
      toast.success('Logged out successfully')
      navigate('/auth/login')
    }
  }, [clearAuth, navigate])

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  }
}

export default useAuth

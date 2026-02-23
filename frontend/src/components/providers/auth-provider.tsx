import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import authApi from '@/api/endpoints/auth'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, clearAuth, setLoading } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('accessToken')

      if (!accessToken) {
        setLoading(false)
        return
      }

      try {
        const response = await authApi.getProfile()
        // API returns { success: true, data: { user data } }
        setUser(response.data.data)
      } catch {
        clearAuth()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [setUser, clearAuth, setLoading])

  return <>{children}</>
}

export default AuthProvider

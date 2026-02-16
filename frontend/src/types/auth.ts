export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER'
  is_verified: boolean
  profile_picture?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
  phone?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
    access: string
    refresh: string
  }
}

export interface TokenPair {
  access: string
  refresh: string
}

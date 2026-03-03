import apiClient from '../client'

export interface APIKey {
  id: number
  name: string
  prefix: string
  description: string
  is_active: boolean
  is_expired: boolean
  is_valid: boolean
  scopes: string[]
  rate_limit_per_minute: number
  expires_at: string | null
  last_used_at: string | null
  last_used_ip: string | null
  usage_count: number
  created_by_user: number | null
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface APIKeyCreatePayload {
  name: string
  description?: string
  scopes?: string[]
  expires_at?: string | null
}

export interface APIKeyCreateResponse extends Omit<APIKey, 'is_expired' | 'is_valid' | 'last_used_at' | 'last_used_ip' | 'usage_count' | 'updated_at'> {
  raw_key: string
}

const apiKeysApi = {
  // List all API keys for the organization
  getAPIKeys: () => {
    return apiClient.get<{ success: boolean; data: APIKey[] }>('/api-keys/')
  },

  // Create a new API key
  createAPIKey: (data: APIKeyCreatePayload) => {
    return apiClient.post<{ success: boolean; data: APIKeyCreateResponse }>('/api-keys/', data)
  },

  // Revoke an API key
  revokeAPIKey: (id: number) => {
    return apiClient.post<{ success: boolean; message: string }>(`/api-keys/${id}/revoke/`)
  },
}

export default apiKeysApi

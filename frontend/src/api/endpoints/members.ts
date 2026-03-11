import apiClient from '../client'

export interface Member {
  id: number
  user: number
  user_email: string
  user_first_name: string
  user_last_name: string
  user_full_name: string
  user_profile_picture: string | null
  user_last_login: string | null
  membership_role: 'OWNER' | 'ADMIN' | 'MEMBER'
  membership_role_display: string
  user_role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER'
  user_role_display: string
  is_active: boolean
  joined_at: string
  deactivated_at: string | null
  invited_by: number | null
  invited_by_name: string | null
  notes: string
}

export interface MemberDetail extends Member {
  user_uuid: string
  user_is_verified: boolean
  user_two_factor_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: number
  email: string
  first_name: string
  last_name: string
  membership_role: 'ADMIN' | 'MEMBER'
  membership_role_display: string
  user_role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER'
  user_role_display: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED'
  status_display: string
  is_expired: boolean
  is_valid: boolean
  expires_at: string
  sent_at: string | null
  responded_at: string | null
  invited_by: number | null
  invited_by_name: string | null
  personal_message: string
  resend_count: number
  last_resent_at: string | null
  created_at: string
}

export interface MemberListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Member[]
}

export interface InvitationListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Invitation[]
}

export interface MemberStats {
  total_members: number
  active_count: number
  admin_count: number
  pending_invitations: number
}

const membersApi = {
  getMembers: (params?: {
    page?: number
    page_size?: number
    search?: string
    is_active?: boolean
    membership_role?: string
    user_role?: string
  }) => {
    return apiClient.get<MemberListResponse>('/members/', { params })
  },

  getMember: (id: number) => {
    return apiClient.get<{ success: boolean; data: MemberDetail }>(`/members/${id}/`)
  },

  updateMember: (id: number, data: {
    membership_role?: string
    user_role?: string
    notes?: string
  }) => {
    return apiClient.patch<{ success: boolean; data: MemberDetail }>(`/members/${id}/`, data)
  },

  deactivateMember: (id: number) => {
    return apiClient.post<{ success: boolean; message: string }>(`/members/${id}/deactivate/`)
  },

  activateMember: (id: number) => {
    return apiClient.post<{ success: boolean; message: string }>(`/members/${id}/activate/`)
  },

  transferOwnership: (newOwnerMembershipId: number) => {
    return apiClient.post<{ success: boolean; message: string }>('/members/transfer-ownership/', {
      new_owner_membership_id: newOwnerMembershipId,
    })
  },

  getStats: () => {
    return apiClient.get<{ success: boolean; data: MemberStats }>('/members/stats/')
  },

  getInvitations: (params?: {
    page?: number
    page_size?: number
    status?: string
    search?: string
  }) => {
    return apiClient.get<InvitationListResponse>('/invitations/', { params })
  },

  createInvitation: (data: {
    email: string
    first_name?: string
    last_name?: string
    membership_role?: string
    user_role?: string
    personal_message?: string
  }) => {
    return apiClient.post<{ success: boolean; data: Invitation }>('/invitations/', data)
  },

  resendInvitation: (id: number) => {
    return apiClient.post<{ success: boolean; message: string }>(`/invitations/${id}/resend/`)
  },

  revokeInvitation: (id: number) => {
    return apiClient.post<{ success: boolean; message: string }>(`/invitations/${id}/revoke/`)
  },
}

export default membersApi

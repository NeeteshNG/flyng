import apiClient from '../client'

export interface Plan {
  id: number
  name: string
  plan_type: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  description: string
  is_active: boolean
  monthly_price: string
  annual_price: string
  max_users: number
  max_warehouses: number
  max_drones: number
  max_storage_locations: number
  max_orders_per_month: number
  analytics_enabled: boolean
  api_access_enabled: boolean
  priority_support: boolean
  custom_branding: boolean
  audit_logs_enabled: boolean
  export_enabled: boolean
  api_rate_limit_per_minute: number
  data_retention_days: number
  display_order: number
}

export interface Subscription {
  id: number
  plan: number
  plan_name: string
  plan_type: string
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'PAUSED'
  status_display: string
  billing_cycle: 'MONTHLY' | 'ANNUAL'
  billing_cycle_display: string
  amount: string
  currency: string
  started_at: string
  trial_ends_at: string | null
  current_period_start: string
  current_period_end: string
  cancelled_at: string | null
  cancel_at_period_end: boolean
  is_active: boolean
  is_trialing: boolean
  days_until_renewal: number
  is_past_due: boolean
  created_at: string
  updated_at: string
}

export interface UsageStats {
  users: { current: number; limit: number }
  warehouses: { current: number; limit: number }
}

export interface BillingOverview {
  id: number
  name: string
  slug: string
  logo: string | null
  plan: number | null
  plan_name: string | null
  plan_type: string | null
  is_on_trial: boolean
  trial_days_remaining: number
  trial_ends_at: string | null
  usage_stats: UsageStats
  subscription: Subscription | null
}

export interface PlanListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Plan[]
}

export interface CheckoutResponse {
  subscription_id: string
  razorpay_key_id: string
}

const billingApi = {
  // Get all active plans
  getPlans: () => {
    return apiClient.get<PlanListResponse>('/plans/')
  },

  // Get billing overview for current user's organization
  getBillingOverview: () => {
    return apiClient.get<{ success: boolean; data: BillingOverview }>('/billing/')
  },

  // Create a checkout session for subscribing to a plan
  createCheckout: (planId: number, billingCycle: 'MONTHLY' | 'ANNUAL') => {
    return apiClient.post<{ success: boolean; data: CheckoutResponse }>(
      '/billing/checkout/',
      { plan_id: planId, billing_cycle: billingCycle }
    )
  },

  // Cancel the current subscription
  cancelSubscription: (cancelImmediately = false) => {
    return apiClient.post<{ success: boolean; data: Subscription }>(
      '/billing/cancel/',
      { cancel_immediately: cancelImmediately }
    )
  },

  // Upgrade or downgrade the plan
  upgradePlan: (planId: number, billingCycle: 'MONTHLY' | 'ANNUAL') => {
    return apiClient.post<{ success: boolean; data: Subscription }>(
      '/billing/upgrade/',
      { plan_id: planId, billing_cycle: billingCycle }
    )
  },
}

export default billingApi

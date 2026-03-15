import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard, Building2, Users, Warehouse,
  Clock, CheckCircle, XCircle,
  AlertTriangle, Zap, Crown, Star, Shield, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'

import billingApi, { Plan, BillingOverview } from '@/api/endpoints/billing'
import { useFormat } from '@/hooks/use-format'
import { useRazorpay } from '@/hooks/use-razorpay'
import { getErrorMessage } from '@/lib/api-error'

const planTypeIcon = (planType: string) => {
  switch (planType) {
    case 'FREE': return <Shield className="h-5 w-5" />
    case 'STARTER': return <Star className="h-5 w-5" />
    case 'PROFESSIONAL': return <Zap className="h-5 w-5" />
    case 'ENTERPRISE': return <Crown className="h-5 w-5" />
    default: return <CreditCard className="h-5 w-5" />
  }
}

const planTypeColor = (planType: string) => {
  switch (planType) {
    case 'FREE': return 'text-muted-foreground'
    case 'STARTER': return 'text-blue-600'
    case 'PROFESSIONAL': return 'text-purple-600'
    case 'ENTERPRISE': return 'text-amber-600'
    default: return 'text-muted-foreground'
  }
}

const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'ACTIVE': return 'default'
    case 'TRIALING': return 'secondary'
    case 'PAST_DUE': return 'destructive'
    case 'CANCELLED': return 'outline'
    case 'PAUSED': return 'outline'
    default: return 'outline'
  }
}

function UsageBar({ label, current, limit, icon }: {
  label: string
  current: number
  limit: number
  icon: React.ReactNode
}) {
  const percentage = limit > 0 ? Math.min(100, (current / limit) * 100) : 0
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className={isAtLimit ? 'text-destructive font-medium' : isNearLimit ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
          {current} / {limit}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  )
}

function FeatureItem({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {enabled ? (
        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
      <span className={enabled ? '' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}

function PlanCard({ plan, isCurrentPlan, isAnnual, hasActiveSubscription, onSelect }: {
  plan: Plan
  isCurrentPlan: boolean
  isAnnual: boolean
  hasActiveSubscription: boolean
  onSelect: (plan: Plan) => void
}) {
  const price = isAnnual ? plan.annual_price : plan.monthly_price
  const monthlyEquivalent = isAnnual
    ? (parseFloat(plan.annual_price) / 12).toFixed(0)
    : null

  const isFree = plan.plan_type === 'FREE'
  const showButton = !isFree && !isCurrentPlan

  let buttonLabel = 'Subscribe'
  if (hasActiveSubscription && !isCurrentPlan) {
    buttonLabel = 'Switch Plan'
  }

  return (
    <Card className={isCurrentPlan ? 'border-primary ring-2 ring-primary/20' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${planTypeColor(plan.plan_type)}`}>
            {planTypeIcon(plan.plan_type)}
            <CardTitle className="text-lg">{plan.name}</CardTitle>
          </div>
          {isCurrentPlan && (
            <Badge variant="default">Current</Badge>
          )}
        </div>
        {plan.description && (
          <CardDescription className="text-xs mt-1">{plan.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pricing */}
        <div>
          {parseFloat(price) === 0 ? (
            <div className="text-3xl font-bold">Free</div>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">
                  ₹{parseInt(price).toLocaleString('en-IN')}
                </span>
                <span className="text-muted-foreground text-sm">
                  /{isAnnual ? 'year' : 'month'}
                </span>
              </div>
              {isAnnual && monthlyEquivalent && (
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{parseInt(monthlyEquivalent).toLocaleString('en-IN')}/month equivalent
                </p>
              )}
            </>
          )}
        </div>

        <Separator />

        {/* Limits */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Users</span>
            <span className="font-medium">{plan.max_users}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Warehouses</span>
            <span className="font-medium">{plan.max_warehouses}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Drones</span>
            <span className="font-medium">{plan.max_drones}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Storage Locations</span>
            <span className="font-medium">{plan.max_storage_locations.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Orders/month</span>
            <span className="font-medium">
              {plan.max_orders_per_month === 0 ? 'Unlimited' : plan.max_orders_per_month.toLocaleString()}
            </span>
          </div>
        </div>

        <Separator />

        {/* Features */}
        <div className="space-y-1.5">
          <FeatureItem enabled={plan.analytics_enabled} label="Analytics" />
          <FeatureItem enabled={plan.api_access_enabled} label="API Access" />
          <FeatureItem enabled={plan.priority_support} label="Priority Support" />
          <FeatureItem enabled={plan.custom_branding} label="Custom Branding" />
          <FeatureItem enabled={plan.audit_logs_enabled} label="Audit Logs" />
          <FeatureItem enabled={plan.export_enabled} label="Data Export" />
        </div>

        {/* Data retention */}
        <div className="text-xs text-muted-foreground pt-1">
          {plan.data_retention_days} days data retention
          {plan.api_access_enabled && ` · ${plan.api_rate_limit_per_minute} API req/min`}
        </div>

        {/* Action Button */}
        {showButton && (
          <Button className="w-full" onClick={() => onSelect(plan)}>
            {buttonLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function BillingPage() {
  const { formatDateTime, formatRelative } = useFormat()
  const queryClient = useQueryClient()
  const { openCheckout } = useRazorpay()
  const [isAnnual, setIsAnnual] = useState(false)

  // Subscribe dialog state
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [dialogCycle, setDialogCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY')
  const [isProcessing, setIsProcessing] = useState(false)

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelImmediately, setCancelImmediately] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Fetch billing overview
  const { data: billingData, isLoading: billingLoading } = useQuery({
    queryKey: ['billing-overview'],
    queryFn: () => billingApi.getBillingOverview(),
  })

  // Fetch all plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => billingApi.getPlans(),
  })

  const billing: BillingOverview | null = billingData?.data?.data || null
  const plans: Plan[] = plansData?.data?.results || []
  const subscription = billing?.subscription
  const usageStats = billing?.usage_stats
  const hasActiveSubscription = !!subscription?.is_active

  const refetchBilling = () => {
    queryClient.refetchQueries({ queryKey: ['billing-overview'] })
  }

  // Handle plan selection from card
  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan)
    setDialogCycle(isAnnual ? 'ANNUAL' : 'MONTHLY')
    setSubscribeDialogOpen(true)
  }

  // Handle subscribe/upgrade
  const handleSubscribe = async () => {
    if (!selectedPlan) return
    setIsProcessing(true)

    try {
      let useCheckout = !hasActiveSubscription

      // Try upgrade first if there's an active subscription
      if (hasActiveSubscription) {
        try {
          await billingApi.upgradePlan(selectedPlan.id, dialogCycle)
          toast.success('Plan updated successfully', { duration: 4000 })
          refetchBilling()
          setSubscribeDialogOpen(false)
          return
        } catch (upgradeError: unknown) {
          // If backend says no payment subscription exists, fall through to checkout
          const err = upgradeError as { response?: { data?: { requires_checkout?: boolean } } }
          if (err?.response?.data?.requires_checkout) {
            useCheckout = true
          } else {
            throw upgradeError
          }
        }
      }

      if (useCheckout) {
        // Create checkout and open Razorpay
        const response = await billingApi.createCheckout(selectedPlan.id, dialogCycle)
        const { subscription_id, razorpay_key_id } = response.data.data

        openCheckout(subscription_id, razorpay_key_id, {
          onSuccess: () => {
            toast.success('Payment successful! Your subscription is now active.', { duration: 5000 })
            refetchBilling()
            setSubscribeDialogOpen(false)
          },
          onError: () => {
            toast.error('Payment was cancelled or failed', { duration: 5000 })
          },
        })
      }
    } catch (error) {
      toast.error(getErrorMessage(error), { duration: 5000 })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle cancel subscription
  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await billingApi.cancelSubscription(cancelImmediately)
      toast.success(
        cancelImmediately
          ? 'Subscription cancelled immediately'
          : 'Subscription will be cancelled at the end of the billing period',
        { duration: 4000 }
      )
      refetchBilling()
      setCancelDialogOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error), { duration: 5000 })
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription plan and view usage
        </p>
      </div>

      {/* Top Cards */}
      {billingLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : billing ? (
        <div className="grid gap-4 md:grid-cols-4">
          {/* Current Plan */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${planTypeColor(billing.plan_type || '')}`}>
                {billing.plan_name || 'No Plan'}
              </div>
              <p className="text-xs text-muted-foreground">
                {billing.is_on_trial
                  ? `Trial: ${billing.trial_days_remaining} days remaining`
                  : billing.plan_type || 'Not subscribed'}
              </p>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              {subscription?.is_active ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription ? (
                  <Badge variant={statusBadgeVariant(subscription.status)} className="text-sm">
                    {subscription.status_display}
                  </Badge>
                ) : (
                  'No Subscription'
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {subscription?.billing_cycle_display || 'N/A'} billing
              </p>
            </CardContent>
          </Card>

          {/* Renewal */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Renewal</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription?.days_until_renewal !== undefined
                  ? `${subscription.days_until_renewal} days`
                  : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {subscription?.current_period_end
                  ? formatRelative(subscription.current_period_end)
                  : 'No active period'}
              </p>
            </CardContent>
          </Card>

          {/* Amount */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Billing Amount</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription
                  ? `₹${parseInt(subscription.amount).toLocaleString('en-IN')}`
                  : '₹0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {subscription
                  ? `per ${subscription.billing_cycle === 'MONTHLY' ? 'month' : 'year'}`
                  : 'Free plan'}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No Organization Found</h3>
            <p className="text-sm text-muted-foreground">
              You are not currently associated with any organization.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Usage & Subscription Details */}
      {billing && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage Overview</CardTitle>
              <CardDescription>Current usage against plan limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {usageStats ? (
                <>
                  <UsageBar
                    label="Users"
                    current={usageStats.users.current}
                    limit={usageStats.users.limit}
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                  />
                  <UsageBar
                    label="Warehouses"
                    current={usageStats.warehouses.current}
                    limit={usageStats.warehouses.limit}
                    icon={<Warehouse className="h-4 w-4 text-muted-foreground" />}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No usage data available</p>
              )}
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Subscription Details</CardTitle>
                  <CardDescription>Billing and period information</CardDescription>
                </div>
                {hasActiveSubscription && !subscription?.cancel_at_period_end && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Plan</span>
                    <p className="font-medium">{subscription.plan_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Billing Cycle</span>
                    <p className="font-medium">{subscription.billing_cycle_display}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Period Start</span>
                    <p className="font-medium">{formatDateTime(subscription.current_period_start)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Period End</span>
                    <p className="font-medium">{formatDateTime(subscription.current_period_end)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Started</span>
                    <p className="font-medium">{formatDateTime(subscription.started_at)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Currency</span>
                    <p className="font-medium">{subscription.currency}</p>
                  </div>
                  {subscription.is_trialing && subscription.trial_ends_at && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Trial Ends</span>
                      <p className="font-medium text-orange-600">
                        {formatDateTime(subscription.trial_ends_at)}
                      </p>
                    </div>
                  )}
                  {subscription.cancel_at_period_end && (
                    <div className="col-span-2">
                      <Badge variant="destructive" className="mt-1">
                        Cancels at end of period
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No active subscription</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan Features (current plan) */}
      {billing && billing.plan_type && plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Plan Features</CardTitle>
            <CardDescription>Features included in your {billing.plan_name} plan</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentPlan = plans.find(p => p.plan_type === billing.plan_type)
              if (!currentPlan) return null
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <FeatureItem enabled={currentPlan.analytics_enabled} label="Analytics Dashboard" />
                  <FeatureItem enabled={currentPlan.api_access_enabled} label="API Access" />
                  <FeatureItem enabled={currentPlan.priority_support} label="Priority Support" />
                  <FeatureItem enabled={currentPlan.custom_branding} label="Custom Branding" />
                  <FeatureItem enabled={currentPlan.audit_logs_enabled} label="Audit Logs" />
                  <FeatureItem enabled={currentPlan.export_enabled} label="Data Export" />
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Available Plans</h2>
            <p className="text-sm text-muted-foreground">Compare plans and features</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="billing-toggle" className="text-sm">Monthly</Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="billing-toggle" className="text-sm">Annual</Label>
          </div>
        </div>

        {plansLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-full" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-1 w-full" />
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : plans.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={billing?.plan_type === plan.plan_type}
                isAnnual={isAnnual}
                hasActiveSubscription={hasActiveSubscription}
                onSelect={handlePlanSelect}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No Plans Available</h3>
              <p className="text-sm text-muted-foreground">
                Subscription plans have not been configured yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subscribe / Upgrade Dialog */}
      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {hasActiveSubscription ? 'Switch Plan' : 'Subscribe to'} {selectedPlan?.name}
            </DialogTitle>
            <DialogDescription>
              {hasActiveSubscription
                ? 'Your subscription will be updated to the new plan.'
                : 'Choose a billing cycle and complete payment.'}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4 py-2">
              {/* Billing Cycle Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDialogCycle('MONTHLY')}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    dialogCycle === 'MONTHLY'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/25'
                  }`}
                >
                  <div className="text-sm font-medium">Monthly</div>
                  <div className="text-2xl font-bold mt-1">
                    ₹{parseInt(selectedPlan.monthly_price).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground">per month</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDialogCycle('ANNUAL')}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    dialogCycle === 'ANNUAL'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/25'
                  }`}
                >
                  <div className="text-sm font-medium">Annual</div>
                  <div className="text-2xl font-bold mt-1">
                    ₹{parseInt(selectedPlan.annual_price).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground">per year</div>
                  {parseFloat(selectedPlan.monthly_price) > 0 && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Save ₹{(parseFloat(selectedPlan.monthly_price) * 12 - parseFloat(selectedPlan.annual_price)).toLocaleString('en-IN')}
                    </Badge>
                  )}
                </button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscribeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubscribe} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hasActiveSubscription ? 'Update Plan' : 'Proceed to Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center gap-2 py-2">
            <Switch
              id="cancel-immediately"
              checked={cancelImmediately}
              onCheckedChange={setCancelImmediately}
            />
            <Label htmlFor="cancel-immediately" className="text-sm">
              Cancel immediately (otherwise cancels at end of billing period)
            </Label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

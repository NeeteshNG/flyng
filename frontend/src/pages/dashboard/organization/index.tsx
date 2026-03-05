import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Globe,
  ShieldCheck,
  Trash2,
  Loader2,
  Package,
  Plane,
  Webhook,
  RefreshCw,
  Save,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

import { useAuthStore } from '@/stores/auth-store'
import settingsApi, { OrganizationSettings } from '@/api/endpoints/settings'
import { getErrorMessage } from '@/lib/api-error'

const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
]

export default function OrganizationSettingsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  // Local state for org settings sections
  const [orgRegional, setOrgRegional] = useState({
    timezone: '',
    date_format: '',
    currency: '',
    language: '',
  })
  const [inventory, setInventory] = useState({
    min_stock_threshold: 10,
    enable_low_stock_alerts: true,
    auto_reorder_enabled: false,
  })
  const [droneOps, setDroneOps] = useState({
    drone_idle_timeout_minutes: 30,
    battery_low_threshold_percent: 20,
    battery_critical_threshold_percent: 10,
    auto_assign_jobs: true,
    order_priority_enabled: true,
  })
  const [security, setSecurity] = useState({
    session_timeout_minutes: 480,
    require_2fa_for_admins: false,
    password_expiry_days: 0,
  })
  const [webhooks, setWebhooks] = useState({
    webhook_url: '',
    webhook_secret_set: false,
  })

  // Combobox popover state
  const [orgTzOpen, setOrgTzOpen] = useState(false)
  const [orgCurrOpen, setOrgCurrOpen] = useState(false)

  // Fetch org settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const res = await settingsApi.getSettings()
      return res.data.data
    },
  })

  // Fetch reference data (timezones, currencies)
  const { data: refData } = useQuery({
    queryKey: ['reference-data'],
    queryFn: async () => {
      const res = await settingsApi.getReferenceData()
      return res.data.data
    },
    staleTime: Infinity,
  })

  // Populate org settings local state
  useEffect(() => {
    if (!settings) return
    setOrgRegional({
      timezone: settings.timezone,
      date_format: settings.date_format,
      currency: settings.currency,
      language: settings.language,
    })
    setInventory({
      min_stock_threshold: settings.min_stock_threshold,
      enable_low_stock_alerts: settings.enable_low_stock_alerts,
      auto_reorder_enabled: settings.auto_reorder_enabled,
    })
    setDroneOps({
      drone_idle_timeout_minutes: settings.drone_idle_timeout_minutes,
      battery_low_threshold_percent: settings.battery_low_threshold_percent,
      battery_critical_threshold_percent:
        settings.battery_critical_threshold_percent,
      auto_assign_jobs: settings.auto_assign_jobs,
      order_priority_enabled: settings.order_priority_enabled,
    })
    setSecurity({
      session_timeout_minutes: settings.session_timeout_minutes,
      require_2fa_for_admins: settings.require_2fa_for_admins,
      password_expiry_days: settings.password_expiry_days,
    })
    setWebhooks({
      webhook_url: settings.webhook_url,
      webhook_secret_set: settings.webhook_secret_set,
    })
  }, [settings])

  // Org settings update mutation
  const updateOrgMutation = useMutation({
    mutationFn: (data: Partial<OrganizationSettings>) =>
      settingsApi.updateSettings(data),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['org-settings'] })
      toast.success('Organization settings saved', { duration: 4000 })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to save settings'), {
        duration: 5000,
      })
    },
  })

  // Webhook regenerate mutation
  const regenMutation = useMutation({
    mutationFn: () => settingsApi.regenerateWebhookSecret(),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['org-settings'] })
      toast.success('Webhook secret regenerated', { duration: 4000 })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to regenerate secret'), {
        duration: 5000,
      })
    },
  })

  const isOrgSaving = updateOrgMutation.isPending

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Organization Settings
          </h1>
          <p className="text-muted-foreground">
            Manage organization-wide configuration and policies
          </p>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Organization Settings
        </h1>
        <p className="text-muted-foreground">
          Manage organization-wide configuration and policies
        </p>
      </div>

      {!canEdit && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          You have read-only access. Contact an admin or manager to change
          organization settings.
        </div>
      )}

      <div className="grid gap-6">
        {/* Regional Defaults (org-wide) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Defaults
            </CardTitle>
            <CardDescription>
              Default timezone, date format, currency, and language for all
              organization members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Popover open={orgTzOpen} onOpenChange={setOrgTzOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={orgTzOpen}
                      className="w-full justify-between font-normal"
                      disabled={!canEdit}
                    >
                      {orgRegional.timezone
                        ? refData?.timezones.find(
                            (tz) => tz.value === orgRegional.timezone
                          )?.label || orgRegional.timezone
                        : 'Select timezone...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search timezone..." />
                      <CommandList>
                        <CommandEmpty>No timezone found.</CommandEmpty>
                        <CommandGroup>
                          {(refData?.timezones ?? []).map((tz) => (
                            <CommandItem
                              key={tz.value}
                              value={tz.label}
                              onSelect={() => {
                                setOrgRegional((p) => ({
                                  ...p,
                                  timezone: tz.value,
                                }))
                                setOrgTzOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  orgRegional.timezone === tz.value
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              {tz.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select
                  value={orgRegional.date_format}
                  onValueChange={(v) =>
                    setOrgRegional((p) => ({ ...p, date_format: v }))
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Popover open={orgCurrOpen} onOpenChange={setOrgCurrOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={orgCurrOpen}
                      className="w-full justify-between font-normal"
                      disabled={!canEdit}
                    >
                      {orgRegional.currency
                        ? refData?.currencies.find(
                            (c) => c.value === orgRegional.currency
                          )?.label || orgRegional.currency
                        : 'Select currency...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search currency..." />
                      <CommandList>
                        <CommandEmpty>No currency found.</CommandEmpty>
                        <CommandGroup>
                          {(refData?.currencies ?? []).map((c) => (
                            <CommandItem
                              key={c.value}
                              value={c.label}
                              onSelect={() => {
                                setOrgRegional((p) => ({
                                  ...p,
                                  currency: c.value,
                                }))
                                setOrgCurrOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  orgRegional.currency === c.value
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              {c.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={orgRegional.language}
                  onValueChange={(v) =>
                    setOrgRegional((p) => ({ ...p, language: v }))
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={isOrgSaving}
                  onClick={() => updateOrgMutation.mutate(orgRegional)}
                >
                  {isOrgSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory
            </CardTitle>
            <CardDescription>
              Configure stock thresholds and reorder preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Minimum Stock Threshold</Label>
                <p className="text-sm text-muted-foreground">
                  Default threshold for low stock alerts
                </p>
              </div>
              <Input
                type="number"
                className="w-24"
                min={0}
                value={inventory.min_stock_threshold}
                onChange={(e) =>
                  setInventory((p) => ({
                    ...p,
                    min_stock_threshold: parseInt(e.target.value) || 0,
                  }))
                }
                disabled={!canEdit}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts when stock falls below threshold
                </p>
              </div>
              <Switch
                checked={inventory.enable_low_stock_alerts}
                onCheckedChange={(v) =>
                  setInventory((p) => ({ ...p, enable_low_stock_alerts: v }))
                }
                disabled={!canEdit}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Auto Reorder Suggestions</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically suggest reorders for low stock items
                </p>
              </div>
              <Switch
                checked={inventory.auto_reorder_enabled}
                onCheckedChange={(v) =>
                  setInventory((p) => ({ ...p, auto_reorder_enabled: v }))
                }
                disabled={!canEdit}
              />
            </div>

            {canEdit && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={isOrgSaving}
                  onClick={() => updateOrgMutation.mutate(inventory)}
                >
                  {isOrgSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drone Operations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Drone Operations
            </CardTitle>
            <CardDescription>
              Configure drone behavior, battery thresholds, and job automation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Drone Idle Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Minutes before marking a drone as idle
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-20"
                  min={1}
                  value={droneOps.drone_idle_timeout_minutes}
                  onChange={(e) =>
                    setDroneOps((p) => ({
                      ...p,
                      drone_idle_timeout_minutes:
                        parseInt(e.target.value) || 1,
                    }))
                  }
                  disabled={!canEdit}
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Battery Low Threshold</Label>
                <p className="text-sm text-muted-foreground">
                  Percentage to trigger low battery alert
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-20"
                  min={1}
                  max={100}
                  value={droneOps.battery_low_threshold_percent}
                  onChange={(e) =>
                    setDroneOps((p) => ({
                      ...p,
                      battery_low_threshold_percent:
                        parseInt(e.target.value) || 1,
                    }))
                  }
                  disabled={!canEdit}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">
                  Battery Critical Threshold
                </Label>
                <p className="text-sm text-muted-foreground">
                  Percentage to trigger critical battery alert (must be less
                  than low threshold)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-20"
                  min={1}
                  max={droneOps.battery_low_threshold_percent - 1}
                  value={droneOps.battery_critical_threshold_percent}
                  onChange={(e) =>
                    setDroneOps((p) => ({
                      ...p,
                      battery_critical_threshold_percent:
                        parseInt(e.target.value) || 1,
                    }))
                  }
                  disabled={!canEdit}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Auto Assign Jobs</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign drone jobs from the order queue
                </p>
              </div>
              <Switch
                checked={droneOps.auto_assign_jobs}
                onCheckedChange={(v) =>
                  setDroneOps((p) => ({ ...p, auto_assign_jobs: v }))
                }
                disabled={!canEdit}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Order Priority</Label>
                <p className="text-sm text-muted-foreground">
                  Enable priority levels for pick orders
                </p>
              </div>
              <Switch
                checked={droneOps.order_priority_enabled}
                onCheckedChange={(v) =>
                  setDroneOps((p) => ({ ...p, order_priority_enabled: v }))
                }
                disabled={!canEdit}
              />
            </div>

            {canEdit && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={isOrgSaving}
                  onClick={() => updateOrgMutation.mutate(droneOps)}
                >
                  {isOrgSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Session management, 2FA policies, and password rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Session Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Auto-logout after inactivity (in minutes)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-24"
                  min={15}
                  value={security.session_timeout_minutes}
                  onChange={(e) =>
                    setSecurity((p) => ({
                      ...p,
                      session_timeout_minutes:
                        parseInt(e.target.value) || 15,
                    }))
                  }
                  disabled={!canEdit}
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Require 2FA for Admins</Label>
                <p className="text-sm text-muted-foreground">
                  Enforce two-factor authentication for admin users
                </p>
              </div>
              <Switch
                checked={security.require_2fa_for_admins}
                onCheckedChange={(v) =>
                  setSecurity((p) => ({ ...p, require_2fa_for_admins: v }))
                }
                disabled={!canEdit}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Password Expiry</Label>
                <p className="text-sm text-muted-foreground">
                  Days before password must be changed (0 = never)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-24"
                  min={0}
                  value={security.password_expiry_days}
                  onChange={(e) =>
                    setSecurity((p) => ({
                      ...p,
                      password_expiry_days: parseInt(e.target.value) || 0,
                    }))
                  }
                  disabled={!canEdit}
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={isOrgSaving}
                  onClick={() => updateOrgMutation.mutate(security)}
                >
                  {isOrgSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhooks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks
            </CardTitle>
            <CardDescription>
              Configure webhook URL for receiving event notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                type="url"
                placeholder="https://your-app.com/webhooks/flyng"
                value={webhooks.webhook_url}
                onChange={(e) =>
                  setWebhooks((p) => ({ ...p, webhook_url: e.target.value }))
                }
                disabled={!canEdit}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Webhook Secret</Label>
                <p className="text-sm text-muted-foreground">
                  Used to verify webhook signatures
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    webhooks.webhook_secret_set ? 'default' : 'secondary'
                  }
                >
                  {webhooks.webhook_secret_set ? 'Configured' : 'Not Set'}
                </Badge>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={regenMutation.isPending}
                    onClick={() => regenMutation.mutate()}
                  >
                    {regenMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Regenerate
                  </Button>
                )}
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={isOrgSaving}
                  onClick={() =>
                    updateOrgMutation.mutate({
                      webhook_url: webhooks.webhook_url,
                    })
                  }
                >
                  {isOrgSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Delete Organization</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your organization and all associated
                  data. Contact support to proceed.
                </p>
              </div>
              <Button variant="destructive" size="sm" disabled>
                Delete Organization
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Spacer for bottom padding */}
        <div className="h-4" />
      </div>
    </div>
  )
}

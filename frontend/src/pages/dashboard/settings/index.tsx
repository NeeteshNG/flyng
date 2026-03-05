import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Moon,
  Sun,
  Globe,
  Monitor,
  Palette,
  Mail,
  Check,
  ChevronsUpDown,
  RotateCcw,
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

import settingsApi from '@/api/endpoints/settings'
import preferencesApi, {
  UserPreferencesRaw,
} from '@/api/endpoints/preferences'
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

export default function SettingsPage() {
  const queryClient = useQueryClient()

  // Combobox popover state
  const [prefTzOpen, setPrefTzOpen] = useState(false)

  // Fetch user preferences
  const { data: prefsData, isLoading } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const res = await preferencesApi.getPreferences()
      return res.data.data
    },
  })

  // Fetch reference data (timezones)
  const { data: refData } = useQuery({
    queryKey: ['reference-data'],
    queryFn: async () => {
      const res = await settingsApi.getReferenceData()
      return res.data.data
    },
    staleTime: Infinity,
  })

  // User preferences mutation
  const prefsMutation = useMutation({
    mutationFn: (data: Partial<UserPreferencesRaw>) =>
      preferencesApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['user-preferences'] })
      toast.success('Preferences saved', { duration: 4000 })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to save preferences'), {
        duration: 5000,
      })
    },
  })

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    // Apply immediately to DOM
    if (newTheme === 'system') {
      localStorage.removeItem('theme')
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', isDark)
    } else {
      localStorage.setItem('theme', newTheme)
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
    }
    // Persist to backend
    prefsMutation.mutate({ theme: newTheme })
  }

  const effective = prefsData?.effective
  const overrides = prefsData?.effective.overrides

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal preferences
          </p>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
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
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the application looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred color theme
                </p>
              </div>
              <Select
                value={effective?.theme || 'system'}
                onValueChange={(v) =>
                  handleThemeChange(v as 'light' | 'dark' | 'system')
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Regional Preferences (user-specific) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Preferences
            </CardTitle>
            <CardDescription>
              Override your organization's regional defaults for your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Timezone */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Timezone</Label>
                  {!overrides?.timezone && (
                    <Badge variant="outline" className="text-xs">
                      Org Default
                    </Badge>
                  )}
                </div>
                <Popover open={prefTzOpen} onOpenChange={setPrefTzOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={prefTzOpen}
                      className="w-full justify-between font-normal"
                    >
                      {effective?.timezone
                        ? refData?.timezones.find(
                            (tz) => tz.value === effective.timezone
                          )?.label || effective.timezone
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
                                prefsMutation.mutate({ timezone: tz.value })
                                setPrefTzOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  effective?.timezone === tz.value
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
                {overrides?.timezone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground"
                    onClick={() => prefsMutation.mutate({ timezone: null })}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset to org default
                  </Button>
                )}
              </div>

              {/* Date Format */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Date Format</Label>
                  {!overrides?.date_format && (
                    <Badge variant="outline" className="text-xs">
                      Org Default
                    </Badge>
                  )}
                </div>
                <Select
                  value={effective?.date_format || ''}
                  onValueChange={(v) =>
                    prefsMutation.mutate({ date_format: v })
                  }
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
                {overrides?.date_format && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground"
                    onClick={() =>
                      prefsMutation.mutate({ date_format: null })
                    }
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset to org default
                  </Button>
                )}
              </div>

              {/* Language */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Language</Label>
                  {!overrides?.language && (
                    <Badge variant="outline" className="text-xs">
                      Org Default
                    </Badge>
                  )}
                </div>
                <Select
                  value={effective?.language || ''}
                  onValueChange={(v) =>
                    prefsMutation.mutate({ language: v })
                  }
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
                {overrides?.language && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground"
                    onClick={() => prefsMutation.mutate({ language: null })}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset to org default
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences (user-specific) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control your personal notification settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">Email Notifications</Label>
                    {!overrides?.email_notifications_enabled && (
                      <Badge variant="outline" className="text-xs">
                        Org Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={effective?.email_notifications_enabled ?? true}
                  onCheckedChange={(v) =>
                    prefsMutation.mutate({
                      email_notifications_enabled: v,
                    })
                  }
                />
              </div>
            </div>
            {overrides?.email_notifications_enabled && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground"
                onClick={() =>
                  prefsMutation.mutate({
                    email_notifications_enabled: null,
                  })
                }
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset to org default
              </Button>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label className="text-base">Daily Summary</Label>
                  {!overrides?.daily_summary_enabled && (
                    <Badge variant="outline" className="text-xs">
                      Org Default
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive a daily summary of activity via email
                </p>
              </div>
              <Switch
                checked={effective?.daily_summary_enabled ?? false}
                onCheckedChange={(v) =>
                  prefsMutation.mutate({ daily_summary_enabled: v })
                }
              />
            </div>
            {overrides?.daily_summary_enabled && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground"
                onClick={() =>
                  prefsMutation.mutate({ daily_summary_enabled: null })
                }
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset to org default
              </Button>
            )}

            {effective?.daily_summary_enabled && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-base">Summary Time</Label>
                      {!overrides?.daily_summary_time && (
                        <Badge variant="outline" className="text-xs">
                          Org Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Time to send the daily summary
                    </p>
                  </div>
                  <Input
                    type="time"
                    className="w-32"
                    value={effective?.daily_summary_time || '09:00'}
                    onChange={(e) =>
                      prefsMutation.mutate({
                        daily_summary_time: e.target.value,
                      })
                    }
                  />
                </div>
                {overrides?.daily_summary_time && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground"
                    onClick={() =>
                      prefsMutation.mutate({ daily_summary_time: null })
                    }
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset to org default
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

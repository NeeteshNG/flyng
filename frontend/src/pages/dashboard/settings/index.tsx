import { useState } from 'react'
import {
  Bell,
  Moon,
  Sun,
  Globe,
  Monitor,
  Palette,
  Mail,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  LogOut,
  Trash2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'

export default function SettingsPage() {
  const { logout } = useAuth()
  const { user } = useAuthStore()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') return 'dark'
    if (saved === 'light') return 'light'
    return 'system'
  })
  const [logoutAllOpen, setLogoutAllOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Notification preferences (stored locally for now)
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    orderUpdates: true,
    droneAlerts: true,
    lowStock: true,
    systemUpdates: false,
  })

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)

    if (newTheme === 'system') {
      localStorage.removeItem('theme')
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', isDark)
    } else {
      localStorage.setItem('theme', newTheme)
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
    }

    toast.success(`Theme changed to ${newTheme}`)
  }

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] }
      localStorage.setItem('notification-preferences', JSON.stringify(updated))
      return updated
    })
    toast.success('Notification preference updated')
  }

  const handleLogoutAll = async () => {
    setIsLoggingOut(true)
    try {
      // In a real app, this would call an API to terminate all sessions
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('All sessions terminated')
      setLogoutAllOpen(false)
      logout()
    } catch {
      toast.error('Failed to logout from all devices')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences and account settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Appearance Settings */}
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
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred color theme
                </p>
              </div>
              <Select value={theme} onValueChange={(v) => handleThemeChange(v as typeof theme)}>
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

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Language</Label>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred language
                </p>
              </div>
              <Select defaultValue="en">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      English
                    </div>
                  </SelectItem>
                  <SelectItem value="hi" disabled>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Hindi (Coming Soon)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={() => handleNotificationChange('email')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label className="text-base">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in browser
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={() => handleNotificationChange('push')}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-sm font-medium text-muted-foreground">
                Notification Types
              </Label>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Order Updates</Label>
                  <p className="text-xs text-muted-foreground">
                    When orders are created, updated, or completed
                  </p>
                </div>
                <Switch
                  checked={notifications.orderUpdates}
                  onCheckedChange={() => handleNotificationChange('orderUpdates')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Drone Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Critical drone status and battery alerts
                  </p>
                </div>
                <Switch
                  checked={notifications.droneAlerts}
                  onCheckedChange={() => handleNotificationChange('droneAlerts')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Stock Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    When inventory items are running low
                  </p>
                </div>
                <Switch
                  checked={notifications.lowStock}
                  onCheckedChange={() => handleNotificationChange('lowStock')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Updates</Label>
                  <p className="text-xs text-muted-foreground">
                    News and updates about FlyNG
                  </p>
                </div>
                <Switch
                  checked={notifications.systemUpdates}
                  onCheckedChange={() => handleNotificationChange('systemUpdates')}
                />
              </div>
            </div>
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
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label className="text-base">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                {user?.two_factor_enabled ? 'Manage' : 'Enable'}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LogOut className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label className="text-base">Active Sessions</Label>
                  <p className="text-sm text-muted-foreground">
                    Sign out from all other devices
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogoutAllOpen(true)}
              >
                Logout All
              </Button>
            </div>
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
              Irreversible actions that affect your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button variant="destructive" size="sm" disabled>
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logout All Dialog */}
      <Dialog open={logoutAllOpen} onOpenChange={setLogoutAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Logout from all devices?</DialogTitle>
            <DialogDescription>
              This will sign you out from all devices where you're currently
              logged in, including this one. You'll need to log in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutAllOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogoutAll}
              disabled={isLoggingOut}
            >
              {isLoggingOut && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Logout All Devices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  Key,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  LogOut,
  AlertTriangle,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AvatarUpload } from '@/components/ui/avatar-upload'

import { useAuthStore } from '@/stores/auth-store'
import { useFormat } from '@/hooks/use-format'
import authApi from '@/api/endpoints/auth'
import { getErrorMessage } from '@/lib/api-error'

// ── Schemas ──────────────────────────────────────────────────────────

const profileFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
})
type ProfileFormValues = z.infer<typeof profileFormSchema>

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    new_password_confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    message: "Passwords don't match",
    path: ['new_password_confirm'],
  })
type ChangePasswordValues = z.infer<typeof changePasswordSchema>

const emailChangeSchema = z.object({
  new_email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type EmailChangeValues = z.infer<typeof emailChangeSchema>

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
})
type OtpValues = z.infer<typeof otpSchema>

const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required'),
})
type Disable2FAValues = z.infer<typeof disable2FASchema>

// ── Session type ─────────────────────────────────────────────────────

interface Session {
  id: number
  session_key: string
  ip_address: string
  device_type: string
  browser: string
  os: string
  is_active: boolean
  is_current: boolean
  is_expired: boolean
  last_activity: string
  created_at: string
  expires_at: string
}

// ── Device icon helper ───────────────────────────────────────────────

function DeviceIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'mobile':
      return <Smartphone className={className} />
    case 'tablet':
      return <Tablet className={className} />
    default:
      return <Monitor className={className} />
  }
}

// ── Component ────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const { formatDateTime, formatRelative } = useFormat()

  // ── Local state ──────────────────────────────────────────────────
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [emailChangeOpen, setEmailChangeOpen] = useState(false)
  const [emailOtpOpen, setEmailOtpOpen] = useState(false)
  const [setup2FAOpen, setSetup2FAOpen] = useState(false)
  const [disable2FAOpen, setDisable2FAOpen] = useState(false)
  const [backupCodesOpen, setBackupCodesOpen] = useState(false)
  const [terminateAllOpen, setTerminateAllOpen] = useState(false)
  const [copiedCodes, setCopiedCodes] = useState(false)

  // 2FA setup state
  const [qrCode, setQrCode] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'codes'>('qr')

  // ── Forms ────────────────────────────────────────────────────────

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
    },
  })

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: '', new_password: '', new_password_confirm: '' },
  })

  const emailForm = useForm<EmailChangeValues>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { new_email: '', password: '' },
  })

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  })

  const disable2FAForm = useForm<Disable2FAValues>({
    resolver: zodResolver(disable2FASchema),
    defaultValues: { password: '' },
  })

  // Reset forms on dialog close
  useEffect(() => {
    if (!changePasswordOpen) passwordForm.reset()
  }, [changePasswordOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!emailChangeOpen) emailForm.reset()
  }, [emailChangeOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!emailOtpOpen) otpForm.reset()
  }, [emailOtpOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!disable2FAOpen) disable2FAForm.reset()
  }, [disable2FAOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!setup2FAOpen) {
      setQrCode('')
      setSecretKey('')
      setTotpCode('')
      setSetupStep('qr')
    }
  }, [setup2FAOpen])

  useEffect(() => {
    if (!backupCodesOpen) {
      setBackupCodes([])
      setCopiedCodes(false)
    }
  }, [backupCodesOpen])

  // ── Queries ──────────────────────────────────────────────────────

  const sessionsQuery = useQuery<{ success: boolean; data: Session[] }>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await authApi.getSessions()
      return res.data
    },
  })

  const sessions = sessionsQuery.data?.data || []

  // ── Mutations ────────────────────────────────────────────────────

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      await authApi.updateProfile(data)
      if (profilePicture) {
        await authApi.updateProfilePicture(profilePicture)
      }
    },
    onSuccess: async () => {
      toast.success('Profile updated successfully', { duration: 4000 })
      const response = await authApi.getProfile()
      setUser(response.data.data)
      setProfilePicture(null)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update profile'), { duration: 5000 })
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordValues) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully', { duration: 4000 })
      setChangePasswordOpen(false)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to change password'), { duration: 5000 })
    },
  })

  const requestEmailChangeMutation = useMutation({
    mutationFn: (data: EmailChangeValues) =>
      authApi.requestEmailChange(data.new_email, data.password),
    onSuccess: () => {
      toast.success('Verification code sent to your new email', { duration: 4000 })
      setEmailChangeOpen(false)
      setEmailOtpOpen(true)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to request email change'), { duration: 5000 })
    },
  })

  const confirmEmailChangeMutation = useMutation({
    mutationFn: (data: OtpValues) => authApi.confirmEmailChange(data.otp),
    onSuccess: async () => {
      toast.success('Email changed successfully', { duration: 4000 })
      setEmailOtpOpen(false)
      const response = await authApi.getProfile()
      setUser(response.data.data)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Invalid or expired OTP'), { duration: 5000 })
    },
  })

  const terminateSessionMutation = useMutation({
    mutationFn: (sessionKey: string) => authApi.terminateSession(sessionKey),
    onSuccess: () => {
      toast.success('Session terminated', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['sessions'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to terminate session'), { duration: 5000 })
    },
  })

  const terminateAllSessionsMutation = useMutation({
    mutationFn: () => authApi.terminateAllSessions(),
    onSuccess: () => {
      toast.success('All other sessions terminated', { duration: 4000 })
      setTerminateAllOpen(false)
      queryClient.refetchQueries({ queryKey: ['sessions'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to terminate sessions'), { duration: 5000 })
    },
  })

  const setup2FAMutation = useMutation({
    mutationFn: () => authApi.setup2FA(),
    onSuccess: (res) => {
      const data = res.data.data
      setQrCode(data.qr_code)
      setSecretKey(data.secret_key)
      setSetupStep('qr')
      setSetup2FAOpen(true)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to setup 2FA'), { duration: 5000 })
    },
  })

  const enable2FAMutation = useMutation({
    mutationFn: (code: string) => authApi.enable2FA(code),
    onSuccess: async (res) => {
      setBackupCodes(res.data.data.backup_codes)
      setSetupStep('codes')
      const response = await authApi.getProfile()
      setUser(response.data.data)
      toast.success('Two-factor authentication enabled', { duration: 4000 })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Invalid code. Please try again.'), { duration: 5000 })
    },
  })

  const disable2FAMutation = useMutation({
    mutationFn: (password: string) => authApi.disable2FA(password),
    onSuccess: async () => {
      toast.success('Two-factor authentication disabled', { duration: 4000 })
      setDisable2FAOpen(false)
      const response = await authApi.getProfile()
      setUser(response.data.data)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to disable 2FA'), { duration: 5000 })
    },
  })

  const regenerateCodesMutation = useMutation({
    mutationFn: () => authApi.regenerateBackupCodes(),
    onSuccess: (res) => {
      setBackupCodes(res.data.data.codes)
      setBackupCodesOpen(true)
      toast.success('New backup codes generated', { duration: 4000 })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to regenerate codes'), { duration: 5000 })
    },
  })

  // ── Helpers ──────────────────────────────────────────────────────

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user?.first_name) return user.first_name[0].toUpperCase()
    return 'U'
  }

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      setCopiedCodes(true)
      toast.success('Backup codes copied to clipboard', { duration: 4000 })
      setTimeout(() => setCopiedCodes(false), 2000)
    } catch {
      toast.error('Failed to copy codes', { duration: 5000 })
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* ────── LEFT COLUMN: Personal Info ────── */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details and profile picture</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit((d) => updateProfileMutation.mutate(d))} className="space-y-6">
                <div className="flex justify-center">
                  <AvatarUpload
                    value={user?.profile_picture}
                    onChange={setProfilePicture}
                    fallback={getInitials()}
                    disabled={updateProfileMutation.isPending}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={profileForm.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 9876543210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* ────── RIGHT COLUMN ────── */}
        <div className="space-y-6">
          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => setEmailChangeOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <Badge variant="secondary" className="mt-1">
                    {user?.role}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{user?.phone || 'Not set'}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(user?.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Last Login</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(user?.last_login)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Password</p>
                    <p className="text-xs text-muted-foreground">
                      Last changed: {formatDateTime(user?.password_changed_at)}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setChangePasswordOpen(true)}>
                  Change
                </Button>
              </div>

              <Separator />

              {/* Two-Factor Auth */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Two-Factor Auth</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.two_factor_enabled
                          ? 'Authenticator app enabled'
                          : 'Add an extra layer of security'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={user?.two_factor_enabled ? 'success' : 'secondary'}>
                    {user?.two_factor_enabled ? 'On' : 'Off'}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  {user?.two_factor_enabled ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDisable2FAOpen(true)}
                      >
                        <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
                        Disable
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => regenerateCodesMutation.mutate()}
                        disabled={regenerateCodesMutation.isPending}
                      >
                        {regenerateCodesMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Backup Codes
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setup2FAMutation.mutate()}
                      disabled={setup2FAMutation.isPending}
                    >
                      {setup2FAMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Enable 2FA
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Active Sessions</CardTitle>
                {sessions.filter((s) => !s.is_current).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7 text-xs"
                    onClick={() => setTerminateAllOpen(true)}
                  >
                    <LogOut className="h-3 w-3 mr-1" />
                    End All Others
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {sessionsQuery.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active sessions found
                </p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.session_key}
                      className={`flex items-start gap-3 p-2.5 rounded-lg ${
                        session.is_current ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'
                      }`}
                    >
                      <DeviceIcon
                        type={session.device_type}
                        className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {session.browser} on {session.os}
                          </p>
                          {session.is_current && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Globe className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{session.ip_address}</span>
                          <span>·</span>
                          <span className="whitespace-nowrap">
                            {formatRelative(session.last_activity)}
                          </span>
                        </div>
                      </div>
                      {!session.is_current && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => terminateSessionMutation.mutate(session.session_key)}
                          disabled={terminateSessionMutation.isPending}
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                To delete or deactivate your account, please contact your organization
                administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ────── DIALOGS ────── */}

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit((d) => changePasswordMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={passwordForm.control}
                name="current_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Min 8 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="new_password_confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChangePasswordOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Change Password
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Email Change Request Dialog */}
      <Dialog open={emailChangeOpen} onOpenChange={setEmailChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>
              A verification code will be sent to your new email address.
            </DialogDescription>
          </DialogHeader>
          <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit((d) => requestEmailChangeMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={emailForm.control}
                name="new_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Verify your identity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmailChangeOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={requestEmailChangeMutation.isPending}>
                  {requestEmailChangeMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Send Verification Code
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Email Change OTP Dialog */}
      <Dialog open={emailOtpOpen} onOpenChange={setEmailOtpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Verification Code</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code sent to your new email address.
            </DialogDescription>
          </DialogHeader>
          <Form {...otpForm}>
            <form
              onSubmit={otpForm.handleSubmit((d) => confirmEmailChangeMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000000"
                        maxLength={6}
                        className="text-center text-lg tracking-widest font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEmailOtpOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={confirmEmailChangeMutation.isPending}>
                  {confirmEmailChangeMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Verify & Change Email
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 2FA Setup Dialog */}
      <Dialog
        open={setup2FAOpen}
        onOpenChange={(open) => {
          if (!open && setupStep === 'codes') {
            // Closing after seeing backup codes is fine
            setSetup2FAOpen(false)
          } else if (!open) {
            setSetup2FAOpen(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {setupStep === 'codes'
                ? 'Save Backup Codes'
                : 'Set Up Two-Factor Authentication'}
            </DialogTitle>
            <DialogDescription>
              {setupStep === 'qr' &&
                'Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)'}
              {setupStep === 'verify' &&
                'Enter the 6-digit code from your authenticator app to verify setup.'}
              {setupStep === 'codes' &&
                'Save these backup codes in a safe place. Each code can only be used once.'}
            </DialogDescription>
          </DialogHeader>

          {setupStep === 'qr' && (
            <div className="space-y-4">
              {qrCode && (
                <div className="flex justify-center">
                  <img
                    src={qrCode}
                    alt="2FA QR Code"
                    className="w-48 h-48 rounded-lg border"
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Can't scan? Enter this key manually:
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono select-all break-all">
                    {secretKey}
                  </code>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSetup2FAOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setSetupStep('verify')}>Continue</Button>
              </DialogFooter>
            </div>
          )}

          {setupStep === 'verify' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Verification Code</label>
                <Input
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-lg tracking-widest font-mono"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSetupStep('qr')}>
                  Back
                </Button>
                <Button
                  onClick={() => enable2FAMutation.mutate(totpCode)}
                  disabled={totpCode.length !== 6 || enable2FAMutation.isPending}
                >
                  {enable2FAMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Verify & Enable
                </Button>
              </DialogFooter>
            </div>
          )}

          {setupStep === 'codes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-sm font-mono text-center py-1">
                    {code}
                  </code>
                ))}
              </div>
              <p className="text-xs text-destructive font-medium text-center">
                These codes won't be shown again. Save them now!
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={copyBackupCodes}>
                  {copiedCodes ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copiedCodes ? 'Copied!' : 'Copy Codes'}
                </Button>
                <Button onClick={() => setSetup2FAOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={disable2FAOpen} onOpenChange={setDisable2FAOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password to confirm disabling 2FA. This will make your account less
              secure.
            </DialogDescription>
          </DialogHeader>
          <Form {...disable2FAForm}>
            <form
              onSubmit={disable2FAForm.handleSubmit((d) =>
                disable2FAMutation.mutate(d.password)
              )}
              className="space-y-4"
            >
              <FormField
                control={disable2FAForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDisable2FAOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={disable2FAMutation.isPending}>
                  {disable2FAMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Disable 2FA
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog (regenerated) */}
      <Dialog open={backupCodesOpen} onOpenChange={setBackupCodesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              New Backup Codes
            </DialogTitle>
            <DialogDescription>
              Your previous backup codes have been invalidated. Save these new codes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
              {backupCodes.map((code, i) => (
                <code key={i} className="text-sm font-mono text-center py-1">
                  {code}
                </code>
              ))}
            </div>
            <p className="text-xs text-destructive font-medium text-center">
              These codes won't be shown again. Save them now!
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={copyBackupCodes}>
                {copiedCodes ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copiedCodes ? 'Copied!' : 'Copy Codes'}
              </Button>
              <Button onClick={() => setBackupCodesOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terminate All Sessions Confirmation */}
      <AlertDialog open={terminateAllOpen} onOpenChange={setTerminateAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate All Other Sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out of all other devices and browsers. Your current session will
              remain active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => terminateAllSessionsMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {terminateAllSessionsMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Terminate All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import {
  User2, Shield, Mail, Phone, Clock, KeyRound,
  CheckCircle, XCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import usersApi, { User } from '@/api/endpoints/users'
import { useFormat } from '@/hooks/use-format'

interface UserDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

const getRoleBadgeVariant = (role: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'ADMIN': return 'destructive'
    case 'MANAGER': return 'default'
    case 'OPERATOR': return 'secondary'
    default: return 'outline'
  }
}

export default function UserDetailSheet({ open, onOpenChange, user }: UserDetailSheetProps) {
  const { formatDateTime, formatRelative } = useFormat()

  const { data: detailData } = useQuery({
    queryKey: ['user-detail', user?.uuid],
    queryFn: () => usersApi.getUser(user!.uuid),
    enabled: !!user?.uuid && open,
  })

  const detail = detailData?.data?.data || user
  if (!detail) return null

  const getInitials = () => {
    const first = detail.first_name?.[0]?.toUpperCase() || ''
    const last = detail.last_name?.[0]?.toUpperCase() || ''
    return first + last || detail.email[0].toUpperCase()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User2 className="h-5 w-5" />
            User Details
          </SheetTitle>
          <SheetDescription>
            Account information and security status
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Avatar + Identity */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={detail.profile_picture || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">
                {detail.first_name} {detail.last_name}
              </p>
              <p className="text-sm text-muted-foreground">{detail.email}</p>
              <Badge variant={getRoleBadgeVariant(detail.role)} className="mt-1">
                {detail.role}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={detail.is_active ? 'default' : 'secondary'}>
              {detail.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {detail.is_verified ? (
              <Badge variant="outline" className="text-green-600 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <XCircle className="h-3 w-3 mr-1" />
                Unverified
              </Badge>
            )}
            {detail.two_factor_enabled ? (
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <KeyRound className="h-3 w-3 mr-1" />
                2FA Enabled
              </Badge>
            ) : (
              <Badge variant="outline">
                2FA Disabled
              </Badge>
            )}
          </div>

          <Separator />

          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <User2 className="h-4 w-4" /> Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </span>
                <p className="font-medium">{detail.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </span>
                <p className="font-medium">{detail.phone || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Role</span>
                <p className="font-medium">{detail.role}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Full Name</span>
                <p className="font-medium">
                  {detail.first_name && detail.last_name
                    ? `${detail.first_name} ${detail.last_name}`
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Security */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4" /> Security
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Two-Factor Auth</span>
                <p className="font-medium">
                  {detail.two_factor_enabled ? (
                    <span className="text-green-600">Enabled</span>
                  ) : (
                    <span className="text-muted-foreground">Disabled</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Account Status</span>
                <p className="font-medium">
                  {detail.is_active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-destructive">Inactive</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Login</span>
                <p className="font-medium">
                  {detail.last_login ? formatRelative(detail.last_login) : 'Never'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Password Changed</span>
                <p className="font-medium">
                  {detail.password_changed_at
                    ? formatDateTime(detail.password_changed_at)
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <Clock className="h-3 w-3 inline mr-1" />
              Created: {formatDateTime(detail.created_at)}
            </div>
            <div>Updated: {formatDateTime(detail.updated_at)}</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

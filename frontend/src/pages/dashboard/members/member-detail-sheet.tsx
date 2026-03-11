import { useQuery } from '@tanstack/react-query'
import {
  User, Shield, Clock, Mail, ShieldCheck, KeyRound, FileText,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import membersApi, { Member } from '@/api/endpoints/members'
import { useFormat } from '@/hooks/use-format'

interface MemberDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Member | null
}

const getMembershipBadgeVariant = (role: string): 'destructive' | 'default' | 'secondary' => {
  switch (role) {
    case 'OWNER': return 'destructive'
    case 'ADMIN': return 'default'
    default: return 'secondary'
  }
}

const getUserRoleBadgeVariant = (role: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'ADMIN': return 'destructive'
    case 'MANAGER': return 'default'
    case 'OPERATOR': return 'secondary'
    default: return 'outline'
  }
}

export default function MemberDetailSheet({ open, onOpenChange, member }: MemberDetailSheetProps) {
  const { formatDateTime } = useFormat()

  const { data: detailData } = useQuery({
    queryKey: ['member-detail', member?.id],
    queryFn: () => membersApi.getMember(member!.id),
    enabled: !!member?.id && open,
  })

  const detail = detailData?.data?.data || member
  if (!detail) return null

  const initials = `${detail.user_first_name?.[0] || ''}${detail.user_last_name?.[0] || ''}`.toUpperCase() || detail.user_email[0].toUpperCase()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={detail.user_profile_picture || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div>{detail.user_full_name || detail.user_email}</div>
              <div className="text-sm font-normal text-muted-foreground">{detail.user_email}</div>
            </div>
          </SheetTitle>
          <SheetDescription>
            Member details and role information
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status & Roles */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={detail.is_active ? 'default' : 'destructive'}>
              {detail.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant={getMembershipBadgeVariant(detail.membership_role)}>
              {detail.membership_role_display}
            </Badge>
            <Badge variant={getUserRoleBadgeVariant(detail.user_role)}>
              {detail.user_role_display}
            </Badge>
          </div>

          <Separator />

          {/* Role Information */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4" /> Role Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Membership Role</span>
                <p className="font-medium">{detail.membership_role_display}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Permission Role</span>
                <p className="font-medium">{detail.user_role_display}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" /> Activity
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Joined</span>
                <p className="font-medium">{formatDateTime(detail.joined_at)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Login</span>
                <p className="font-medium">
                  {detail.user_last_login ? formatDateTime(detail.user_last_login) : '—'}
                </p>
              </div>
              {detail.invited_by_name && (
                <div>
                  <span className="text-muted-foreground">Invited By</span>
                  <p className="font-medium">{detail.invited_by_name}</p>
                </div>
              )}
              {detail.deactivated_at && (
                <div>
                  <span className="text-muted-foreground">Deactivated At</span>
                  <p className="font-medium">{formatDateTime(detail.deactivated_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Security */}
          {'user_is_verified' in detail && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-4 w-4" /> Security
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>Email Verified</span>
                    <Badge variant={(detail as any).user_is_verified ? 'default' : 'outline'} className="ml-auto">
                      {(detail as any).user_is_verified ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <span>2FA</span>
                    <Badge variant={(detail as any).user_two_factor_enabled ? 'default' : 'outline'} className="ml-auto">
                      {(detail as any).user_two_factor_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {detail.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" /> Notes
                </h3>
                <p className="text-sm text-muted-foreground">{detail.notes}</p>
              </div>
            </>
          )}

          {/* Timestamps */}
          {'created_at' in detail && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>Created: {formatDateTime((detail as any).created_at)}</div>
                <div>Updated: {formatDateTime((detail as any).updated_at)}</div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

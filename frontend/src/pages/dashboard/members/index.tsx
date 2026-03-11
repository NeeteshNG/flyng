import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Eye, Pencil, UserMinus, UserCheck,
  Users, Shield, ShieldCheck, Mail, Loader2, ChevronLeft, ChevronRight,
  X, RefreshCw, Ban, Crown,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import membersApi, { Member, Invitation } from '@/api/endpoints/members'
import { useFormat } from '@/hooks/use-format'
import { getErrorMessage } from '@/lib/api-error'
import InviteMemberSheet from './invite-member-sheet'
import MemberDetailSheet from './member-detail-sheet'
import EditRoleSheet from './edit-role-sheet'

const PAGE_SIZE = 20

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

const getInvitationStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
  switch (status) {
    case 'PENDING': return 'default'
    case 'ACCEPTED': return 'default'
    case 'DECLINED': return 'secondary'
    case 'EXPIRED': return 'outline'
    case 'REVOKED': return 'destructive'
    default: return 'outline'
  }
}

export default function MembersPage() {
  const queryClient = useQueryClient()
  const { formatDateTime, formatDate } = useFormat()

  // Members state
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [activeFilter, setActiveFilter] = useState('all')
  const [membershipRoleFilter, setMembershipRoleFilter] = useState('all')

  // Invitations state
  const [invSearch, setInvSearch] = useState('')
  const [invPage, setInvPage] = useState(1)
  const [invStatusFilter, setInvStatusFilter] = useState('all')

  // Sheet state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editRoleOpen, setEditRoleOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  // Dialogs
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [memberToDeactivate, setMemberToDeactivate] = useState<Member | null>(null)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [memberToTransfer, setMemberToTransfer] = useState<Member | null>(null)

  // Members query
  const { data: membersData, isLoading } = useQuery({
    queryKey: ['members', search, page, activeFilter, membershipRoleFilter],
    queryFn: () => membersApi.getMembers({
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      is_active: activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
      membership_role: membershipRoleFilter !== 'all' ? membershipRoleFilter : undefined,
    }),
  })

  // Stats query
  const { data: statsData } = useQuery({
    queryKey: ['members-stats'],
    queryFn: () => membersApi.getStats(),
  })

  // Invitations query
  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ['invitations', invSearch, invPage, invStatusFilter],
    queryFn: () => membersApi.getInvitations({
      page: invPage,
      page_size: PAGE_SIZE,
      search: invSearch || undefined,
      status: invStatusFilter !== 'all' ? invStatusFilter : undefined,
    }),
  })

  const members = membersData?.data?.results || []
  const totalMembers = membersData?.data?.count || 0
  const totalMemberPages = Math.ceil(totalMembers / PAGE_SIZE)

  const invitations = invData?.data?.results || []
  const totalInvitations = invData?.data?.count || 0
  const totalInvPages = Math.ceil(totalInvitations / PAGE_SIZE)

  const stats = statsData?.data?.data

  // Mutations
  const deactivateMutation = useMutation({
    mutationFn: (member: Member) => membersApi.deactivateMember(member.id),
    onSuccess: () => {
      setDeactivateDialogOpen(false)
      setMemberToDeactivate(null)
      toast.success('Member deactivated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['members'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['members-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to deactivate member', { duration: 5000 })
    },
  })

  const activateMutation = useMutation({
    mutationFn: (member: Member) => membersApi.activateMember(member.id),
    onSuccess: () => {
      toast.success('Member activated successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['members'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['members-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to activate member', { duration: 5000 })
    },
  })

  const transferMutation = useMutation({
    mutationFn: (member: Member) => membersApi.transferOwnership(member.id),
    onSuccess: () => {
      setTransferDialogOpen(false)
      setMemberToTransfer(null)
      toast.success('Ownership transferred successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['members'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['members-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to transfer ownership', { duration: 5000 })
    },
  })

  const resendMutation = useMutation({
    mutationFn: (inv: Invitation) => membersApi.resendInvitation(inv.id),
    onSuccess: () => {
      toast.success('Invitation resent successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['invitations'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to resend invitation', { duration: 5000 })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (inv: Invitation) => membersApi.revokeInvitation(inv.id),
    onSuccess: () => {
      toast.success('Invitation revoked successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['invitations'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['members-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to revoke invitation', { duration: 5000 })
    },
  })

  const handleView = (m: Member) => { setSelectedMember(m); setDetailOpen(true) }
  const handleEditRole = (m: Member) => { setSelectedMember(m); setEditRoleOpen(true) }
  const handleDeactivate = (m: Member) => { setMemberToDeactivate(m); setDeactivateDialogOpen(true) }
  const handleTransfer = (m: Member) => { setMemberToTransfer(m); setTransferDialogOpen(true) }

  const hasActiveFilters = search || activeFilter !== 'all' || membershipRoleFilter !== 'all'
  const clearFilters = () => {
    setSearch('')
    setActiveFilter('all')
    setMembershipRoleFilter('all')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">
            Manage your organization's team members and invitations
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_members ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_count ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.admin_count ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <Mail className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_invitations ?? '—'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>View and manage team member roles and access</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    className="pl-10"
                  />
                </div>
                <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={membershipRoleFilter} onValueChange={(v) => { setMembershipRoleFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="OWNER">Owner</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" /> Clear
                  </Button>
                )}
              </div>

              {/* Table */}
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4" />
                  <p>{hasActiveFilters ? 'No members found. Try adjusting your filters.' : 'No team members yet.'}</p>
                  {hasActiveFilters && (
                    <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Membership Role</TableHead>
                      <TableHead>Permission Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => {
                      const initials = `${m.user_first_name?.[0] || ''}${m.user_last_name?.[0] || ''}`.toUpperCase() || m.user_email[0].toUpperCase()
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={m.user_profile_picture || ''} />
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{m.user_full_name || m.user_email}</p>
                                <p className="text-sm text-muted-foreground">{m.user_email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getMembershipBadgeVariant(m.membership_role)}>
                              {m.membership_role === 'OWNER' && <Crown className="h-3 w-3 mr-1" />}
                              {m.membership_role === 'ADMIN' && <Shield className="h-3 w-3 mr-1" />}
                              {m.membership_role_display}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getUserRoleBadgeVariant(m.user_role)}>
                              {m.user_role_display}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(m.joined_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={m.is_active ? 'default' : 'secondary'}>
                              {m.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleView(m)}>
                                  <Eye className="h-4 w-4 mr-2" /> View Details
                                </DropdownMenuItem>
                                {m.membership_role !== 'OWNER' && (
                                  <DropdownMenuItem onClick={() => handleEditRole(m)}>
                                    <Pencil className="h-4 w-4 mr-2" /> Edit Roles
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {m.is_active && m.membership_role !== 'OWNER' && (
                                  <DropdownMenuItem
                                    onClick={() => handleDeactivate(m)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <UserMinus className="h-4 w-4 mr-2" /> Deactivate
                                  </DropdownMenuItem>
                                )}
                                {!m.is_active && (
                                  <DropdownMenuItem onClick={() => activateMutation.mutate(m)}>
                                    <UserCheck className="h-4 w-4 mr-2" /> Activate
                                  </DropdownMenuItem>
                                )}
                                {m.membership_role !== 'OWNER' && m.is_active && (
                                  <DropdownMenuItem onClick={() => handleTransfer(m)}>
                                    <Crown className="h-4 w-4 mr-2" /> Transfer Ownership
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {totalMemberPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalMemberPages} ({totalMembers} members)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalMemberPages, p + 1))} disabled={page === totalMemberPages}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Invitations</CardTitle>
              <CardDescription>Track and manage team member invitations</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={invSearch}
                    onChange={(e) => { setInvSearch(e.target.value); setInvPage(1) }}
                    className="pl-10"
                  />
                </div>
                <Select value={invStatusFilter} onValueChange={(v) => { setInvStatusFilter(v); setInvPage(1) }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="DECLINED">Declined</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="REVOKED">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              {invLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : invitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Mail className="h-12 w-12 mb-4" />
                  <p>{invStatusFilter !== 'all' ? 'No invitations found with this status.' : 'No invitations sent yet.'}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {inv.first_name || inv.last_name
                            ? `${inv.first_name} ${inv.last_name}`.trim()
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant={getMembershipBadgeVariant(inv.membership_role)} className="text-xs">
                              {inv.membership_role_display}
                            </Badge>
                            <Badge variant={getUserRoleBadgeVariant(inv.user_role)} className="text-xs">
                              {inv.user_role_display}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getInvitationStatusVariant(inv.status)}>
                            {inv.status_display}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {inv.created_at ? formatDate(inv.created_at) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(inv.expires_at)}
                        </TableCell>
                        <TableCell>
                          {inv.status === 'PENDING' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => resendMutation.mutate(inv)}>
                                  <RefreshCw className="h-4 w-4 mr-2" /> Resend
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => revokeMutation.mutate(inv)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" /> Revoke
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {totalInvPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {invPage} of {totalInvPages} ({totalInvitations} invitations)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setInvPage((p) => Math.max(1, p - 1))} disabled={invPage === 1}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setInvPage((p) => Math.min(totalInvPages, p + 1))} disabled={invPage === totalInvPages}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sheets */}
      <InviteMemberSheet open={inviteOpen} onOpenChange={setInviteOpen} />
      <MemberDetailSheet open={detailOpen} onOpenChange={setDetailOpen} member={selectedMember} />
      <EditRoleSheet open={editRoleOpen} onOpenChange={setEditRoleOpen} member={selectedMember} />

      {/* Deactivate Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-medium">
                {memberToDeactivate?.user_full_name || memberToDeactivate?.user_email}
              </span>
              ? They will lose access to the organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToDeactivate && deactivateMutation.mutate(memberToDeactivate)}
              disabled={deactivateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Dialog */}
      <AlertDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to transfer organization ownership to{' '}
              <span className="font-medium">
                {memberToTransfer?.user_full_name || memberToTransfer?.user_email}
              </span>
              ? You will be demoted to Admin. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToTransfer && transferMutation.mutate(memberToTransfer)}
              disabled={transferMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {transferMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

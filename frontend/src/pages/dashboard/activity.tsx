import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, ChevronLeft, ChevronRight, X,
  Activity, LogIn, LogOut, Plus, Pencil, Trash2,
  Eye, Download, KeyRound, UserCog,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import usersApi, { UserActivity } from '@/api/endpoints/users'
import { useFormat } from '@/hooks/use-format'

const PAGE_SIZE = 20

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  LOGIN: { icon: LogIn, color: 'text-green-500', variant: 'default' },
  LOGOUT: { icon: LogOut, color: 'text-muted-foreground', variant: 'secondary' },
  CREATE: { icon: Plus, color: 'text-blue-500', variant: 'default' },
  UPDATE: { icon: Pencil, color: 'text-yellow-500', variant: 'outline' },
  DELETE: { icon: Trash2, color: 'text-red-500', variant: 'destructive' },
  VIEW: { icon: Eye, color: 'text-muted-foreground', variant: 'secondary' },
  EXPORT: { icon: Download, color: 'text-purple-500', variant: 'outline' },
  PASSWORD_CHANGE: { icon: KeyRound, color: 'text-orange-500', variant: 'outline' },
  PROFILE_UPDATE: { icon: UserCog, color: 'text-blue-500', variant: 'outline' },
}

const ACTION_OPTIONS = [
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'VIEW', label: 'View' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'PASSWORD_CHANGE', label: 'Password Change' },
  { value: 'PROFILE_UPDATE', label: 'Profile Update' },
]

function ActivityIcon({ action }: { action: string }) {
  const config = ACTION_CONFIG[action] || { icon: Activity, color: 'text-muted-foreground' }
  const Icon = config.icon
  return <Icon className={`h-4 w-4 ${config.color}`} />
}

export default function ActivityPage() {
  const { formatRelative } = useFormat()
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      page,
      page_size: PAGE_SIZE,
      ordering: '-created_at',
    }
    if (actionFilter !== 'all') params.action = actionFilter
    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-activity', search, actionFilter, page],
    queryFn: () => usersApi.getActivity(getFilterParams()),
  })

  const activities = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const clearFilters = () => { setSearch(''); setActionFilter('all'); setPage(1) }
  const hasActiveFilters = search || actionFilter !== 'all'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" />
          User Activity
        </h1>
        <p className="text-muted-foreground">
          Audit log of user actions across the system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            {totalCount > 0
              ? `${totalCount} activities recorded`
              : 'No activity recorded yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by description, user, resource..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load activity log. Please try again.
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? 'No activities match your filters.'
                : 'No activity recorded yet.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity: UserActivity) => {
                    const config = ACTION_CONFIG[activity.action]
                    return (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <ActivityIcon action={activity.action} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={config?.variant || 'outline'}>
                            {activity.action_display}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{activity.user_name}</div>
                            <div className="text-xs text-muted-foreground">{activity.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {activity.resource_type ? (
                            <div>
                              <div className="text-sm">{activity.resource_type}</div>
                              {activity.resource_name && (
                                <div className="text-xs text-muted-foreground">{activity.resource_name}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {activity.description || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {activity.ip_address ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {activity.ip_address}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatRelative(activity.created_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} entries)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

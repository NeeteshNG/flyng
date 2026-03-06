import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, Search, ChevronLeft, ChevronRight, X,
  Check, Trash2, CheckCheck, ExternalLink,
  ShoppingCart, AlertTriangle, CheckCircle2, XCircle,
  Package, Upload, Wrench, Battery, UserPlus, Info,
} from 'lucide-react'
import { toast } from 'sonner'

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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

import notificationsApi, { type Notification } from '@/api/endpoints/notifications'
import { useFormat } from '@/hooks/use-format'
import { getErrorMessage } from '@/lib/api-error'

const PAGE_SIZE = 20

const TYPE_ICONS: Record<string, React.ElementType> = {
  ORDER_STATUS_CHANGED: ShoppingCart,
  ORDER_OVERDUE: AlertTriangle,
  JOB_COMPLETED: CheckCircle2,
  JOB_FAILED: XCircle,
  LOW_STOCK_ALERT: Package,
  IMPORT_COMPLETED: Upload,
  IMPORT_FAILED: XCircle,
  DRONE_MAINTENANCE_DUE: Wrench,
  BATTERY_LOW_HEALTH: Battery,
  NEW_MEMBER_JOINED: UserPlus,
  SYSTEM: Info,
}

const TYPE_OPTIONS = [
  { value: 'ORDER_STATUS_CHANGED', label: 'Order Status' },
  { value: 'ORDER_OVERDUE', label: 'Order Overdue' },
  { value: 'JOB_COMPLETED', label: 'Job Completed' },
  { value: 'JOB_FAILED', label: 'Job Failed' },
  { value: 'LOW_STOCK_ALERT', label: 'Low Stock' },
  { value: 'IMPORT_COMPLETED', label: 'Import Completed' },
  { value: 'IMPORT_FAILED', label: 'Import Failed' },
  { value: 'DRONE_MAINTENANCE_DUE', label: 'Maintenance Due' },
  { value: 'BATTERY_LOW_HEALTH', label: 'Battery Health' },
  { value: 'NEW_MEMBER_JOINED', label: 'New Member' },
  { value: 'SYSTEM', label: 'System' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
  LOW: 'secondary',
  NORMAL: 'info',
  HIGH: 'warning',
  URGENT: 'destructive',
}

export default function NotificationsPage() {
  const { formatRelative, formatDateTime } = useFormat()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [readFilter, setReadFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      page,
      page_size: PAGE_SIZE,
      ordering: '-created_at',
    }
    if (readFilter === 'unread') params.is_read = false
    if (readFilter === 'read') params.is_read = true
    if (typeFilter !== 'all') params.notification_type = typeFilter
    if (priorityFilter !== 'all') params.priority = priorityFilter
    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications-page', readFilter, typeFilter, priorityFilter, page],
    queryFn: () => notificationsApi.getNotifications(getFilterParams()).then((r) => r.data),
  })

  const markReadMutation = useMutation({
    mutationFn: (uuid: string) => notificationsApi.markAsRead(uuid),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['notifications-page'] })
      queryClient.refetchQueries({ queryKey: ['notifications-unread-count'] })
      queryClient.refetchQueries({ queryKey: ['notifications-popover'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: (res) => {
      toast.success(`${res.data.count} notifications marked as read`, { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['notifications-page'] })
      queryClient.refetchQueries({ queryKey: ['notifications-unread-count'] })
      queryClient.refetchQueries({ queryKey: ['notifications-popover'] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err), { duration: 5000 })
    },
  })

  const dismissMutation = useMutation({
    mutationFn: (uuid: string) => notificationsApi.dismissNotification(uuid),
    onSuccess: () => {
      setSelectedNotification(null)
      queryClient.refetchQueries({ queryKey: ['notifications-page'] })
      queryClient.refetchQueries({ queryKey: ['notifications-unread-count'] })
      queryClient.refetchQueries({ queryKey: ['notifications-popover'] })
    },
  })

  const notifications = data?.results ?? []
  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const clearFilters = () => {
    setSearch('')
    setReadFilter('all')
    setTypeFilter('all')
    setPriorityFilter('all')
    setPage(1)
  }
  const hasActiveFilters = readFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all' || search

  const handleRowClick = (notification: Notification) => {
    setSelectedNotification(notification)
    if (!notification.is_read) {
      markReadMutation.mutate(notification.uuid)
    }
  }

  const SelectedIcon = selectedNotification
    ? TYPE_ICONS[selectedNotification.notification_type] || Info
    : Info

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            View and manage all your notifications.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark All Read
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
          <CardDescription>
            {totalCount > 0
              ? `${totalCount} notification${totalCount !== 1 ? 's' : ''}`
              : 'No notifications yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select value={readFilter} onValueChange={(v) => { setReadFilter(v); setPage(1) }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1) }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITY_OPTIONS.map((opt) => (
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

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load notifications. Please try again.
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">
                {hasActiveFilters
                  ? 'No notifications match your filters.'
                  : 'No notifications yet.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Message</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification: Notification) => {
                    const Icon = TYPE_ICONS[notification.notification_type] || Info
                    return (
                      <TableRow
                        key={notification.uuid}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${!notification.is_read ? 'bg-muted/30' : ''}`}
                        onClick={() => handleRowClick(notification)}
                      >
                        <TableCell>
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {notification.notification_type_display}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={notification.is_read ? '' : 'font-semibold'}>
                            {notification.title}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-xs">
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {notification.message}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={PRIORITY_VARIANT[notification.priority] || 'outline'}>
                            {notification.priority_display}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {notification.is_read ? (
                            <Badge variant="secondary">Read</Badge>
                          ) : (
                            <Badge variant="default">Unread</Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatRelative(notification.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => markReadMutation.mutate(notification.uuid)}
                                title="Mark as read"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => dismissMutation.mutate(notification.uuid)}
                              title="Dismiss"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
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

      {/* Detail Sheet */}
      <Sheet open={!!selectedNotification} onOpenChange={(open) => { if (!open) setSelectedNotification(null) }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedNotification && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <SelectedIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-base leading-tight">
                      {selectedNotification.title}
                    </SheetTitle>
                    <SheetDescription className="mt-1">
                      {selectedNotification.notification_type_display}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Priority & Status */}
                <div className="flex items-center gap-3">
                  <Badge variant={PRIORITY_VARIANT[selectedNotification.priority] || 'outline'}>
                    {selectedNotification.priority_display} Priority
                  </Badge>
                  {selectedNotification.is_read ? (
                    <Badge variant="secondary">Read</Badge>
                  ) : (
                    <Badge variant="default">Unread</Badge>
                  )}
                </div>

                <Separator />

                {/* Message */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Message</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedNotification.message}
                  </p>
                </div>

                <Separator />

                {/* Details */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{formatDateTime(selectedNotification.created_at)}</p>
                    </div>
                    {selectedNotification.read_at && (
                      <div>
                        <p className="text-muted-foreground">Read at</p>
                        <p className="font-medium">{formatDateTime(selectedNotification.read_at)}</p>
                      </div>
                    )}
                    {selectedNotification.source_type && (
                      <div>
                        <p className="text-muted-foreground">Source</p>
                        <p className="font-medium">{selectedNotification.source_type}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {selectedNotification.link && (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => {
                        setSelectedNotification(null)
                        navigate(selectedNotification.link)
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Go to {selectedNotification.source_type || 'Related Page'}
                    </Button>
                  )}
                  {!selectedNotification.is_read && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        markReadMutation.mutate(selectedNotification.uuid)
                        setSelectedNotification({ ...selectedNotification, is_read: true })
                      }}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Mark as Read
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => dismissMutation.mutate(selectedNotification.uuid)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Dismiss Notification
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

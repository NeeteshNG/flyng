import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Check,
  Trash2,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  Upload,
  Wrench,
  Battery,
  UserPlus,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useFormat } from '@/hooks/use-format'
import { getErrorMessage } from '@/lib/api-error'
import notificationsApi, { type Notification } from '@/api/endpoints/notifications'

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

const PRIORITY_BORDER: Record<string, string> = {
  LOW: 'border-l-green-500',
  NORMAL: 'border-l-blue-500',
  HIGH: 'border-l-yellow-500',
  URGENT: 'border-l-red-500',
}

export function NotificationCenter() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { formatRelative } = useFormat()

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: listData } = useQuery({
    queryKey: ['notifications-popover'],
    queryFn: () =>
      notificationsApi.getNotifications({ page_size: 10 }).then((r) => r.data),
    refetchInterval: 30000,
  })

  const markReadMutation = useMutation({
    mutationFn: (uuid: string) => notificationsApi.markAsRead(uuid),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['notifications-unread-count'] })
      queryClient.refetchQueries({ queryKey: ['notifications-popover'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: (res) => {
      toast.success(`${res.data.count} notifications marked as read`, { duration: 4000 })
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
      queryClient.refetchQueries({ queryKey: ['notifications-unread-count'] })
      queryClient.refetchQueries({ queryKey: ['notifications-popover'] })
    },
  })

  const unreadCount = unreadData?.unread_count ?? 0
  const notifications = listData?.results ?? []

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.uuid)
    }
    if (notification.link) {
      navigate(notification.link)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = TYPE_ICONS[notification.notification_type] || Info
              const borderClass = PRIORITY_BORDER[notification.priority] || 'border-l-transparent'

              return (
                <div
                  key={notification.uuid}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 border-b border-l-2 px-4 py-3 transition-colors hover:bg-muted/50',
                    borderClass,
                    !notification.is_read && 'bg-muted/30'
                  )}
                  onClick={() => handleClick(notification)}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm',
                        !notification.is_read && 'font-semibold'
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {formatRelative(notification.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          markReadMutation.mutate(notification.uuid)
                        }}
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        dismissMutation.mutate(notification.uuid)
                      }}
                      title="Dismiss"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              className="h-auto w-full py-1.5 text-xs text-muted-foreground"
              onClick={() => navigate('/dashboard/notifications')}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

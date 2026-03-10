import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Eye, Trash2,
  ShoppingCart, Clock, CheckCircle, AlertTriangle,
  ChevronLeft, ChevronRight, X, Loader2,
  Play, Package, Truck, Check, Pause, Upload, Undo2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import ordersApi, { PickOrder } from '@/api/endpoints/orders'
import { getErrorMessage } from '@/lib/api-error'
import { CSVImportDialog } from '@/components/shared/csv-import-dialog'
import { ExportButton } from '@/components/shared/export-button'
import { useListPage } from '@/hooks/use-list-page'
import { useFormat } from '@/hooks/use-format'
import { usePermissions } from '@/hooks/use-permissions'
import OrderDetailSheet from './order-detail-sheet'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PICKING', label: 'Picking' },
  { value: 'PICKED', label: 'Picked' },
  { value: 'PACKING', label: 'Packing' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ON_HOLD', label: 'On Hold' },
]

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'DELIVERED': return 'default'
    case 'SHIPPED':
    case 'PACKED':
    case 'PICKED': return 'default'
    case 'PICKING':
    case 'PACKING':
    case 'CONFIRMED': return 'secondary'
    case 'CANCELLED': return 'destructive'
    case 'ON_HOLD': return 'outline'
    default: return 'outline'
  }
}

const priorityBadgeVariant = (priority: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (priority) {
    case 'URGENT': return 'destructive'
    case 'HIGH': return 'default'
    case 'NORMAL': return 'secondary'
    default: return 'outline'
  }
}

// States that can be reverted (have a previous state)
const REVERTABLE_STATUSES = ['CONFIRMED', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'SHIPPED']

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const { formatDate } = useFormat()
  const { canCreate, canUpdate, canDelete } = usePermissions()

  const {
    search, setSearch, page, setPage, pageSize,
    filters, setFilter, clearFilters, hasActiveFilters,
    detailOpen, setDetailOpen, selectedItem, handleView,
    getQueryParams,
  } = useListPage<PickOrder>({
    initialFilters: { status: 'all', priority: 'all' },
  })
  const [importOpen, setImportOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<PickOrder | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [revertDialogOpen, setRevertDialogOpen] = useState(false)
  const [orderToRevert, setOrderToRevert] = useState<PickOrder | null>(null)
  const [revertReason, setRevertReason] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', search, filters, page],
    queryFn: () => ordersApi.getOrders({ ...getQueryParams(), ordering: '-created_at' }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['orders-stats'],
    queryFn: () => ordersApi.getOrders({ page_size: 1000 }),
  })

  const orders = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  const allOrders = statsData?.data?.results || []
  const pendingCount = allOrders.filter((o) => o.status === 'PENDING').length
  const inProgressCount = allOrders.filter((o) => ['CONFIRMED', 'PICKING', 'PACKING'].includes(o.status)).length
  const completedCount = allOrders.filter((o) => ['PACKED', 'SHIPPED', 'DELIVERED'].includes(o.status)).length
  const overdueCount = allOrders.filter((o) => o.is_overdue).length

  // State transition mutations
  const transitionMutation = useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: string }) => {
      switch (action) {
        case 'confirm': return ordersApi.confirmOrder(uuid)
        case 'start-picking': return ordersApi.startPicking(uuid)
        case 'complete-picking': return ordersApi.completePicking(uuid)
        case 'pack': return ordersApi.packOrder(uuid)
        case 'ship': return ordersApi.shipOrder(uuid)
        case 'deliver': return ordersApi.deliverOrder(uuid)
        case 'hold': return ordersApi.holdOrder(uuid)
        default: throw new Error(`Unknown action: ${action}`)
      }
    },
    onSuccess: (_, { action }) => {
      const messages: Record<string, string> = {
        confirm: 'Order confirmed',
        'start-picking': 'Picking started',
        'complete-picking': 'Picking completed',
        pack: 'Order packed',
        ship: 'Order shipped',
        deliver: 'Order delivered',
        hold: 'Order put on hold',
      }
      toast.success(messages[action] || 'Order updated', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['orders'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['orders-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update order', { duration: 5000 })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ uuid, reason }: { uuid: string; reason: string }) =>
      ordersApi.cancelOrder(uuid, reason),
    onSuccess: () => {
      setCancelDialogOpen(false)
      setOrderToCancel(null)
      setCancelReason('')
      toast.success('Order cancelled successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['orders'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['orders-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to cancel order'), { duration: 5000 })
    },
  })

  const revertMutation = useMutation({
    mutationFn: ({ uuid, reason }: { uuid: string; reason: string }) =>
      ordersApi.revertOrder(uuid, reason),
    onSuccess: (res) => {
      setRevertDialogOpen(false)
      setOrderToRevert(null)
      setRevertReason('')
      toast.success(res.data?.message || 'Order reverted successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['orders'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['orders-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to revert order'), { duration: 5000 })
    },
  })

  const openCancelDialog = (order: PickOrder) => {
    setOrderToCancel(order)
    setCancelReason('')
    setCancelDialogOpen(true)
  }

  const openRevertDialog = (order: PickOrder) => {
    setOrderToRevert(order)
    setRevertReason('')
    setRevertDialogOpen(true)
  }

  const getNextActions = (order: PickOrder) => {
    const actions: { label: string; action: string; icon: React.ElementType }[] = []
    switch (order.status) {
      case 'PENDING':
        actions.push({ label: 'Confirm', action: 'confirm', icon: Check })
        break
      case 'CONFIRMED':
        actions.push({ label: 'Start Picking', action: 'start-picking', icon: Play })
        break
      case 'PICKING':
        actions.push({ label: 'Complete Picking', action: 'complete-picking', icon: CheckCircle })
        break
      case 'PICKED':
        actions.push({ label: 'Pack', action: 'pack', icon: Package })
        break
      case 'PACKED':
        actions.push({ label: 'Ship', action: 'ship', icon: Truck })
        break
      case 'SHIPPED':
        actions.push({ label: 'Deliver', action: 'deliver', icon: CheckCircle })
        break
    }
    if (!['DELIVERED', 'CANCELLED'].includes(order.status)) {
      actions.push({ label: 'Hold', action: 'hold', icon: Pause })
    }
    return actions
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage pick orders and fulfillment</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton exportType="orders" />
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          {canCreate('orders', 'pickorder') && (
            <Button onClick={() => window.location.href = '/dashboard/orders/create'}>
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendingCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{inProgressCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{completedCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{overdueCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order number, customer, reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.status} onValueChange={(v) => setFilter('status', v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(v) => setFilter('priority', v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
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

          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">Failed to load orders. Please try again.</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found. {hasActiveFilters ? 'Try adjusting your filters.' : 'Create your first order to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.uuid} className={order.is_overdue ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                      <TableCell>
                        <div>
                          <code className="font-medium text-sm">{order.order_number}</code>
                          {order.external_reference && (
                            <div className="text-xs text-muted-foreground">{order.external_reference}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name || '—'}</div>
                          {order.customer_code && (
                            <code className="text-xs text-muted-foreground">{order.customer_code}</code>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(order.status)}>
                          {order.status_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityBadgeVariant(order.priority)}>
                          {order.priority_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {order.picked_lines}/{order.total_lines}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className={order.is_overdue ? 'text-red-500 font-medium' : ''}>
                            {formatDate(order.due_date)}
                          </span>
                          {order.is_overdue && <AlertTriangle className="h-3 w-3 text-red-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(order)}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {getNextActions(order).length > 0 && <DropdownMenuSeparator />}
                            {getNextActions(order).map(({ label, action, icon: Icon }) => (
                              <DropdownMenuItem
                                key={action}
                                onClick={() => transitionMutation.mutate({ uuid: order.uuid, action })}
                                disabled={transitionMutation.isPending}
                              >
                                <Icon className="h-4 w-4 mr-2" /> {label}
                              </DropdownMenuItem>
                            ))}
                            {REVERTABLE_STATUSES.includes(order.status) && (
                              <DropdownMenuItem onClick={() => openRevertDialog(order)}>
                                <Undo2 className="h-4 w-4 mr-2" /> Revert
                              </DropdownMenuItem>
                            )}
                            {canDelete('orders', 'pickorder') && !['DELIVERED', 'CANCELLED'].includes(order.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openCancelDialog(order)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Cancel Order
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({totalCount} orders)</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <OrderDetailSheet open={detailOpen} onOpenChange={setDetailOpen} order={selectedItem} />

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel order{' '}
              <span className="font-medium">{orderToCancel?.order_number}</span>?
              Stock reservations will be released and deducted stock will be restored.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Why is this order being cancelled?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Order</Button>
            <Button
              variant="destructive"
              onClick={() => orderToCancel && cancelMutation.mutate({ uuid: orderToCancel.uuid, reason: cancelReason })}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert Order</DialogTitle>
            <DialogDescription>
              Revert order{' '}
              <span className="font-medium">{orderToRevert?.order_number}</span>{' '}
              from <span className="font-medium">{orderToRevert?.status_display}</span> to the previous state.
              Stock changes for this transition will be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revert-reason">Reason</Label>
            <Textarea
              id="revert-reason"
              placeholder="Why is this order being reverted?"
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertDialogOpen(false)}>Keep Current State</Button>
            <Button
              onClick={() => orderToRevert && revertMutation.mutate({ uuid: orderToRevert.uuid, reason: revertReason })}
              disabled={revertMutation.isPending}
            >
              {revertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revert Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        importType="ORDERS"
        onSuccess={() => queryClient.refetchQueries({ queryKey: ['orders'] })}
      />
    </div>
  )
}

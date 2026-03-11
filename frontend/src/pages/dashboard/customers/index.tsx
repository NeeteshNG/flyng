import { useQuery } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Eye, Trash2,
  Users, UserCheck, UserX, ShoppingCart,
  ChevronLeft, ChevronRight, X, Pencil,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import ordersApi, { Customer } from '@/api/endpoints/orders'
import { useDeleteDialog } from '@/hooks/use-delete-dialog'
import { useListPage } from '@/hooks/use-list-page'
import { usePermissions } from '@/hooks/use-permissions'
import CustomerFormSheet from './customer-form-sheet'
import CustomerDetailSheet from './customer-detail-sheet'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

export default function CustomersPage() {
  const { canCreate, canUpdate, canDelete } = usePermissions()

  const {
    search, setSearch, page, setPage, pageSize,
    filters, setFilter, clearFilters, hasActiveFilters,
    formOpen, setFormOpen, selectedItem, setSelectedItem, handleEdit,
    detailOpen, setDetailOpen, handleView,
    getQueryParams,
  } = useListPage<Customer>({
    initialFilters: { is_active: 'all' },
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', search, filters, page],
    queryFn: () => ordersApi.getCustomers({ ...getQueryParams(), ordering: 'name' }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: () => ordersApi.getCustomers({ page_size: 1000 }),
  })

  const customers = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  const allCustomers = statsData?.data?.results || []
  const totalCustomers = allCustomers.length
  const activeCount = allCustomers.filter((c) => c.is_active).length
  const inactiveCount = allCustomers.filter((c) => !c.is_active).length
  const withOrdersCount = allCustomers.filter((c) => c.order_count > 0).length

  const { deleteDialog, openDeleteDialog } = useDeleteDialog<Customer>({
    deleteFn: (customer) => ordersApi.deleteCustomer(customer.uuid),
    queryKeys: [['customers'], ['customers-stats']],
    successMessage: 'Customer deactivated successfully',
    errorMessage: 'Failed to deactivate customer',
  })

  const handleAdd = () => {
    setSelectedItem(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage customer records and contact information</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate('orders', 'customer') && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalCustomers}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{inactiveCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{withOrdersCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, email, contact person..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filters.is_active} onValueChange={(v) => setFilter('is_active', v)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">Failed to load customers</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters ? 'No customers match your filters' : 'No customers yet. Add your first customer to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.email && (
                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{customer.code}</code>
                      </TableCell>
                      <TableCell>{customer.contact_person || '—'}</TableCell>
                      <TableCell>{customer.phone || '—'}</TableCell>
                      <TableCell>{customer.order_count}</TableCell>
                      <TableCell>
                        {customer.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(customer)}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            {canUpdate('orders', 'customer') && (
                              <DropdownMenuItem onClick={() => handleEdit(customer)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete('orders', 'customer') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => openDeleteDialog(customer)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Deactivate
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
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={selectedItem}
      />

      <CustomerDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        customer={selectedItem}
      />

      {deleteDialog}
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  Package, CheckCircle, XCircle, Loader2,
  ChevronLeft, ChevronRight, X, AlertTriangle, Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import inventoryApi, { InventoryItem } from '@/api/endpoints/inventory'
import { getErrorMessage } from '@/lib/api-error'
import { CSVImportDialog } from '@/components/shared/csv-import-dialog'
import { ExportButton } from '@/components/shared/export-button'
import ItemFormSheet from './item-form-sheet'
import ItemDetailSheet from './item-detail-sheet'

const PAGE_SIZE = 20

export default function ItemsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      ordering: 'sku',
      page,
      page_size: PAGE_SIZE,
    }
    if (statusFilter === 'active') params.is_active = true
    else if (statusFilter === 'inactive') params.is_active = false
    if (categoryFilter !== 'all') params.category = parseInt(categoryFilter)
    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory-items', search, statusFilter, categoryFilter, page],
    queryFn: () => inventoryApi.getInventoryItems(getFilterParams()),
  })

  const { data: statsData } = useQuery({
    queryKey: ['inventory-items-stats'],
    queryFn: () => inventoryApi.getItemStats(),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['item-categories-filter'],
    queryFn: () => inventoryApi.getItemCategories({ is_active: true, page_size: 1000 }),
  })

  const items = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const stats = statsData?.data
  const totalStats = stats?.total || 0
  const activeCount = stats?.active || 0
  const lowStockCount = stats?.low_stock || 0
  const totalStockQty = stats?.total_stock_qty || 0
  const filterCategories = categoriesData?.data?.results || []

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => inventoryApi.deleteInventoryItem(uuid),
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      toast.success('Item deleted successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['inventory-items'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['inventory-items-stats'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to delete item', { duration: 5000 })
    },
  })

  const handleAdd = () => { setSelectedItem(null); setFormOpen(true) }
  const handleEdit = (item: InventoryItem) => { setSelectedItem(item); setFormOpen(true) }
  const handleView = (item: InventoryItem) => { setSelectedItem(item); setDetailOpen(true) }
  const handleDelete = (item: InventoryItem) => { setItemToDelete(item); setDeleteDialogOpen(true) }
  const confirmDelete = () => { if (itemToDelete) deleteMutation.mutate(itemToDelete.uuid) }

  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setPage(1) }
  const hasActiveFilters = search || statusFilter !== 'all' || categoryFilter !== 'all'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Items</h1>
          <p className="text-muted-foreground">Manage your product catalog and SKUs</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton exportType="items" />
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalStats}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeCount}</div></CardContent>
        </Card>
        <Link to="/dashboard/low-stock" className="block">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-yellow-500' : ''}`}>{lowStockCount}</div>
              <p className="text-xs text-muted-foreground mt-1">View low stock alerts</p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalStockQty}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item List</CardTitle>
          <CardDescription>View and manage all inventory items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by SKU, name, barcode..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10" />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {filterCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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
            <div className="text-center py-8 text-muted-foreground">Failed to load items. Please try again.</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found. {hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first inventory item to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isLowStock = item.min_stock_level > 0 && (item.total_stock || 0) < item.min_stock_level
                    return (
                      <TableRow key={item.uuid}>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">{item.sku}</code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.barcode && <div className="text-xs text-muted-foreground">{item.barcode}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.category_name || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{item.uom_display}</Badge></TableCell>
                        <TableCell>{item.unit_price ? `₹${item.unit_price}` : '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant={isLowStock ? 'destructive' : 'secondary'}>
                              {item.total_stock ?? 0}
                            </Badge>
                            {isLowStock && (
                              <>
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                <span className="text-xs text-muted-foreground">/ {item.min_stock_level}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.is_active ? 'success' : 'secondary'}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(item.created_at)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(item)}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(item)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({totalCount} items)</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ItemFormSheet open={formOpen} onOpenChange={setFormOpen} item={selectedItem} />
      <ItemDetailSheet open={detailOpen} onOpenChange={setDetailOpen} item={selectedItem} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete item{' '}
              <span className="font-medium">{itemToDelete?.sku} - {itemToDelete?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        importType="ITEMS"
        onSuccess={() => queryClient.refetchQueries({ queryKey: ['inventory-items'] })}
      />
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  Warehouse, CheckCircle, Loader2,
  ChevronLeft, ChevronRight, X, AlertTriangle, Package,
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

import inventoryApi, { InventoryStock } from '@/api/endpoints/inventory'
import { getErrorMessage } from '@/lib/api-error'
import StockFormSheet from './stock-form-sheet'
import StockDetailSheet from './stock-detail-sheet'

const PAGE_SIZE = 20

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState<InventoryStock | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [stockToDelete, setStockToDelete] = useState<InventoryStock | null>(null)

  const getFilterParams = () => {
    const params: Record<string, unknown> = {
      search: search || undefined,
      ordering: '-created_at',
      page,
      page_size: PAGE_SIZE,
    }
    return params
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory-stock', search, page],
    queryFn: () => inventoryApi.getInventoryStock(getFilterParams()),
  })

  const { data: statsData } = useQuery({
    queryKey: ['inventory-stock-stats'],
    queryFn: () => inventoryApi.getInventoryStock({ page_size: 1000 }),
  })

  const stocks = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const allStocks = statsData?.data?.results || []
  const totalStats = statsData?.data?.count || 0
  const totalQuantity = allStocks.reduce((sum, s) => sum + s.quantity, 0)
  const totalReserved = allStocks.reduce((sum, s) => sum + s.reserved_quantity, 0)
  const expiredCount = allStocks.filter((s) => s.is_expired).length

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => inventoryApi.deleteStockRecord(uuid),
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setStockToDelete(null)
      toast.success('Stock record deleted successfully', { duration: 4000 })
      queryClient.refetchQueries({ queryKey: ['inventory-stock'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['inventory-stock-stats'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['inventory-items'], type: 'all' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to delete stock record', { duration: 5000 })
    },
  })

  const handleAdd = () => { setSelectedStock(null); setFormOpen(true) }
  const handleEdit = (stock: InventoryStock) => { setSelectedStock(stock); setFormOpen(true) }
  const handleView = (stock: InventoryStock) => { setSelectedStock(stock); setDetailOpen(true) }
  const handleDelete = (stock: InventoryStock) => { setStockToDelete(stock); setDeleteDialogOpen(true) }
  const confirmDelete = () => { if (stockToDelete) deleteMutation.mutate(stockToDelete.uuid) }

  const clearFilters = () => { setSearch(''); setPage(1) }
  const hasActiveFilters = !!search

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Stock</h1>
          <p className="text-muted-foreground">Track stock quantities by item and bin</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stock
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Records</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalStats}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalQuantity}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalReserved}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{expiredCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Records</CardTitle>
          <CardDescription>View and manage inventory stock by bin and item</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by SKU, item name, bin code, lot..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10" />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">Failed to load stock records. Please try again.</div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stock records found. {hasActiveFilters ? 'Try adjusting your search.' : 'Add your first stock record to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Bin</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocks.map((stock) => (
                    <TableRow key={stock.uuid}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{stock.item_name}</div>
                          <code className="text-xs text-muted-foreground">{stock.item_sku}</code>
                        </div>
                      </TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{stock.bin_code}</code></TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{stock.location_code}</TableCell>
                      <TableCell><Badge variant="secondary">{stock.quantity}</Badge></TableCell>
                      <TableCell>
                        {stock.reserved_quantity > 0
                          ? <Badge variant="outline">{stock.reserved_quantity}</Badge>
                          : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell><span className="font-medium">{stock.available_quantity}</span></TableCell>
                      <TableCell className="text-muted-foreground">{stock.lot_number || '—'}</TableCell>
                      <TableCell>
                        {stock.expiry_date ? (
                          <div className="flex items-center gap-1">
                            <span className={stock.is_expired ? 'text-red-500' : ''}>{formatDate(stock.expiry_date)}</span>
                            {stock.is_expired && <AlertTriangle className="h-3 w-3 text-red-500" />}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(stock)}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(stock)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(stock)} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
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
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({totalCount} records)</p>
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

      <StockFormSheet open={formOpen} onOpenChange={setFormOpen} stock={selectedStock} />
      <StockDetailSheet open={detailOpen} onOpenChange={setDetailOpen} stock={selectedStock} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stock Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this stock record for{' '}
              <span className="font-medium">{stockToDelete?.item_name}</span> in bin{' '}
              <span className="font-medium">{stockToDelete?.bin_code}</span>?
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
    </div>
  )
}

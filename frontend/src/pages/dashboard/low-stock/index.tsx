import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Search, AlertTriangle, XCircle, ArrowDown, TrendingDown,
  ChevronLeft, ChevronRight, X, MapPin,
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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'

import inventoryApi, { type LowStockItem } from '@/api/endpoints/inventory'
import { ExportButton } from '@/components/shared/export-button'
import { useFormat } from '@/hooks/use-format'

const PAGE_SIZE = 20

function getDeficitBadge(item: LowStockItem) {
  if (item.total_stock === 0) {
    return <Badge variant="destructive">Out of Stock</Badge>
  }
  const pct = (item.deficit / item.min_stock_level) * 100
  if (pct >= 75) {
    return <Badge className="bg-red-500 hover:bg-red-600 text-white">-{item.deficit}</Badge>
  }
  if (pct >= 50) {
    return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">-{item.deficit}</Badge>
  }
  return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">-{item.deficit}</Badge>
}

export default function LowStockPage() {
  const { formatNumber } = useFormat()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [ordering, setOrdering] = useState('-deficit')
  const [page, setPage] = useState(1)

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['low-stock-stats'],
    queryFn: () => inventoryApi.getLowStockStats(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['low-stock-items', search, categoryFilter, ordering, page],
    queryFn: () => inventoryApi.getLowStockItems({
      search: search || undefined,
      category: categoryFilter !== 'all' ? parseInt(categoryFilter) : undefined,
      ordering,
      page,
      page_size: PAGE_SIZE,
    }),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['item-categories-filter'],
    queryFn: () => inventoryApi.getItemCategories({ is_active: true, page_size: 1000 }),
  })

  const items = data?.data?.results || []
  const totalCount = data?.data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const stats = statsData?.data
  const categories = categoriesData?.data?.results || []

  const clearFilters = () => {
    setSearch('')
    setCategoryFilter('all')
    setOrdering('-deficit')
    setPage(1)
  }
  const hasActiveFilters = search || categoryFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            Low Stock Alerts
          </h1>
          <p className="text-muted-foreground">
            Items below their minimum stock level that need attention
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton exportType="low-stock" />
          <Button variant="outline" asChild>
            <Link to="/dashboard/items">View All Items</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {formatNumber(stats.total_low_stock)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical (Zero Stock)</CardTitle>
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.critical > 0 ? 'text-red-500' : ''}`}>
                {formatNumber(stats.critical)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Below Reorder Point</CardTitle>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <ArrowDown className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.below_reorder_point)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deficit</CardTitle>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingDown className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.total_deficit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                units needed to reach min levels
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Items Needing Attention</CardTitle>
          <CardDescription>Sorted by deficit severity by default</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by SKU or name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ordering} onValueChange={(v) => { setOrdering(v); setPage(1) }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-deficit">Deficit (High to Low)</SelectItem>
                <SelectItem value="deficit">Deficit (Low to High)</SelectItem>
                <SelectItem value="total_stock">Stock (Low to High)</SelectItem>
                <SelectItem value="-total_stock">Stock (High to Low)</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="-name">Name (Z-A)</SelectItem>
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
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? 'No low stock items match your filters.'
                  : 'All items are well stocked. No alerts at this time.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Level</TableHead>
                    <TableHead className="text-right">Deficit</TableHead>
                    <TableHead className="text-right">Reorder Qty</TableHead>
                    <TableHead>Locations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.uuid}>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
                          {item.sku}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        {item.barcode && (
                          <div className="text-xs text-muted-foreground">{item.barcode}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.category_name || '\u2014'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.total_stock === 0 ? 'text-red-500 font-bold' : 'font-medium'}>
                          {item.total_stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.min_stock_level}
                      </TableCell>
                      <TableCell className="text-right">
                        {getDeficitBadge(item)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.reorder_quantity > 0 ? item.reorder_quantity : '\u2014'}
                      </TableCell>
                      <TableCell>
                        {item.stock_locations.length > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                                  <MapPin className="h-3 w-3" />
                                  {item.stock_locations.length} location
                                  {item.stock_locations.length > 1 ? 's' : ''}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  {item.stock_locations.map((loc, idx) => (
                                    <div key={idx} className="text-xs">
                                      {loc.warehouse_name} / {loc.bin_code}: {loc.quantity} units
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-red-500">No stock</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} items)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

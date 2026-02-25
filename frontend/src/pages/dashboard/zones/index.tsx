import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Layers,
  Building2,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Plane,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import warehousesApi, { WarehouseZone } from '@/api/endpoints/warehouses'
import ZoneFormSheet from './zone-form-sheet'
import ZoneDetailSheet from './zone-detail-sheet'

const ZONE_TYPES = [
  { value: 'STORAGE', label: 'Storage', color: 'bg-blue-500' },
  { value: 'PICKING', label: 'Picking', color: 'bg-green-500' },
  { value: 'STAGING', label: 'Staging', color: 'bg-yellow-500' },
  { value: 'SHIPPING', label: 'Shipping', color: 'bg-purple-500' },
  { value: 'RECEIVING', label: 'Receiving', color: 'bg-orange-500' },
  { value: 'OTHER', label: 'Other', color: 'bg-gray-500' },
]

export default function ZonesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedZone, setSelectedZone] = useState<WarehouseZone | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['zones', search, statusFilter, typeFilter],
    queryFn: () =>
      warehousesApi.getZones({
        search: search || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        zone_type: typeFilter === 'all' ? undefined : typeFilter,
        ordering: 'warehouse__name,name',
      }),
  })

  const zones = data?.data?.results || []
  const totalCount = data?.data?.count || 0

  const handleAdd = () => {
    setSelectedZone(null)
    setFormOpen(true)
  }

  const handleEdit = (zone: WarehouseZone) => {
    setSelectedZone(zone)
    setFormOpen(true)
  }

  const handleView = (zone: WarehouseZone) => {
    setSelectedZone(zone)
    setDetailOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getZoneTypeInfo = (type: string) => {
    return ZONE_TYPES.find((t) => t.value === type) || ZONE_TYPES[5]
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zones</h1>
          <p className="text-muted-foreground">
            Manage warehouse zones and operational areas
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Zone
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Zones</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {zones.filter((z) => z.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Zones</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {zones.filter((z) => z.zone_type === 'STORAGE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Fly Zones</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {zones.filter((z) => z.is_no_fly_zone).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Zone List</CardTitle>
          <CardDescription>
            View and manage all warehouse zones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search zones..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Zone Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ZONE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load zones. Please try again.
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No zones found. Add your first zone to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>GCS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone) => {
                    const typeInfo = getZoneTypeInfo(zone.zone_type)
                    return (
                      <TableRow key={zone.uuid}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{zone.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {zone.code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{zone.warehouse_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="gap-1"
                          >
                            <div className={`h-2 w-2 rounded-full ${typeInfo.color}`} />
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            Floor {zone.floor_level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {zone.gcs_count || 0} GCS
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge
                              variant={zone.is_active ? 'success' : 'secondary'}
                            >
                              {zone.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {zone.is_no_fly_zone && (
                              <Badge variant="destructive">No-Fly</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(zone.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(zone)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(zone)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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
        </CardContent>
      </Card>

      {/* Form Sheet */}
      <ZoneFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        zone={selectedZone}
      />

      {/* Detail Sheet */}
      <ZoneDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        zone={selectedZone}
      />
    </div>
  )
}

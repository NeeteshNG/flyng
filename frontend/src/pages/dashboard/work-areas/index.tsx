import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Radio,
  Plane,
  Link,
  Unlink,
  Box,
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

import warehousesApi, { DroneWorkArea } from '@/api/endpoints/warehouses'
import WorkAreaFormSheet from './work-area-form-sheet'
import WorkAreaDetailSheet from './work-area-detail-sheet'

const AREA_TYPES = [
  { value: 'TETHERED', label: 'Tethered', icon: Link, color: 'bg-blue-500' },
  { value: 'UNTETHERED', label: 'Untethered', icon: Unlink, color: 'bg-green-500' },
]

export default function WorkAreasPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedWorkArea, setSelectedWorkArea] = useState<DroneWorkArea | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['work-areas', search, statusFilter, typeFilter],
    queryFn: () =>
      warehousesApi.getWorkAreas({
        search: search || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        area_type: typeFilter === 'all' ? undefined : typeFilter,
        ordering: 'ground_control_station__zone__warehouse__name,name',
      }),
  })

  const workAreas = data?.data?.results || []
  const totalCount = data?.data?.count || 0

  const handleAdd = () => {
    setSelectedWorkArea(null)
    setFormOpen(true)
  }

  const handleEdit = (workArea: DroneWorkArea) => {
    setSelectedWorkArea(workArea)
    setFormOpen(true)
  }

  const handleView = (workArea: DroneWorkArea) => {
    setSelectedWorkArea(workArea)
    setDetailOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getAreaTypeInfo = (type: string) => {
    return AREA_TYPES.find((t) => t.value === type) || AREA_TYPES[1]
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Work Areas</h1>
          <p className="text-muted-foreground">
            Manage drone work areas and flight zones
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Work Area
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Work Areas</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
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
              {workAreas.filter((wa) => wa.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tethered</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workAreas.filter((wa) => wa.area_type === 'TETHERED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Untethered</CardTitle>
            <Unlink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workAreas.filter((wa) => wa.area_type === 'UNTETHERED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Work Area List</CardTitle>
          <CardDescription>
            View and manage all drone work areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search work areas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Area Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {AREA_TYPES.map((type) => (
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
              Failed to load work areas. Please try again.
            </div>
          ) : workAreas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No work areas found. Add your first work area to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Area</TableHead>
                    <TableHead>GCS</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Max Drones</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workAreas.map((workArea) => {
                    const typeInfo = getAreaTypeInfo(workArea.area_type)
                    const TypeIcon = typeInfo.icon
                    return (
                      <TableRow key={workArea.uuid}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{workArea.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {workArea.code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Radio className="h-4 w-4 text-muted-foreground" />
                            <span>{workArea.gcs_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{workArea.zone_name}</div>
                            <div className="text-muted-foreground">{workArea.warehouse_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <TypeIcon className="h-3 w-3" />
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Plane className="h-4 w-4 text-muted-foreground" />
                            <span>{workArea.max_drones}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={workArea.is_active ? 'success' : 'secondary'}>
                            {workArea.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(workArea.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(workArea)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(workArea)}>
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
      <WorkAreaFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        workArea={selectedWorkArea}
      />

      {/* Detail Sheet */}
      <WorkAreaDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        workArea={selectedWorkArea}
      />
    </div>
  )
}

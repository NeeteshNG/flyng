import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from 'recharts'
import { Link } from 'react-router-dom'
import {
  Plane, Package, ShoppingCart, AlertTriangle,
  TrendingUp, Activity, Battery, Warehouse,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import dashboardApi, { DashboardStats } from '@/api/endpoints/dashboard'
import { useFormat } from '@/hooks/use-format'

const getJobStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'COMPLETED': return 'default'
    case 'IN_PROGRESS': return 'secondary'
    case 'QUEUED':
    case 'ASSIGNED': return 'outline'
    case 'FAILED':
    case 'CANCELLED': return 'destructive'
    default: return 'outline'
  }
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

export default function DashboardHome() {
  const { formatRelative, formatNumber } = useFormat()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
  })

  const stats: DashboardStats | null = data?.data?.data || null

  // Format chart data with short day labels
  const chartData = (stats?.order_activity || []).map((d) => {
    const date = new Date(d.date + 'T00:00:00')
    return {
      name: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      orders: d.count,
    }
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your warehouse operations.
        </p>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Active Drones */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Drones
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Plane className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.drones.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.drones.in_flight} in flight, {stats.drones.available} available
              </p>
            </CardContent>
          </Card>

          {/* Total Items */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Items
              </CardTitle>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Package className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.items.total_stock_qty)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.items.total} unique items in stock
              </p>
            </CardContent>
          </Card>

          {/* Orders */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Orders
              </CardTitle>
              <div className="p-2 rounded-lg bg-green-500/10">
                <ShoppingCart className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orders.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.orders.today} today, {stats.orders.in_progress} in progress
              </p>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Link to="/dashboard/low-stock" className="block">
            <Card className="relative overflow-hidden transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Low Stock Alerts
                </CardTitle>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.items.low_stock_count > 0 ? 'text-amber-500' : ''}`}>
                  {stats.items.low_stock_count}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.items.low_stock_count > 0 ? 'Needs attention' : 'All items well stocked'}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      ) : null}

      {/* Quick Stats Bar */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-muted/50">
              <CardContent className="flex items-center gap-4 py-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div>
                  <Skeleton className="h-7 w-12 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 grid-cols-3">
          <Card className="bg-muted/50">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Warehouse className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.warehouses.total}</p>
                <p className="text-xs text-muted-foreground">Warehouses</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Battery className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.batteries.total}</p>
                <p className="text-xs text-muted-foreground">Batteries</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.jobs.completed}</p>
                <p className="text-xs text-muted-foreground">Jobs Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts and tables row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Order Activity Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Order Activity
                </CardTitle>
                <CardDescription>Orders processed over the last 7 days</CardDescription>
              </div>
              <Badge variant="secondary">Last 7 days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    formatter={(value: number) => [value, 'Orders']}
                  />
                  <Bar
                    dataKey="orders"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No order data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Jobs
                </CardTitle>
                <CardDescription>Latest drone job activities</CardDescription>
              </div>
              {stats && (
                <Badge variant="outline">{stats.jobs.total} total</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : stats && stats.recent_jobs.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{job.job_number}</p>
                        <Badge
                          variant={getJobStatusVariant(job.status)}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {job.status_display}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job.drone_name || 'Unassigned'}
                        {job.source_bin_code && ` \u2022 ${job.source_bin_code}`}
                        {job.destination_bin_code && ` \u2192 ${job.destination_bin_code}`}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {formatRelative(job.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No recent jobs</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

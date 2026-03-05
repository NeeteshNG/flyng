import { useQuery } from '@tanstack/react-query'
import {
  Area, AreaChart, Cell, Pie, PieChart,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend,
} from 'recharts'
// Legend is used for the area chart only; pie charts use a custom legend
import {
  BarChart3, Plane, ShoppingCart, Briefcase,
  Battery, Package, AlertTriangle, PackageX,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import dashboardApi, { AnalyticsData } from '@/api/endpoints/dashboard'

// Status label mapping for human-readable names
const STATUS_LABELS: Record<string, string> = {
  // Drones
  AVAILABLE: 'Available',
  IN_FLIGHT: 'In Flight',
  CHARGING: 'Charging',
  MAINTENANCE: 'Maintenance',
  OFFLINE: 'Offline',
  IDLE: 'Idle',
  RETURNING: 'Returning',
  // Orders
  PENDING: 'Pending',
  PICKING: 'Picking',
  PACKING: 'Packing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
  // Jobs
  QUEUED: 'Queued',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  PAUSED: 'Paused',
  // Batteries
  HEALTHY: 'Healthy',
  DEGRADED: 'Degraded',
  CRITICAL: 'Critical',
  RETIRED: 'Retired',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  UNKNOWN: 'Unknown',
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(217, 91%, 60%)',    // blue
  'hsl(142, 71%, 45%)',    // green
  'hsl(48, 96%, 53%)',     // yellow
  'hsl(0, 84%, 60%)',      // red
  'hsl(262, 83%, 58%)',    // purple
  'hsl(25, 95%, 53%)',     // orange
  'hsl(174, 72%, 56%)',    // teal
]

function formatLabel(status: string): string {
  return STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function ChartSkeleton({ height = 250 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} />
}

function StatusPieChart({
  data,
  title,
  description,
  icon: Icon,
}: {
  data: { name: string; value: number }[]
  title: string
  description: string
  icon: React.ElementType
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const chartData = data.map((d) => ({ ...d, label: formatLabel(d.name) }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="label"
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  formatter={(value: number, name: string) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
              {chartData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              {total} total
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => dashboardApi.getAnalytics(),
  })

  const analytics: AnalyticsData | null = data?.data?.data || null

  // Format chart dates to short labels
  const activityData = (analytics?.activity || []).map((d) => {
    const date = new Date(d.date + 'T00:00:00')
    return {
      name: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      orders: d.orders,
      jobs: d.jobs,
    }
  })

  const inventory = analytics?.inventory

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Analytics
        </h1>
        <p className="text-muted-foreground">
          Insights and trends across your warehouse operations.
        </p>
      </div>

      {/* Inventory summary cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      ) : inventory ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventory.total_items}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Stock</CardTitle>
              <Package className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{inventory.in_stock}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${inventory.low_stock > 0 ? 'text-yellow-500' : ''}`}>
                {inventory.low_stock}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
              <PackageX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${inventory.out_of_stock > 0 ? 'text-red-500' : ''}`}>
                {inventory.out_of_stock}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Activity trend chart (30 days) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Activity Trends
          </CardTitle>
          <CardDescription>Orders and jobs over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton height={350} />
          ) : activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={activityData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
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
                />
                <Legend iconType="circle" iconSize={8} />
                <Area
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke="hsl(217, 91%, 60%)"
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="jobs"
                  name="Jobs"
                  stroke="hsl(142, 71%, 45%)"
                  fillOpacity={1}
                  fill="url(#colorJobs)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center">
              <p className="text-muted-foreground">No activity data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status distribution charts */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </CardHeader>
              <CardContent><ChartSkeleton height={200} /></CardContent>
            </Card>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatusPieChart
            data={analytics.distributions.orders}
            title="Order Status"
            description="Distribution of orders by status"
            icon={ShoppingCart}
          />
          <StatusPieChart
            data={analytics.distributions.jobs}
            title="Job Status"
            description="Distribution of drone jobs by status"
            icon={Briefcase}
          />
          <StatusPieChart
            data={analytics.distributions.drones}
            title="Drone Status"
            description="Current status of all drones"
            icon={Plane}
          />
          <StatusPieChart
            data={analytics.distributions.batteries}
            title="Battery Status"
            description="Current status of all batteries"
            icon={Battery}
          />
          <StatusPieChart
            data={analytics.distributions.battery_health}
            title="Battery Health"
            description="Health status of all batteries"
            icon={Battery}
          />
        </div>
      ) : null}
    </div>
  )
}

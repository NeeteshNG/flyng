import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend,
} from 'recharts'
import type { DateRange } from 'react-day-picker'
import {
  BarChart3, Plane, ShoppingCart, Briefcase, Battery,
  Package, AlertTriangle, PackageX, Target, Clock,
  Timer, Gauge, Wrench, Zap, HardDrive, PackageSearch,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { KpiCard } from '@/components/shared/kpi-card'

import dashboardApi, {
  type AnalyticsData,
  type OrderAnalytics,
  type FleetAnalytics,
  type InventoryAnalytics,
  type DateRangeParams,
} from '@/api/endpoints/dashboard'

// =============================================================================
// Constants
// =============================================================================

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available', IN_FLIGHT: 'In Flight', CHARGING: 'Charging',
  MAINTENANCE: 'Maintenance', OFFLINE: 'Offline', IDLE: 'Idle', ERROR: 'Error',
  PENDING: 'Pending', CONFIRMED: 'Confirmed', PICKING: 'Picking', PICKED: 'Picked',
  PACKING: 'Packing', PACKED: 'Packed', SHIPPED: 'Shipped', DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled', ON_HOLD: 'On Hold',
  COMPLETED: 'Completed', FAILED: 'Failed',
  NEW: 'New', QUEUED: 'Queued', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress', PAUSED: 'Paused',
  LOW: 'Low', NORMAL: 'Normal', HIGH: 'High', URGENT: 'Urgent',
  PICK: 'Pick', SCAN: 'Scan', COUNT: 'Count', MOVE: 'Move', RETURN_HOME: 'Return Home',
  IN_USE: 'In Use', FAULTY: 'Faulty', RETIRED: 'Retired',
  EXCELLENT: 'Excellent', GOOD: 'Good', FAIR: 'Fair', POOR: 'Poor', REPLACE: 'Replace',
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(48, 96%, 53%)',
  'hsl(0, 84%, 60%)',
  'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)',
  'hsl(174, 72%, 56%)',
]

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--popover-foreground))',
}

function formatLabel(s: string): string {
  return STATUS_LABELS[s] || s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function ChartSkeleton({ height = 250 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} />
}

// =============================================================================
// Reusable chart components
// =============================================================================

function StatusPieChart({
  data, title, description, icon: Icon,
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
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" nameKey="label">
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name: string) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
              {chartData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">{total} total</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TimeSeriesChart({
  data, title, description, icon: Icon, dataKeys, colors, height = 300,
}: {
  data: { period?: string; date?: string; [key: string]: unknown }[]
  title: string
  description: string
  icon: React.ElementType
  dataKeys: { key: string; name: string }[]
  colors: string[]
  height?: number
}) {
  const xKey = data[0]?.period !== undefined ? 'period' : 'date'
  const formatted = data.map((d) => {
    const raw = (d[xKey] as string) || ''
    const dt = new Date(raw + 'T00:00:00')
    return { ...d, label: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {formatted.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                {dataKeys.map((dk, i) => (
                  <linearGradient key={dk.key} id={`grad-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[i]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors[i]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} />
              {dataKeys.map((dk, i) => (
                <Area key={dk.key} type="monotone" dataKey={dk.key} name={dk.name} stroke={colors[i]} fillOpacity={1} fill={`url(#grad-${dk.key})`} strokeWidth={2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function HorizontalBarChart({
  data, title, description, icon: Icon, nameKey = 'name', valueKey = 'value',
}: {
  data: Record<string, unknown>[]
  title: string
  description: string
  icon: React.ElementType
  nameKey?: string
  valueKey?: string
}) {
  const formatted = data.map((d) => ({
    ...d,
    label: formatLabel(String(d[nameKey])),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {formatted.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, formatted.length * 40)}>
            <BarChart data={formatted} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey={valueKey} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Tab content components
// =============================================================================

function OverviewTab({ analytics, isLoading }: { analytics: AnalyticsData | null; isLoading: boolean }) {
  const activityData = (analytics?.activity || []).map((d) => ({
    date: d.date,
    orders: d.orders,
    jobs: d.jobs,
  }))

  const inventory = analytics?.inventory

  return (
    <div className="space-y-6">
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
            <CardContent><div className="text-2xl font-bold">{inventory.total_items}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Stock</CardTitle>
              <Package className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-500">{inventory.in_stock}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${inventory.low_stock > 0 ? 'text-yellow-500' : ''}`}>{inventory.low_stock}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
              <PackageX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${inventory.out_of_stock > 0 ? 'text-red-500' : ''}`}>{inventory.out_of_stock}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Activity trend chart */}
      {isLoading ? (
        <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={350} /></CardContent></Card>
      ) : (
        <TimeSeriesChart
          data={activityData}
          title="Activity Trends"
          description="Orders and jobs over the selected period"
          icon={BarChart3}
          dataKeys={[
            { key: 'orders', name: 'Orders' },
            { key: 'jobs', name: 'Jobs' },
          ]}
          colors={['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)']}
          height={350}
        />
      )}

      {/* Status distributions */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={200} /></CardContent></Card>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatusPieChart data={analytics.distributions.orders} title="Order Status" description="Distribution of orders by status" icon={ShoppingCart} />
          <StatusPieChart data={analytics.distributions.jobs} title="Job Status" description="Distribution of drone jobs by status" icon={Briefcase} />
          <StatusPieChart data={analytics.distributions.drones} title="Drone Status" description="Current status of all drones" icon={Plane} />
          <StatusPieChart data={analytics.distributions.batteries} title="Battery Status" description="Current status of all batteries" icon={Battery} />
          <StatusPieChart data={analytics.distributions.battery_health} title="Battery Health" description="Health status of all batteries" icon={Battery} />
        </div>
      ) : null}
    </div>
  )
}

function OrdersTab({ dateParams, isLoading: parentLoading }: { dateParams: DateRangeParams; isLoading?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-orders', dateParams],
    queryFn: () => dashboardApi.getOrderAnalytics(dateParams),
  })
  const analytics: OrderAnalytics | null = data?.data?.data || null
  const loading = isLoading || parentLoading

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Total Orders" icon={ShoppingCart} iconColor="text-blue-500" isLoading={loading}
          value={analytics?.kpis.total_orders.value ?? 0}
          changePercent={analytics?.kpis.total_orders.change_percent}
          trend={analytics?.kpis.total_orders.trend} />
        <KpiCard title="Fulfillment Rate" icon={Target} iconColor="text-green-500" suffix="%" isLoading={loading}
          value={analytics?.kpis.fulfillment_rate.value ?? 0}
          changePercent={analytics?.kpis.fulfillment_rate.change_percent}
          trend={analytics?.kpis.fulfillment_rate.trend} />
        <KpiCard title="Avg Cycle Time" icon={Clock} iconColor="text-purple-500" suffix="h" isLoading={loading} invertTrend
          value={analytics?.kpis.avg_cycle_time_hours.value ?? 0}
          changePercent={analytics?.kpis.avg_cycle_time_hours.change_percent}
          trend={analytics?.kpis.avg_cycle_time_hours.trend} />
        <KpiCard title="Overdue Orders" icon={AlertTriangle} iconColor="text-red-500" isLoading={loading} invertTrend
          value={analytics?.kpis.overdue_count.value ?? 0}
          changePercent={analytics?.kpis.overdue_count.change_percent}
          trend={analytics?.kpis.overdue_count.trend} />
        <KpiCard title="Pick Accuracy" icon={Target} iconColor="text-teal-500" suffix="%" isLoading={loading}
          value={analytics?.kpis.picking_accuracy.value ?? 0}
          changePercent={analytics?.kpis.picking_accuracy.change_percent}
          trend={analytics?.kpis.picking_accuracy.trend} />
      </div>

      {/* Orders over time */}
      {loading ? (
        <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={300} /></CardContent></Card>
      ) : (
        <TimeSeriesChart
          data={analytics?.orders_over_time || []}
          title="Orders Over Time"
          description="New, completed, and cancelled orders"
          icon={ShoppingCart}
          dataKeys={[
            { key: 'total', name: 'Total' },
            { key: 'completed', name: 'Completed' },
            { key: 'cancelled', name: 'Cancelled' },
          ]}
          colors={['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)']}
        />
      )}

      {/* Distributions + Top Items */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <Card><CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={200} /></CardContent></Card>
            <Card><CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={200} /></CardContent></Card>
          </>
        ) : (
          <>
            <StatusPieChart data={analytics?.orders_by_priority || []} title="Orders by Priority" description="Distribution by priority level" icon={ShoppingCart} />
            <StatusPieChart data={analytics?.orders_by_status || []} title="Orders by Status" description="Distribution by current status" icon={ShoppingCart} />
          </>
        )}
      </div>

      {loading ? (
        <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={250} /></CardContent></Card>
      ) : (
        <HorizontalBarChart
          data={analytics?.top_picked_items || []}
          title="Top 10 Picked Items"
          description="Most frequently picked items in the period"
          icon={Package}
          nameKey="name"
          valueKey="quantity"
        />
      )}
    </div>
  )
}

function FleetTab({ dateParams, isLoading: parentLoading }: { dateParams: DateRangeParams; isLoading?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-fleet', dateParams],
    queryFn: () => dashboardApi.getFleetAnalytics(dateParams),
  })
  const analytics: FleetAnalytics | null = data?.data?.data || null
  const loading = isLoading || parentLoading

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Fleet Utilization" icon={Gauge} iconColor="text-blue-500" suffix="%" isLoading={loading}
          value={analytics?.kpis.fleet_utilization.value ?? 0}
          changePercent={analytics?.kpis.fleet_utilization.change_percent}
          trend={analytics?.kpis.fleet_utilization.trend} />
        <KpiCard title="Job Success Rate" icon={Target} iconColor="text-green-500" suffix="%" isLoading={loading}
          value={analytics?.kpis.job_success_rate.value ?? 0}
          changePercent={analytics?.kpis.job_success_rate.change_percent}
          trend={analytics?.kpis.job_success_rate.trend} />
        <KpiCard title="Avg Job Duration" icon={Timer} iconColor="text-purple-500" suffix=" min" isLoading={loading} invertTrend
          value={analytics?.kpis.avg_job_duration_minutes.value ?? 0}
          changePercent={analytics?.kpis.avg_job_duration_minutes.change_percent}
          trend={analytics?.kpis.avg_job_duration_minutes.trend} />
        <KpiCard title="Battery Avg Charge" icon={Zap} iconColor="text-yellow-500" suffix="%" isLoading={loading}
          value={analytics?.kpis.battery_avg_charge.value ?? 0}
          changePercent={analytics?.kpis.battery_avg_charge.change_percent}
          trend={analytics?.kpis.battery_avg_charge.trend} />
        <KpiCard title="Need Replacement" icon={Wrench} iconColor="text-red-500" isLoading={loading} invertTrend
          value={analytics?.kpis.batteries_needing_replacement.value ?? 0}
          changePercent={analytics?.kpis.batteries_needing_replacement.change_percent}
          trend={analytics?.kpis.batteries_needing_replacement.trend} />
        <KpiCard title="Total Flight Hours" icon={Plane} iconColor="text-teal-500" suffix="h" isLoading={loading}
          value={analytics?.kpis.total_flight_hours.value ?? 0}
          changePercent={analytics?.kpis.total_flight_hours.change_percent}
          trend={analytics?.kpis.total_flight_hours.trend} />
      </div>

      {/* Jobs over time */}
      {loading ? (
        <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={300} /></CardContent></Card>
      ) : (
        <TimeSeriesChart
          data={analytics?.jobs_over_time || []}
          title="Jobs Over Time"
          description="Completed, failed, and cancelled jobs"
          icon={Briefcase}
          dataKeys={[
            { key: 'completed', name: 'Completed' },
            { key: 'failed', name: 'Failed' },
            { key: 'cancelled', name: 'Cancelled' },
          ]}
          colors={['hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)', 'hsl(48, 96%, 53%)']}
        />
      )}

      {/* Distributions */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <Card><CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={200} /></CardContent></Card>
            <Card><CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={200} /></CardContent></Card>
          </>
        ) : (
          <>
            <StatusPieChart data={analytics?.jobs_by_type || []} title="Jobs by Type" description="Distribution by job type" icon={Briefcase} />
            <StatusPieChart data={analytics?.drone_status || []} title="Drone Status" description="Current drone fleet status" icon={Plane} />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <Card><CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={200} /></CardContent></Card>
            <Card><CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={200} /></CardContent></Card>
          </>
        ) : (
          <>
            <StatusPieChart data={analytics?.battery_health || []} title="Battery Health" description="Health status distribution" icon={Battery} />
            <StatusPieChart data={analytics?.battery_status || []} title="Battery Status" description="Current status distribution" icon={Battery} />
          </>
        )}
      </div>
    </div>
  )
}

function InventoryTab({ isLoading: parentLoading }: { isLoading?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-inventory'],
    queryFn: () => dashboardApi.getInventoryAnalytics(),
  })
  const analytics: InventoryAnalytics | null = data?.data?.data || null
  const loading = isLoading || parentLoading

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Total SKUs" icon={Package} iconColor="text-blue-500" isLoading={loading}
          value={analytics?.kpis.total_skus.value ?? 0} />
        <KpiCard title="Low Stock" icon={AlertTriangle} iconColor="text-yellow-500" isLoading={loading} invertTrend
          value={analytics?.kpis.low_stock_count.value ?? 0} />
        <KpiCard title="Below Reorder" icon={PackageSearch} iconColor="text-orange-500" isLoading={loading} invertTrend
          value={analytics?.kpis.below_reorder_count.value ?? 0} />
        <KpiCard title="Expiring Soon" icon={Clock} iconColor="text-red-500" isLoading={loading} invertTrend
          value={analytics?.kpis.expiring_soon_count.value ?? 0} />
        <KpiCard title="Storage Util." icon={HardDrive} iconColor="text-purple-500" suffix="%" isLoading={loading}
          value={analytics?.kpis.storage_utilization.value ?? 0} />
      </div>

      {/* Stock by category */}
      {loading ? (
        <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton height={250} /></CardContent></Card>
      ) : (
        <HorizontalBarChart
          data={analytics?.stock_by_category || []}
          title="Items by Category"
          description="Number of items per category"
          icon={Package}
        />
      )}

      {/* Inventory summary */}
      {!loading && analytics ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{analytics.inventory_summary.total_items}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Stock</CardTitle>
              <Package className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-500">{analytics.inventory_summary.in_stock}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analytics.inventory_summary.low_stock > 0 ? 'text-yellow-500' : ''}`}>
                {analytics.inventory_summary.low_stock}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
              <PackageX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analytics.inventory_summary.out_of_stock > 0 ? 'text-red-500' : ''}`}>
                {analytics.inventory_summary.out_of_stock}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

// =============================================================================
// Main page
// =============================================================================

export default function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [range, setRange] = useState(searchParams.get('range') || '30d')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const activeTab = searchParams.get('tab') || 'overview'

  const dateParams: DateRangeParams = range === 'custom' && dateRange?.from && dateRange?.to
    ? { date_from: format(dateRange.from, 'yyyy-MM-dd'), date_to: format(dateRange.to, 'yyyy-MM-dd') }
    : { range }

  // Overview tab data
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', dateParams],
    queryFn: () => dashboardApi.getAnalytics(dateParams),
    enabled: activeTab === 'overview',
  })
  const analytics: AnalyticsData | null = overviewData?.data?.data || null

  const handleTabChange = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    })
  }

  const handleRangeChange = (newRange: string) => {
    setRange(newRange)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('range', newRange)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with date range picker */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Insights and trends across your warehouse operations.
          </p>
        </div>
        <DateRangePicker
          range={range}
          dateRange={dateRange}
          onRangeChange={handleRangeChange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab analytics={analytics} isLoading={overviewLoading} />
        </TabsContent>

        <TabsContent value="orders">
          <OrdersTab dateParams={dateParams} />
        </TabsContent>

        <TabsContent value="fleet">
          <FleetTab dateParams={dateParams} />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

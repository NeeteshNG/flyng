import {
  Plane,
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Battery,
  Warehouse,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const stats = [
  {
    name: 'Active Drones',
    value: '12',
    change: '+2',
    changeType: 'positive',
    icon: Plane,
    description: '3 in flight, 9 standby',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    name: 'Total Items',
    value: '2,847',
    change: '+124',
    changeType: 'positive',
    icon: Package,
    description: 'Across all locations',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    name: 'Orders Today',
    value: '48',
    change: '+8%',
    changeType: 'positive',
    icon: ShoppingCart,
    description: '12 in progress',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    name: 'Low Stock Alerts',
    value: '7',
    change: '+3',
    changeType: 'negative',
    icon: AlertTriangle,
    description: 'Needs attention',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
]

const quickStats = [
  { label: 'Warehouses', value: '3', icon: Warehouse },
  { label: 'Batteries', value: '24', icon: Battery },
  { label: 'Jobs Completed', value: '156', icon: Activity },
]

const recentJobs = [
  { id: 'JOB-001', status: 'Completed', drone: 'Drone-A1', location: 'Zone A - Rack 12', time: '2 min ago' },
  { id: 'JOB-002', status: 'In Progress', drone: 'Drone-B3', location: 'Zone B - Rack 8', time: '5 min ago' },
  { id: 'JOB-003', status: 'Queued', drone: 'Drone-A2', location: 'Zone A - Rack 5', time: '8 min ago' },
  { id: 'JOB-004', status: 'Completed', drone: 'Drone-C1', location: 'Zone C - Rack 22', time: '12 min ago' },
  { id: 'JOB-005', status: 'Completed', drone: 'Drone-A1', location: 'Zone A - Rack 7', time: '15 min ago' },
]

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Completed':
      return 'success'
    case 'In Progress':
      return 'info'
    case 'Queued':
      return 'warning'
    default:
      return 'secondary'
  }
}

export default function DashboardHome() {
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <div
                  className={`flex items-center text-xs font-medium ${
                    stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-0.5" />
                  )}
                  {stat.change}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats Bar */}
      <div className="grid gap-4 grid-cols-3">
        {quickStats.map((stat) => (
          <Card key={stat.label} className="bg-muted/50">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and tables row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Activity chart placeholder */}
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
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">Chart coming soon...</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Order trends will be displayed here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent jobs */}
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
              <Badge variant="outline">{recentJobs.length} jobs</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{job.id}</p>
                      <Badge variant={getStatusVariant(job.status)} className="text-[10px] px-1.5 py-0">
                        {job.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {job.drone} • {job.location}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{job.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

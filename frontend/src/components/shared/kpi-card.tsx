import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface KpiCardProps {
  title: string
  value: number | string
  changePercent?: number
  trend?: 'up' | 'down' | 'stable'
  icon: React.ElementType
  iconColor?: string
  suffix?: string
  isLoading?: boolean
  invertTrend?: boolean // For metrics where "down" is good (e.g., cycle time, overdue)
}

export function KpiCard({
  title,
  value,
  changePercent = 0,
  trend = 'stable',
  icon: Icon,
  iconColor = 'text-primary',
  suffix = '',
  isLoading = false,
  invertTrend = false,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    )
  }

  const isPositive = invertTrend ? trend === 'down' : trend === 'up'
  const isNegative = invertTrend ? trend === 'up' : trend === 'down'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${iconColor.replace('text-', 'bg-')}/10`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}{suffix}
        </div>
        {changePercent !== 0 ? (
          <div className="flex items-center gap-1 mt-1">
            {isPositive && <TrendingUp className="h-3 w-3 text-green-500" />}
            {isNegative && <TrendingDown className="h-3 w-3 text-red-500" />}
            <span
              className={`text-xs font-medium ${
                isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
              }`}
            >
              {changePercent > 0 ? '+' : ''}{changePercent}%
            </span>
            <span className="text-xs text-muted-foreground">vs prev period</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-1">
            <Minus className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">No change</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

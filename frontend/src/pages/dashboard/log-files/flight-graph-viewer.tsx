import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig,
} from '@/components/ui/chart'

import { FlightLogGraph } from '@/api/endpoints/logs'

interface FlightGraphViewerProps {
  graphs: FlightLogGraph[]
}

const CHART_COLORS = [
  'hsl(217, 91%, 60%)',   // blue
  'hsl(142, 71%, 45%)',   // green
  'hsl(346, 87%, 57%)',   // rose
  'hsl(36, 100%, 50%)',   // amber
  'hsl(271, 91%, 65%)',   // purple
  'hsl(187, 92%, 43%)',   // cyan
]

function getChartConfig(graph: FlightLogGraph, colorIndex: number): ChartConfig {
  const graphData = graph.graph_data as {
    y_label?: string
    x_label?: string
  }
  const yLabel = graphData?.y_label || 'Value'

  return {
    value: {
      label: yLabel,
      color: CHART_COLORS[colorIndex % CHART_COLORS.length],
    },
  }
}

function getSeriesData(graph: FlightLogGraph): Record<string, unknown>[] {
  const graphData = graph.graph_data as { series?: Record<string, unknown>[] }
  return graphData?.series || []
}

function getAxisKeys(graph: FlightLogGraph): { xKey: string; yKey: string } {
  const data = getSeriesData(graph)
  if (data.length === 0) return { xKey: 'x', yKey: 'y' }
  const keys = Object.keys(data[0])
  return { xKey: keys[0] || 'x', yKey: keys[1] || 'y' }
}

function GraphCard({ graph, index }: { graph: FlightLogGraph; index: number }) {
  const data = getSeriesData(graph)
  const { xKey, yKey } = getAxisKeys(graph)
  const chartConfig = getChartConfig(graph, index)
  const graphData = graph.graph_data as { chart_type?: string; x_label?: string; y_label?: string }
  const chartType = graphData?.chart_type || graph.template_graph_type
  const color = CHART_COLORS[index % CHART_COLORS.length]

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{graph.display_title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case 'LINE':
        return (
          <LineChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => typeof v === 'number' ? (v > 100 ? `${Math.round(v)}` : `${v}`) : v}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey={yKey}
              type="monotone"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        )

      case 'AREA':
        return (
          <AreaChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => typeof v === 'number' ? `${Math.round(v)}` : v}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <defs>
              <linearGradient id={`fill-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey={yKey}
              type="monotone"
              fill={`url(#fill-${index})`}
              stroke={color}
              strokeWidth={2}
            />
          </AreaChart>
        )

      case 'BAR':
      case 'HISTOGRAM':
        return (
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />
            <Bar
              dataKey={yKey}
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        )

      case 'SCATTER':
      case 'PATH_3D':
        return (
          <ScatterChart accessibilityLayer>
            <CartesianGrid />
            <XAxis
              dataKey={xKey}
              type="number"
              name={graphData?.x_label || xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => typeof v === 'number' ? `${Number(v).toPrecision(5)}` : v}
            />
            <YAxis
              dataKey={yKey}
              type="number"
              name={graphData?.y_label || yKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => typeof v === 'number' ? `${Number(v).toPrecision(5)}` : v}
            />
            <ChartTooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Scatter
              data={data}
              fill={color}
              opacity={0.7}
            />
          </ScatterChart>
        )

      default:
        return (
          <LineChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line dataKey={yKey} type="monotone" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{graph.display_title}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {graph.template_graph_type}
          </Badge>
        </div>
        {graphData?.x_label && graphData?.y_label && (
          <CardDescription className="text-xs">
            {graphData.x_label} vs {graphData.y_label}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          {renderChart()}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default function FlightGraphViewer({ graphs }: FlightGraphViewerProps) {
  const generatedGraphs = graphs.filter((g) => g.is_generated)

  if (generatedGraphs.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Flight Graphs</h3>
      <div className="grid gap-4">
        {generatedGraphs.map((graph, i) => (
          <GraphCard key={graph.uuid} graph={graph} index={i} />
        ))}
      </div>
    </div>
  )
}

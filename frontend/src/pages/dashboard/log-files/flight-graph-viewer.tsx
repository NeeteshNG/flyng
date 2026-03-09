import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  ComposedChart, Cell, Rectangle, ReferenceArea,
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
  const graphData = graph.graph_data as {
    series?: Record<string, unknown>[]
    x?: unknown[]
    y?: unknown[]
  }
  // New format: {series: [{x: val, y: val}, ...]}
  if (graphData?.series) return graphData.series

  // Old seed format: {x: [...], y: [...]}
  if (graphData?.x && graphData?.y && Array.isArray(graphData.x) && Array.isArray(graphData.y)) {
    const len = Math.min(graphData.x.length, graphData.y.length)
    const series: Record<string, unknown>[] = []
    for (let i = 0; i < len; i++) {
      series.push({ x: graphData.x[i], y: graphData.y[i] })
    }
    return series
  }

  return []
}

function getAxisKeys(graph: FlightLogGraph): { xKey: string; yKey: string; zKey: string | null } {
  const data = getSeriesData(graph)
  if (data.length === 0) return { xKey: 'x', yKey: 'y', zKey: null }
  const keys = Object.keys(data[0])
  return { xKey: keys[0] || 'x', yKey: keys[1] || 'y', zKey: keys[2] || null }
}

/**
 * Interpolate a value between blue (cold) → yellow → red (hot).
 */
function heatmapColor(value: number, min: number, max: number): string {
  const t = max === min ? 0.5 : (value - min) / (max - min)
  // Blue → Yellow → Red
  const r = Math.round(t < 0.5 ? t * 2 * 255 : 255)
  const g = Math.round(t < 0.5 ? t * 2 * 255 : (1 - (t - 0.5) * 2) * 255)
  const b = Math.round(t < 0.5 ? (1 - t * 2) * 255 : 0)
  return `rgb(${r}, ${g}, ${b})`
}

function GraphCard({ graph, index }: { graph: FlightLogGraph; index: number }) {
  const data = getSeriesData(graph)
  const { xKey, yKey, zKey } = getAxisKeys(graph)
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

      case 'HEATMAP': {
        // Color-coded scatter where z-value determines dot color
        const colorKey = zKey || yKey
        const zValues = data.map((d) => Number(d[colorKey]) || 0)
        const zMin = Math.min(...zValues)
        const zMax = Math.max(...zValues)

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
            />
            <YAxis
              dataKey={yKey}
              type="number"
              name={graphData?.y_label || yKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Scatter data={data}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={heatmapColor(Number(entry[colorKey]) || 0, zMin, zMax)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        )
      }

      case 'BOX': {
        // Box plot using ComposedChart with bar for IQR and reference areas for whiskers
        // Expects data with: label, min, q1, median, q3, max
        return (
          <ComposedChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
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
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as Record<string, unknown>
                return (
                  <div className="rounded-lg border bg-popover p-2 text-xs shadow-md">
                    <p className="font-medium mb-1">{String(d.label)}</p>
                    <p>Max: {String(d.max)}</p>
                    <p>Q3: {String(d.q3)}</p>
                    <p>Median: {String(d.median)}</p>
                    <p>Q1: {String(d.q1)}</p>
                    <p>Min: {String(d.min)}</p>
                  </div>
                )
              }}
            />
            {/* IQR bar (q1 to q3) */}
            <Bar
              dataKey="q3"
              fill={color}
              opacity={0.3}
              radius={[4, 4, 0, 0]}
              shape={(props: Record<string, unknown>) => {
                const { x, y, width, payload } = props as {
                  x: number; y: number; width: number; payload: Record<string, number>
                }
                const yScale = (props as { background?: { height: number } }).background?.height || 250
                const q1 = payload.q1
                const q3 = payload.q3
                const med = payload.median
                if (q1 == null || q3 == null) return <Rectangle {...(props as object)} />
                // Approximate pixel positions - the bar already represents q3
                const barHeight = Math.max(1, ((q3 - q1) / (q3 || 1)) * (yScale * 0.3))
                return (
                  <g>
                    <Rectangle
                      x={x}
                      y={y}
                      width={width}
                      height={barHeight}
                      fill={color}
                      opacity={0.3}
                      radius={[4, 4, 4, 4] as unknown as number}
                    />
                    {/* Median line */}
                    {med != null && (
                      <line
                        x1={x}
                        x2={x + width}
                        y1={y + barHeight * ((q3 - med) / (q3 - q1))}
                        y2={y + barHeight * ((q3 - med) / (q3 - q1))}
                        stroke={color}
                        strokeWidth={2}
                      />
                    )}
                  </g>
                )
              }}
            />
            {/* Whisker lines */}
            <Line
              dataKey="max"
              type="monotone"
              stroke={color}
              strokeDasharray="4 4"
              dot={{ fill: color, r: 3 }}
              strokeWidth={1}
            />
            <Line
              dataKey="min"
              type="monotone"
              stroke={color}
              strokeDasharray="4 4"
              dot={{ fill: color, r: 3 }}
              strokeWidth={1}
            />
          </ComposedChart>
        )
      }

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

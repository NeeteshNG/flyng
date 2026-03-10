import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  ArrowLeft, Plus, X, ChevronDown, ChevronRight,
  Database, BarChart3, Loader2, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig,
} from '@/components/ui/chart'

import logsApi from '@/api/endpoints/logs'

const CHART_COLORS = [
  'hsl(217, 91%, 60%)',   // blue
  'hsl(142, 71%, 45%)',   // green
  'hsl(346, 87%, 57%)',   // rose
  'hsl(36, 100%, 50%)',   // amber
  'hsl(271, 91%, 65%)',   // purple
  'hsl(187, 92%, 43%)',   // cyan
]

const CHART_TYPES = ['LINE', 'AREA', 'BAR', 'SCATTER'] as const
type ChartType = typeof CHART_TYPES[number]

interface ChartPanelState {
  id: string
  topic: string
  xKey: string
  yKey: string
  chartType: ChartType
}

let panelCounter = 0
function nextPanelId() {
  return `panel-${++panelCounter}-${Date.now()}`
}

// ── Topic Browser ──

function TopicBrowser({
  topicMetadata,
  onAddChart,
}: {
  topicMetadata: Record<string, { columns: string[]; count: number }>
  onAddChart: (topic: string, yKey: string) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const key of Object.keys(topicMetadata)) {
      init[key] = true
    }
    return init
  })

  const toggleTopic = (topic: string) => {
    setExpanded((prev) => ({ ...prev, [topic]: !prev[topic] }))
  }

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground px-2 mb-2">
        Topics
      </h3>
      {Object.entries(topicMetadata).map(([topic, meta]) => (
        <div key={topic}>
          <button
            className="flex items-center gap-1.5 w-full px-2 py-1.5 text-sm hover:bg-accent rounded-md transition-colors"
            onClick={() => toggleTopic(topic)}
          >
            {expanded[topic] ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )}
            <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium truncate">{topic}</span>
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
              {meta.count}
            </Badge>
          </button>
          {expanded[topic] && (
            <div className="ml-6 space-y-0.5 mt-0.5">
              {meta.columns
                .filter((col) => col !== 't')
                .map((col) => (
                  <button
                    key={col}
                    className="flex items-center gap-2 w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded transition-colors"
                    onClick={() => onAddChart(topic, col)}
                    title={`Plot ${col} from ${topic}`}
                  >
                    <Plus className="h-3 w-3 shrink-0" />
                    <span className="font-mono">{col}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Chart Panel ──

function ExplorerChartPanel({
  panel,
  index,
  topics,
  topicMetadata,
  onUpdate,
  onRemove,
}: {
  panel: ChartPanelState
  index: number
  topics: Record<string, Record<string, unknown>[]>
  topicMetadata: Record<string, { columns: string[]; count: number }>
  onUpdate: (id: string, updates: Partial<ChartPanelState>) => void
  onRemove: (id: string) => void
}) {
  const data = topics[panel.topic] || []
  const columns = topicMetadata[panel.topic]?.columns || []
  const color = CHART_COLORS[index % CHART_COLORS.length]
  const topicNames = Object.keys(topicMetadata)

  const chartConfig: ChartConfig = {
    value: {
      label: panel.yKey,
      color,
    },
  }

  const renderChart = () => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
          No data available for this topic
        </div>
      )
    }

    const commonXAxis = (
      <XAxis
        dataKey={panel.xKey}
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        tickFormatter={(v) => typeof v === 'number' ? (v > 100 ? `${Math.round(v)}` : `${v}`) : v}
      />
    )
    const commonYAxis = (
      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
    )
    const commonTooltip = (
      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
    )

    switch (panel.chartType) {
      case 'LINE':
        return (
          <LineChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            {commonXAxis}
            {commonYAxis}
            {commonTooltip}
            <Line dataKey={panel.yKey} type="monotone" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )
      case 'AREA':
        return (
          <AreaChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            {commonXAxis}
            {commonYAxis}
            {commonTooltip}
            <defs>
              <linearGradient id={`fill-explorer-${panel.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey={panel.yKey}
              type="monotone"
              fill={`url(#fill-explorer-${panel.id})`}
              stroke={color}
              strokeWidth={2}
            />
          </AreaChart>
        )
      case 'BAR':
        return (
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            {commonXAxis}
            {commonYAxis}
            {commonTooltip}
            <Bar dataKey={panel.yKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        )
      case 'SCATTER':
        return (
          <ScatterChart accessibilityLayer>
            <CartesianGrid />
            <XAxis
              dataKey={panel.xKey}
              type="number"
              name={panel.xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              dataKey={panel.yKey}
              type="number"
              name={panel.yKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent indicator="dot" />} />
            <Scatter data={data} fill={color} opacity={0.7} />
          </ScatterChart>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-sm">
            {panel.topic}.{panel.yKey}
          </CardTitle>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Select
              value={panel.topic}
              onValueChange={(v) => {
                const newCols = topicMetadata[v]?.columns || []
                const newX = newCols.includes('t') ? 't' : newCols[0] || 't'
                const newY = newCols.find((c) => c !== 't') || newCols[0] || ''
                onUpdate(panel.id, { topic: v, xKey: newX, yKey: newY })
              }}
            >
              <SelectTrigger className="h-7 text-xs w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {topicNames.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={panel.xKey} onValueChange={(v) => onUpdate(panel.id, { xKey: v })}>
              <SelectTrigger className="h-7 text-xs w-[90px]">
                <span className="text-muted-foreground mr-1">X:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={panel.yKey} onValueChange={(v) => onUpdate(panel.id, { yKey: v })}>
              <SelectTrigger className="h-7 text-xs w-[90px]">
                <span className="text-muted-foreground mr-1">Y:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={panel.chartType}
              onValueChange={(v) => onUpdate(panel.id, { chartType: v as ChartType })}
            >
              <SelectTrigger className="h-7 text-xs w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map((ct) => (
                  <SelectItem key={ct} value={ct} className="text-xs">{ct}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRemove(panel.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          {renderChart()}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Main Page ──

export default function FlightExplorerPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const queryClient = useQueryClient()
  const [panels, setPanels] = useState<ChartPanelState[]>([])

  const { data, isLoading, error } = useQuery({
    queryKey: ['flight-explorer', uuid],
    queryFn: () => logsApi.getExplorerData(uuid!),
    enabled: !!uuid,
    retry: false,
  })

  const reprocess = useMutation({
    mutationFn: () => logsApi.processFlightLog(uuid!),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['flight-explorer', uuid] })
      toast.success('Log reprocessed. Loading explorer data...', { duration: 4000 })
    },
    onError: () => {
      toast.error('Failed to reprocess flight log', { duration: 5000 })
    },
  })

  const explorerData = data?.data
  const topicMetadata = explorerData?.topic_metadata || {}
  const topics = explorerData?.topics || {}
  const summary = explorerData?.summary

  const addPanel = (topic?: string, yKey?: string) => {
    const topicNames = Object.keys(topicMetadata)
    const selectedTopic = topic || topicNames[0] || ''
    const columns = topicMetadata[selectedTopic]?.columns || []
    const xKey = columns.includes('t') ? 't' : columns[0] || 't'
    const selectedY = yKey || columns.find((c) => c !== 't') || columns[0] || ''

    setPanels((prev) => [
      ...prev,
      {
        id: nextPanelId(),
        topic: selectedTopic,
        xKey,
        yKey: selectedY,
        chartType: 'LINE',
      },
    ])
  }

  const updatePanel = (id: string, updates: Partial<ChartPanelState>) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }

  const removePanel = (id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !explorerData) {
    // Extract error message from API response
    const apiError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    const errorMsg = apiError || 'Failed to load explorer data. The log may not be processed yet.'
    const isLegacyFormat = apiError?.includes('legacy format') || apiError?.includes('Reprocess')

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/log-files">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            {(isLegacyFormat || error) && (
              <Button
                variant="outline"
                size="sm"
                disabled={reprocess.isPending}
                onClick={() => reprocess.mutate()}
              >
                {reprocess.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {reprocess.isPending ? 'Reprocessing...' : 'Reprocess Log'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/log-files">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{explorerData.filename}</h1>
        </div>
        {summary && (
          <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
            <Badge variant="outline">
              {summary.topics_found?.length || 0} topics
            </Badge>
            <Badge variant="outline">
              {explorerData.columns?.length || 0} columns
            </Badge>
            <Badge variant="outline">
              {summary.total_points?.toLocaleString() || 0} points
            </Badge>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex gap-4">
        {/* Left Sidebar - Topic Browser */}
        <div className="w-[220px] shrink-0">
          <Card>
            <CardContent className="py-3 px-2">
              <TopicBrowser
                topicMetadata={topicMetadata}
                onAddChart={addPanel}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right - Chart Panels */}
        <div className="flex-1 space-y-4">
          {panels.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground mb-3">
                  No charts yet. Click a column in the topic browser or add a chart panel.
                </p>
                <Button variant="outline" size="sm" onClick={() => addPanel()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chart Panel
                </Button>
              </CardContent>
            </Card>
          )}

          {panels.map((panel, i) => (
            <ExplorerChartPanel
              key={panel.id}
              panel={panel}
              index={i}
              topics={topics}
              topicMetadata={topicMetadata}
              onUpdate={updatePanel}
              onRemove={removePanel}
            />
          ))}

          {panels.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => addPanel()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Chart Panel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

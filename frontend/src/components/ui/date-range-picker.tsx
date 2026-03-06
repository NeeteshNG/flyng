import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const PRESETS = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last 6 months", value: "6m" },
  { label: "Last year", value: "1y" },
] as const

interface DateRangePickerProps {
  range: string
  dateRange?: DateRange
  onRangeChange: (range: string) => void
  onDateRangeChange: (dateRange: DateRange | undefined) => void
  className?: string
}

export function DateRangePicker({
  range,
  dateRange,
  onRangeChange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const displayLabel = React.useMemo(() => {
    if (range !== "custom" && range) {
      const preset = PRESETS.find((p) => p.value === range)
      return preset?.label || "Last 30 days"
    }
    if (dateRange?.from) {
      if (dateRange.to) {
        return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
      }
      return format(dateRange.from, "MMM d, yyyy")
    }
    return "Pick a date range"
  }, [range, dateRange])

  const handlePresetClick = (preset: string) => {
    onRangeChange(preset)
    onDateRangeChange(undefined)
    setOpen(false)
  }

  const handleDateSelect = (selected: DateRange | undefined) => {
    onDateRangeChange(selected)
    if (selected?.from && selected?.to) {
      onRangeChange("custom")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !range && !dateRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="border-r p-2 space-y-1">
            {PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant={range === preset.value ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handlePresetClick(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

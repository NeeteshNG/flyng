import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOrgWebSocket } from '@/hooks/use-org-websocket'
import { useTelemetryStore, type DroneTelemetry } from '@/stores/telemetry-store'

interface TelemetryMessage {
  type: 'telemetry'
  drone_id: number
  drone_name: string
  status: string
  position_x: number | null
  position_y: number | null
  position_z: number | null
  battery_percentage: number | null
  ground_speed: number | null
  flight_mode: string
  rssi: number | null
  timestamp: string
}

interface DroneStatusMessage {
  type: 'drone_status'
  drone_id: number
  drone_name: string
  status: string
  old_status: string
}

interface JobMessage {
  type: 'job_update' | 'job_created'
  job_id: number
  job_number: string
  status: string
}

interface NotificationMessage {
  type: 'notification'
  uuid: string
  notification_type: string
  title: string
  message: string
  priority: string
}

type WsMessage = TelemetryMessage | DroneStatusMessage | JobMessage | NotificationMessage

/**
 * WebSocket provider component that manages 3 persistent connections
 * for the dashboard: telemetry, jobs, and notifications.
 *
 * Place this inside the dashboard layout so connections are established
 * once when the user enters the dashboard.
 */
export function WebSocketProvider() {
  const queryClient = useQueryClient()
  const updateDrone = useTelemetryStore((s) => s.updateDrone)
  const updateDroneStatus = useTelemetryStore((s) => s.updateDroneStatus)

  // Connect to all 3 WebSocket endpoints
  const { lastJsonMessage: telemetryMsg } = useOrgWebSocket('/ws/telemetry/')
  const { lastJsonMessage: jobMsg } = useOrgWebSocket('/ws/jobs/')
  const { lastJsonMessage: notificationMsg } = useOrgWebSocket('/ws/notifications/')

  // Handle telemetry messages
  useEffect(() => {
    if (!telemetryMsg) return
    const msg = telemetryMsg as WsMessage

    if (msg.type === 'telemetry') {
      updateDrone(msg as DroneTelemetry)
    } else if (msg.type === 'drone_status') {
      updateDroneStatus(msg as DroneStatusMessage)
      // Also refresh drone list queries
      queryClient.invalidateQueries({ queryKey: ['drones'] })
    }
  }, [telemetryMsg, updateDrone, updateDroneStatus, queryClient])

  // Handle job messages
  useEffect(() => {
    if (!jobMsg) return

    // Invalidate job queries to trigger a refetch
    queryClient.invalidateQueries({ queryKey: ['jobs'] })
    queryClient.invalidateQueries({ queryKey: ['jobs-stats'] })
  }, [jobMsg, queryClient])

  // Handle notification messages
  useEffect(() => {
    if (!notificationMsg) return

    // Invalidate notification queries to trigger a refetch
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-popover'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [notificationMsg, queryClient])

  // This component renders nothing — it only manages WebSocket connections
  return null
}

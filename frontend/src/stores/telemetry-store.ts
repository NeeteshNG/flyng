import { create } from 'zustand'

export interface DroneTelemetry {
  type: 'telemetry' | 'drone_status'
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

interface TelemetryState {
  /** Map of drone_id to latest telemetry data */
  drones: Record<number, DroneTelemetry>

  /** Update a single drone's telemetry */
  updateDrone: (data: DroneTelemetry) => void

  /** Update drone status (from drone_status events) */
  updateDroneStatus: (data: { drone_id: number; drone_name: string; status: string }) => void

  /** Clear all telemetry data (e.g., on logout) */
  clearAll: () => void
}

export const useTelemetryStore = create<TelemetryState>()((set) => ({
  drones: {},

  updateDrone: (data) =>
    set((state) => ({
      drones: {
        ...state.drones,
        [data.drone_id]: data,
      },
    })),

  updateDroneStatus: (data) =>
    set((state) => {
      const existing = state.drones[data.drone_id]
      return {
        drones: {
          ...state.drones,
          [data.drone_id]: {
            ...(existing || {
              type: 'drone_status' as const,
              drone_id: data.drone_id,
              drone_name: data.drone_name,
              position_x: null,
              position_y: null,
              position_z: null,
              battery_percentage: null,
              ground_speed: null,
              flight_mode: '',
              rssi: null,
              timestamp: new Date().toISOString(),
            }),
            status: data.status,
            drone_name: data.drone_name,
          },
        },
      }
    }),

  clearAll: () => set({ drones: {} }),
}))

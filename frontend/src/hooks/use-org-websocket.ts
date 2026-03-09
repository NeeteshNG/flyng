import { useMemo } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Build a WebSocket URL from the API base URL.
 * Converts http(s):// to ws(s):// and strips /api/v1 suffix.
 */
function buildWsUrl(path: string, token: string): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8002/api/v1'

  // Convert http(s) to ws(s)
  let wsBase = apiUrl
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://')

  // Strip /api/v1 suffix to get the base host
  wsBase = wsBase.replace(/\/api\/v[0-9]+\/?$/, '')

  // Ensure path starts with /
  const wsPath = path.startsWith('/') ? path : `/${path}`

  return `${wsBase}${wsPath}?token=${token}`
}

/**
 * Organization-scoped WebSocket hook.
 *
 * Automatically appends the JWT access token as a query parameter.
 * Reconnects with exponential backoff. Shares connections across
 * components using the same path.
 *
 * @param path - WebSocket path (e.g., "/ws/telemetry/")
 * @returns WebSocket state from react-use-websocket
 */
export function useOrgWebSocket(path: string) {
  const accessToken = useAuthStore((s) => s.accessToken)

  const socketUrl = useMemo(() => {
    if (!accessToken) return null
    return buildWsUrl(path, accessToken)
  }, [path, accessToken])

  return useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: (attemptNumber: number) =>
      Math.min(1000 * 2 ** attemptNumber, 30000),
    share: true,
  })
}

export { ReadyState }

import { useState, useEffect } from 'react'
import { useDeviceId } from './device-id'
import { usersEnsure, type EnsureUserResponse } from './api'

export type User = EnsureUserResponse

/**
 * Hook integrating API /api/users/ensure.
 * Create or update user by deviceId, return user info.
 */
export function useUser(): {
  user: User | null
  deviceId: string | null
  loading: boolean
  error: Error | null
} {
  const { deviceId, loading: deviceIdLoading } = useDeviceId()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [ensureLoading, setEnsureLoading] = useState(false)

  useEffect(() => {
    if (!deviceId) return

    let cancelled = false
    setEnsureLoading(true)
    setError(null)

    usersEnsure(deviceId)
      .then((res) => {
        if (!cancelled) {
          setUser({ id: res.id, deviceId: res.deviceId })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
          // API may not be running (dev) — app still works offline
        }
      })
      .finally(() => {
        if (!cancelled) setEnsureLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [deviceId])

  const loading = deviceIdLoading || ensureLoading

  return { user, deviceId, loading, error }
}

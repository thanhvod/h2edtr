import { useState, useEffect } from 'react'

const STORAGE_KEY = 'h2-device-id'

/**
 * Get device ID from localStorage (previously saved) or create new.
 * Use fingerprint when available, fallback to UUID if fingerprint not available.
 */
function getDeviceIdSync(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function setDeviceIdSync(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // quota exceeded
  }
}

function generateFallbackId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 15)}`
}

/**
 * Hook to identify anonymous user by browser.
 * Use FingerprintJS (open-source) when available, fallback to UUID stored in localStorage.
 * @returns { deviceId: string | null, loading: boolean }
 */
export function useDeviceId(): { deviceId: string | null; loading: boolean } {
  const [deviceId, setDeviceId] = useState<string | null>(getDeviceIdSync)
  const [loading, setLoading] = useState(!getDeviceIdSync())

  useEffect(() => {
    const cached = getDeviceIdSync()
    if (cached) {
      setDeviceId(cached)
      setLoading(false)
      return
    }

    let cancelled = false

    async function init() {
      try {
        const fpModule = await import('@fingerprintjs/fingerprintjs')
        const agent = await fpModule.load()
        const result = await agent.get()
        const id = result.visitorId
        if (!cancelled) {
          setDeviceId(id)
          setDeviceIdSync(id)
        }
      } catch {
        const fallback = generateFallbackId()
        if (!cancelled) {
          setDeviceId(fallback)
          setDeviceIdSync(fallback)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  return { deviceId, loading }
}

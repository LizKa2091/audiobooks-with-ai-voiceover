import { apiFetch } from '@/api/http'
import { enableMockDataMode } from '@/api/mockMode'
import { env } from '@/config/env'

const HEALTH_TIMEOUT_MS = 2500

type Availability = 'unknown' | 'online' | 'offline'

let availability: Availability = 'unknown'
let probePromise: Promise<boolean> | null = null

async function probeHealth(): Promise<boolean> {
  if (!env.apiBaseUrl) return false
  try {
    const res = await apiFetch('/health', {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Один раз за сессию проверяет API; при недоступности включает режим моков. */
export async function isApiAvailable(): Promise<boolean> {
  if (availability === 'online') return true
  if (availability === 'offline') return false

  if (!probePromise) {
    probePromise = probeHealth().then((ok) => {
      availability = ok ? 'online' : 'offline'
      if (!ok) enableMockDataMode()
      return ok
    })
  }

  return probePromise
}

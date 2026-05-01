import { env } from '@/config/env'

export function apiUrl(path: string): string {
  const base = env.apiBaseUrl.replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${normalized}` : normalized
}

/** Реальный fetch к бэкенду; пока в UI используйте заглушки из `api/stubs`. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init)
}

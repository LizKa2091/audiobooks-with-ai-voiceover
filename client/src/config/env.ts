const configured = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''

/** Пустой VITE_API_BASE_URL → localhost:8000 (локальная разработка). */
export const env = {
  apiBaseUrl: (configured || 'http://localhost:8000').replace(/\/$/, ''),
} as const

import { isApiAvailable } from '@/api/availability'
import { apiFetch } from '@/api/http'
import { enableMockDataMode } from '@/api/mockMode'
import { fetchBooksMock } from '@/api/stubs/books'
import type { BookSummary } from '@/types/book'

const REQUEST_TIMEOUT_MS = 12_000

function parseBookSummary(raw: unknown): BookSummary | null {
  if (typeof raw !== 'object' || raw === null) return null
  const b = raw as Record<string, unknown>
  if (
    typeof b.id !== 'string' ||
    typeof b.title !== 'string' ||
    typeof b.author !== 'string' ||
    typeof b.genre !== 'string' ||
    typeof b.progressPercent !== 'number' ||
    (typeof b.updatedAt !== 'string' && !(b.updatedAt instanceof Date))
  ) {
    return null
  }
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    genre: b.genre,
    progressPercent: b.progressPercent,
    updatedAt:
      typeof b.updatedAt === 'string'
        ? b.updatedAt
        : b.updatedAt.toISOString(),
  }
}

async function fetchBooksFromApi(): Promise<BookSummary[]> {
  const res = await apiFetch('/api/books', {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`books ${res.status}`)
  const data: unknown = await res.json()
  if (!Array.isArray(data)) throw new Error('invalid books payload')
  const books = data
    .map(parseBookSummary)
    .filter((b): b is BookSummary => b !== null)
  if (books.length === 0 && data.length > 0) throw new Error('invalid books items')
  return books
}

export async function fetchBooks(): Promise<BookSummary[]> {
  if (!(await isApiAvailable())) {
    return fetchBooksMock()
  }
  try {
    return await fetchBooksFromApi()
  } catch {
    enableMockDataMode()
    return fetchBooksMock()
  }
}

import { isApiAvailable } from '@/api/availability'
import { apiFetch } from '@/api/http'
import { enableMockDataMode } from '@/api/mockMode'
import { fetchReaderContentMock } from '@/features/reader/stubs/fetchReaderContentStub'
import type { ReaderBundle } from '@/features/reader/types'

const REQUEST_TIMEOUT_MS = 15_000

export type ReaderContentResult =
  | { kind: 'ready'; bundle: ReaderBundle }
  | { kind: 'processing' }
  | { kind: 'not_found' }

function isReaderBundle(raw: unknown): raw is ReaderBundle {
  if (typeof raw !== 'object' || raw === null) return false
  const b = raw as Record<string, unknown>
  return (
    typeof b.bookId === 'string' &&
    typeof b.title === 'string' &&
    typeof b.audio === 'object' &&
    b.audio !== null &&
    typeof b.sync === 'object' &&
    b.sync !== null
  )
}

async function fetchReaderFromApi(bookId: string): Promise<ReaderContentResult> {
  const res = await apiFetch(
    `/api/books/${encodeURIComponent(bookId)}/reader`,
    { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
  )
  if (res.status === 202) return { kind: 'processing' }
  if (res.status === 404) return { kind: 'not_found' }
  if (!res.ok) throw new Error(`reader ${res.status}`)
  const data: unknown = await res.json()
  if (!isReaderBundle(data)) throw new Error('invalid reader bundle')
  return { kind: 'ready', bundle: data }
}

export async function fetchReaderContent(
  bookId: string,
): Promise<ReaderContentResult> {
  const trimmed = bookId.trim()
  if (!trimmed) return { kind: 'not_found' }

  if (!(await isApiAvailable())) {
    const bundle = await fetchReaderContentMock(trimmed)
    return bundle ? { kind: 'ready', bundle } : { kind: 'not_found' }
  }

  try {
    const result = await fetchReaderFromApi(trimmed)
    if (result.kind === 'ready') return result
    if (result.kind === 'processing') return result

    const mock = await fetchReaderContentMock(trimmed)
    if (mock) {
      enableMockDataMode()
      return { kind: 'ready', bundle: mock }
    }
    return { kind: 'not_found' }
  } catch {
    enableMockDataMode()
    const bundle = await fetchReaderContentMock(trimmed)
    return bundle ? { kind: 'ready', bundle } : { kind: 'not_found' }
  }
}

import { isApiAvailable } from '@/api/availability'
import { apiFetch } from '@/api/http'
import { enableMockDataMode } from '@/api/mockMode'
import {
  runUploadPipelineStub,
  type UploadPipelineResult,
} from '@/features/upload/pipeline'
import { appendUploadedBook, notifyLibraryChanged } from '@/lib/localLibrary'

const REQUEST_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 1500

type BookUploadResponse = {
  bookId: string
  jobId: string
  title: string
  status: string
}

type JobStatusResponse = {
  step: string
  percent: number
  status: string
  error?: string | null
}

const STEP_TO_UI_INDEX: Record<string, number> = {
  ingest: 0,
  ocr: 1,
  structure: 2,
  cleanup: 3,
  tts: 4,
  bundle: 4,
  done: 4,
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pollBookUntilReady(
  bookId: string,
  onBeginStep: (index: number) => void,
): Promise<void> {
  for (;;) {
    await sleep(POLL_INTERVAL_MS)
    const res = await apiFetch(`/api/books/${encodeURIComponent(bookId)}/status`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`status ${res.status}`)
    const status = (await res.json()) as JobStatusResponse
    const idx = STEP_TO_UI_INDEX[status.step] ?? 0
    onBeginStep(Math.max(0, idx))

    if (status.status === 'ready' || status.step === 'done') return
    if (status.status === 'failed' || status.step === 'failed') {
      throw new Error(status.error ?? 'Обработка завершилась с ошибкой')
    }
  }
}

async function runUploadPipelineApi(
  file: File,
  onBeginStep: (index: number) => void,
): Promise<UploadPipelineResult> {
  const form = new FormData()
  form.append('file', file)

  const res = await apiFetch('/api/books/upload', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`upload ${res.status}`)

  const data = (await res.json()) as BookUploadResponse
  onBeginStep(0)
  await pollBookUntilReady(data.bookId, onBeginStep)
  notifyLibraryChanged()

  return { bookId: data.bookId, title: data.title }
}

async function runUploadPipelineMock(
  file: File,
  onBeginStep: (index: number) => void,
): Promise<UploadPipelineResult> {
  const res = await runUploadPipelineStub(file.name, onBeginStep)
  appendUploadedBook(res)
  notifyLibraryChanged()
  return res
}

export async function runUploadPipeline(
  file: File,
  onBeginStep: (index: number) => void,
): Promise<UploadPipelineResult> {
  if (!(await isApiAvailable())) {
    return runUploadPipelineMock(file, onBeginStep)
  }

  try {
    return await runUploadPipelineApi(file, onBeginStep)
  } catch (err) {
    if (
      err instanceof Error &&
      /обработк|failed/i.test(err.message)
    ) {
      throw err
    }
    enableMockDataMode()
    return runUploadPipelineMock(file, onBeginStep)
  }
}

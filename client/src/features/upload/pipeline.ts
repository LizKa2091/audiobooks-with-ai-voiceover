import { stubDelay } from '@/api/stubDelay'

export type UploadPipelineStepId =
  | 'ingest'
  | 'ocr'
  | 'structure'
  | 'cleanup'
  | 'tts'

export type UploadPipelineStep = {
  id: UploadPipelineStepId
  title: string
  description: string
}

export const UPLOAD_PIPELINE_STEPS: UploadPipelineStep[] = [
  {
    id: 'ingest',
    title: 'Приём файла',
    description: 'Проверка PDF и передача на обработку…',
  },
  {
    id: 'ocr',
    title: 'Текст и OCR',
    description: 'Извлечение текста или распознавание сканов…',
  },
  {
    id: 'structure',
    title: 'Структура',
    description: 'Главы, разделы и сноски…',
  },
  {
    id: 'cleanup',
    title: 'Очистка',
    description: 'Удаление артефактов сканирования…',
  },
  {
    id: 'tts',
    title: 'Озвучка',
    description: 'Постановка в очередь синтеза речи…',
  },
]

export type UploadPipelineResult = {
  bookId: string
  title: string
}

/**
 * Имитация серверного пайплайна. Заменится на реальные запросы + polling/WebSocket.
 */
export async function runUploadPipelineStub(
  fileName: string,
  onBeginStep: (index: number) => void,
): Promise<UploadPipelineResult> {
  for (let i = 0; i < UPLOAD_PIPELINE_STEPS.length; i++) {
    onBeginStep(i)
    await stubDelay(520 + i * 140)
  }
  const base = fileName.replace(/\.pdf$/i, '').trim() || 'Новая книга'
  return {
    bookId: `upload-${Date.now()}`,
    title: base.slice(0, 120),
  }
}

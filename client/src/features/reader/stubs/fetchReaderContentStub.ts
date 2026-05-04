import { stubDelay } from '@/api/stubDelay'
import type { ReaderBundle } from '@/features/reader/types'

/** Демо-файл для MVP; позже заменится URL с бэкенда. */
const DEMO_READER_AUDIO_URL =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'

function buildWords(
  sentenceId: string,
  text: string,
  start: number,
  end: number,
) {
  const parts = text.split(/\s+/).filter(Boolean)
  const step = (end - start) / Math.max(parts.length, 1)
  return parts.map((word, i) => {
    const wStart = start + i * step
    const wEnd = i === parts.length - 1 ? end : start + (i + 1) * step
    return {
      id: `${sentenceId}-w${i}`,
      sentenceId,
      text: word,
      startSec: wStart,
      endSec: wEnd,
    }
  })
}

function mockBundle(bookId: string): ReaderBundle {
  const durationSec = 42
  const s1Id = 's1'
  const s2Id = 's2'
  const s1Text =
    'Это демонстрационный текст с привязкой слов ко времени для будущей подсветки.'
  const s2Text = 'Тап по слову должен запускать воспроизведение с этой позиции.'

  const t0 = 0
  const t1 = durationSec * 0.45
  const t2 = durationSec

  return {
    bookId,
    title: `Книга «${bookId}» (стаб)`,
    audio: {
      url: DEMO_READER_AUDIO_URL,
      durationSec,
    },
    sync: {
      bookId,
      language: 'ru',
      sentences: [
        {
          id: s1Id,
          order: 0,
          words: buildWords(s1Id, s1Text, t0, t1),
        },
        {
          id: s2Id,
          order: 1,
          words: buildWords(s2Id, s2Text, t1, t2),
        },
      ],
    },
  }
}

/** Заменится на GET /books/:id/reader или аналог. */
export async function fetchReaderContentStub(
  bookId: string,
): Promise<ReaderBundle | null> {
  await stubDelay(280)
  if (!bookId.trim()) return null
  return mockBundle(bookId)
}

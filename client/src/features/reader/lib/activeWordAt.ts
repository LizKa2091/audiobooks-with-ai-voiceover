import type { SentenceBlock } from '@/features/reader/types'

/** Какое слово подсвечивать при текущем времени аудио (сек). */
export function findActiveWordId(
  sentences: SentenceBlock[],
  t: number,
): string | null {
  for (const s of sentences) {
    for (const w of s.words) {
      if (t >= w.startSec && t < w.endSec) return w.id
    }
  }
  const lastSentence = sentences[sentences.length - 1]
  const lastWord = lastSentence?.words[lastSentence.words.length - 1]
  if (lastWord && t >= lastWord.endSec) return lastWord.id
  return null
}

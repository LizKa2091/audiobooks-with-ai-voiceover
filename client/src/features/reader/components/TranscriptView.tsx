import type { SentenceBlock } from '@/features/reader/types'

export type TranscriptViewProps = {
  sentences: SentenceBlock[]
  /** Слово под подсветку; в reader-audio-sync считается от currentTime */
  activeWordId: string | null
  onWordSeek: (startSec: number) => void
}

export function TranscriptView({
  sentences,
  activeWordId,
  onWordSeek,
}: TranscriptViewProps) {
  return (
    <div className="reader-transcript" lang="ru">
      {sentences.map((sentence) => (
        <p key={sentence.id} className="reader-transcript__sentence">
          {sentence.words.map((w) => (
            <button
              key={w.id}
              type="button"
              className={[
                'reader-word',
                activeWordId === w.id ? 'reader-word--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-word-id={w.id}
              onClick={() => onWordSeek(w.startSec)}
            >
              {w.text}
            </button>
          ))}
        </p>
      ))}
    </div>
  )
}

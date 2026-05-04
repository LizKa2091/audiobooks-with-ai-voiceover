import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AudioDock } from '@/features/reader/components/AudioDock'
import { ReaderShell } from '@/features/reader/components/ReaderShell'
import { TranscriptView } from '@/features/reader/components/TranscriptView'
import { useReaderPlaybackState } from '@/features/reader/hooks/useReaderPlaybackState'
import { findActiveWordId } from '@/features/reader/lib/activeWordAt'
import { fetchReaderContentStub } from '@/features/reader/stubs/fetchReaderContentStub'
import type { ReaderBundle } from '@/features/reader/types'

type ReaderBookViewProps = {
  bundle: ReaderBundle
}

function ReaderBookView({ bundle }: ReaderBookViewProps) {
  const playback = useReaderPlaybackState(
    bundle.audio.url,
    bundle.audio.durationSec,
  )

  const activeWordId = useMemo(
    () => findActiveWordId(bundle.sync.sentences, playback.currentSec),
    [bundle.sync.sentences, playback.currentSec],
  )

  return (
    <ReaderShell
      title={bundle.title}
      backHref="/library"
      dock={<AudioDock playback={playback} />}
    >
      <p className="muted reader-hint">
        Демо-аудио и таймкоды синхронизации — заглушка до API. Тап по слову или
        по шкале перематывает воспроизведение.
      </p>
      <TranscriptView
        sentences={bundle.sync.sentences}
        activeWordId={activeWordId}
        onWordSeek={(sec) => {
          playback.seek(sec)
          if (playback.canPlay && !playback.playing) playback.setPlaying(true)
        }}
      />
    </ReaderShell>
  )
}

export function ReaderPage() {
  const { bookId } = useParams()
  const trimmedId = bookId?.trim() ?? ''

  const [bundle, setBundle] = useState<ReaderBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (!trimmedId) {
        if (cancelled) return
        setBundle(null)
        setLoading(false)
        setError('Книга не указана.')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await fetchReaderContentStub(trimmedId)
        if (cancelled) return
        if (!data) {
          setBundle(null)
          setError('Нет данных для этой книги (стаб).')
          return
        }
        setBundle(data)
      } catch {
        if (!cancelled) setError('Не удалось загрузить контент.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [trimmedId])

  if (loading) {
    return (
      <div className="page">
        <p>Загрузка…</p>
      </div>
    )
  }

  if (error || !bundle) {
    return (
      <div className="page">
        <p role="alert">{error ?? 'Нет данных.'}</p>
      </div>
    )
  }

  return (
    <ReaderBookView
      key={`${bundle.bookId}|${bundle.audio.url}|${bundle.audio.durationSec}`}
      bundle={bundle}
    />
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AudioDock } from '@/features/reader/components/AudioDock'
import { ReaderShell } from '@/features/reader/components/ReaderShell'
import { TranscriptView } from '@/features/reader/components/TranscriptView'
import { useReaderPlaybackState } from '@/features/reader/hooks/useReaderPlaybackState'
import { findActiveWordId } from '@/features/reader/lib/activeWordAt'
import { fetchReaderContentStub } from '@/features/reader/stubs/fetchReaderContentStub'
import type { ReaderBundle } from '@/features/reader/types'

export function ReaderPage() {
  const { bookId } = useParams()
  const [bundle, setBundle] = useState<ReaderBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookId) {
      setBundle(null)
      setLoading(false)
      setError('Книга не указана.')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchReaderContentStub(bookId)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setBundle(null)
          setError('Нет данных для этой книги (стаб).')
          return
        }
        setBundle(data)
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить контент.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bookId])

  const durationSec = bundle?.audio.durationSec ?? 0
  const playback = useReaderPlaybackState(durationSec)

  const activeWordId = useMemo(() => {
    if (!bundle) return null
    return findActiveWordId(bundle.sync.sentences, playback.currentSec)
  }, [bundle, playback.currentSec])

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
    <ReaderShell
      title={bundle.title}
      backHref="/library"
      dock={<AudioDock playback={playback} />}
    >
      <p className="muted reader-hint">
        Подсветка по таймкоду и кнопка «Play» без реального аудио — задел под{' '}
        <code>feat/client/reader-audio-sync</code>. Тап по слову перематывает
        локальное время.
      </p>
      <TranscriptView
        sentences={bundle.sync.sentences}
        activeWordId={activeWordId}
        onWordSeek={(sec) => playback.seek(sec)}
      />
    </ReaderShell>
  )
}

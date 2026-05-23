import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchReaderContent } from '@/api/reader'
import { AudioDock } from '@/features/reader/components/AudioDock'
import { ReaderShell } from '@/features/reader/components/ReaderShell'
import { TranscriptView } from '@/features/reader/components/TranscriptView'
import { useReaderPlaybackState } from '@/features/reader/hooks/useReaderPlaybackState'
import { findActiveWordId } from '@/features/reader/lib/activeWordAt'
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
    () => findActiveWordId(bundle.sync.sentences, playback.contentSec),
    [bundle.sync.sentences, playback.contentSec],
  )

  return (
    <ReaderShell
      title={bundle.title}
      backHref="/library"
      dock={<AudioDock playback={playback} />}
    >
      <p className="muted reader-hint">
        Тап по слову или по шкале перематывает воспроизведение.
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
  const [processing, setProcessing] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!trimmedId) {
        if (cancelled) return
        setBundle(null)
        setProcessing(false)
        setNotFound(true)
        setLoading(false)
        return
      }

      setLoading(true)
      setNotFound(false)

      const result = await fetchReaderContent(trimmedId)
      if (cancelled) return

      if (result.kind === 'processing') {
        setBundle(null)
        setProcessing(true)
        setLoading(false)
        return
      }

      if (result.kind === 'not_found') {
        setBundle(null)
        setProcessing(false)
        setNotFound(true)
        setLoading(false)
        return
      }

      setBundle(result.bundle)
      setProcessing(false)
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [trimmedId])

  useEffect(() => {
    if (!trimmedId || !processing) return

    let cancelled = false
    const timer = window.setInterval(() => {
      void fetchReaderContent(trimmedId).then((result) => {
        if (cancelled) return
        if (result.kind === 'ready') {
          setBundle(result.bundle)
          setProcessing(false)
        }
      })
    }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [trimmedId, processing])

  if (loading) {
    return (
      <div className="page">
        <p>Загрузка…</p>
      </div>
    )
  }

  if (processing) {
    return (
      <div className="page">
        <h1>Обработка книги</h1>
        <p className="muted">
          Озвучка ещё идёт на сервере. Страница обновится автоматически, когда
          контент будет готов.
        </p>
        <Link to="/library" className="button">
          В библиотеку
        </Link>
      </div>
    )
  }

  if (notFound || !bundle) {
    return (
      <div className="page">
        <p className="muted">
          {trimmedId ? 'Книга не найдена.' : 'Книга не указана.'}
        </p>
        <Link to="/library" className="button">
          В библиотеку
        </Link>
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

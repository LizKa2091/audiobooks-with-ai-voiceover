import { useCallback, useEffect, useRef, useState } from 'react'

export type ReaderPlaybackState = {
  /** Позиция в шкале синхронизации (как в разметке слов), сек */
  currentSec: number
  playing: boolean
  /** Длина контента для UI (как в `ReaderBundle.audio.durationSec`) */
  durationSec: number
  setPlaying: (v: boolean) => void
  seek: (contentSec: number) => void
  togglePlay: () => void
  /** Можно запускать воспроизведение (есть URL и метаданные аудио) */
  canPlay: boolean
}

/**
 * Плеер читалки: реальное аудио + привязка к логической длине синхронизации.
 * Логическая длина (`syncDurationSec`) может отличаться от длительности файла.
 */
export function useReaderPlaybackState(
  audioUrl: string | undefined,
  syncDurationSec: number,
): ReaderPlaybackState {
  const sync = Math.max(0, syncDurationSec)

  const [currentSec, setCurrentSec] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const contentFromAudioTime = useCallback(
    (audioTime: number) => {
      const d = audioDuration
      if (!(d > 0) || !Number.isFinite(audioTime) || sync <= 0) return 0
      return Math.min((audioTime / d) * sync, sync)
    },
    [audioDuration, sync],
  )

  const audioTimeFromContent = useCallback(
    (contentSec: number) => {
      const d = audioDuration
      if (!(d > 0) || sync <= 0) return 0
      const clamped = Math.min(Math.max(contentSec, 0), sync)
      return (clamped / sync) * d
    },
    [audioDuration, sync],
  )

  useEffect(() => {
    if (!audioUrl?.trim()) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      return
    }

    const a = new Audio(audioUrl)
    a.preload = 'auto'
    audioRef.current = a

    const onLoaded = () => {
      const dur = a.duration
      if (Number.isFinite(dur) && dur > 0) setAudioDuration(dur)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setCurrentSec(sync)
    }

    a.addEventListener('loadedmetadata', onLoaded)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnded)

    return () => {
      a.pause()
      a.removeEventListener('loadedmetadata', onLoaded)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnded)
      a.src = ''
      if (audioRef.current === a) audioRef.current = null
    }
  }, [audioUrl, sync])

  useEffect(() => {
    if (!playing) return
    const a = audioRef.current
    if (!a) return

    let raf = 0
    const tick = () => {
      if (!a.paused) setCurrentSec(contentFromAudioTime(a.currentTime))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, contentFromAudioTime])

  const seek = useCallback(
    (contentSec: number) => {
      const next = Math.min(Math.max(contentSec, 0), sync)
      const a = audioRef.current
      if (a && audioDuration > 0) {
        a.currentTime = audioTimeFromContent(next)
      }
      setCurrentSec(next)
    },
    [audioDuration, audioTimeFromContent, sync],
  )

  const setPlayingControlled = useCallback((v: boolean) => {
    const a = audioRef.current
    if (!a) {
      setPlaying(false)
      return
    }
    if (v) void a.play().catch(() => setPlaying(false))
    else a.pause()
  }, [])

  const togglePlay = useCallback(() => {
    const a = audioRef.current
    if (!a || !(audioDuration > 0)) return
    if (a.paused) void a.play().catch(() => setPlaying(false))
    else a.pause()
  }, [audioDuration])

  const canPlay = Boolean(audioUrl?.trim() && audioDuration > 0)

  return {
    currentSec,
    playing,
    durationSec: sync,
    setPlaying: setPlayingControlled,
    seek,
    togglePlay,
    canPlay,
  }
}

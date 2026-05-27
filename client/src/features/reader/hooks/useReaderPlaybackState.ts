import { useCallback, useEffect, useRef, useState } from 'react'

export type ReaderPlaybackState = {
  /** Шкала синхронизации текста (слова / API), сек — для подсветки */
  contentSec: number
  /** Реальное время воспроизведения файла — для таймера и шкалы в доке */
  audioCurrentSec: number
  audioDurationSec: number
  playing: boolean
  setPlaying: (v: boolean) => void
  /** Перейти к позиции в шкале синхронизации (тап по слову) */
  seek: (contentSec: number) => void
  /** Перейти к позиции в аудиофайле (скраббер в доке) */
  seekAudio: (audioSec: number) => void
  togglePlay: () => void
  canPlay: boolean
}

/**
 * Реальное аудио + отображение на шкале синхронизации текста.
 * Длительность файла и логическая длина синка могут различаться: подсветка
 * идёт по contentSec, таймер в доке — по реальному времени аудио.
 */
export function useReaderPlaybackState(
  audioUrl: string | undefined,
  syncDurationSec: number,
): ReaderPlaybackState {
  const sync = Math.max(0, syncDurationSec)

  const [contentSec, setContentSec] = useState(0)
  const [audioNowSec, setAudioNowSec] = useState(0)
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
    (sec: number) => {
      const d = audioDuration
      if (!(d > 0) || sync <= 0) return 0
      const clamped = Math.min(Math.max(sec, 0), sync)
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
      void Promise.resolve().then(() => {
        setAudioNowSec(0)
        setAudioDuration(0)
        setContentSec(0)
      })
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
    const onPause = () => {
      setPlaying(false)
      const dur = a.duration
      if (!(Number.isFinite(dur) && dur > 0)) return
      const at = a.currentTime
      setAudioNowSec(at)
      if (sync > 0) setContentSec(Math.min((at / dur) * sync, sync))
    }
    const onEnded = () => {
      setPlaying(false)
      setContentSec(sync)
      const dur = a.duration
      if (Number.isFinite(dur) && dur > 0) setAudioNowSec(dur)
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
      if (!a.paused) {
        const at = a.currentTime
        setAudioNowSec(at)
        setContentSec(contentFromAudioTime(at))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, contentFromAudioTime])

  const seek = useCallback(
    (nextContent: number) => {
      const next = Math.min(Math.max(nextContent, 0), sync)
      const a = audioRef.current
      if (a && audioDuration > 0) {
        const at = audioTimeFromContent(next)
        a.currentTime = at
        setAudioNowSec(at)
      }
      setContentSec(next)
    },
    [audioDuration, audioTimeFromContent, sync],
  )

  const seekAudio = useCallback(
    (audioSec: number) => {
      const d = audioDuration
      const a = audioRef.current
      if (!(d > 0) || !a) return
      const next = Math.min(Math.max(audioSec, 0), d)
      a.currentTime = next
      setAudioNowSec(next)
      setContentSec(contentFromAudioTime(next))
    },
    [audioDuration, contentFromAudioTime],
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
    contentSec,
    audioCurrentSec: audioNowSec,
    audioDurationSec: audioDuration,
    playing,
    setPlaying: setPlayingControlled,
    seek,
    seekAudio,
    togglePlay,
    canPlay,
  }
}

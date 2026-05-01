import { useCallback, useState } from 'react'

export type ReaderPlaybackState = {
  currentSec: number
  playing: boolean
  durationSec: number
  setPlaying: (v: boolean) => void
  seek: (sec: number) => void
  togglePlay: () => void
}

/**
 * Локальное состояние плеера.
 * В feat/client/reader-audio-sync сюда подключится <audio> и таймкоды.
 */
export function useReaderPlaybackState(
  durationSec: number,
): ReaderPlaybackState {
  const [currentSec, setCurrentSec] = useState(0)
  const [playing, setPlaying] = useState(false)

  const seek = useCallback(
    (sec: number) => {
      const d = Math.max(durationSec, 0)
      const next = Math.min(Math.max(sec, 0), d)
      setCurrentSec(next)
    },
    [durationSec],
  )

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p)
  }, [])

  return {
    currentSec,
    playing,
    durationSec,
    setPlaying,
    seek,
    togglePlay,
  }
}

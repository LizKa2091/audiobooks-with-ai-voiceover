import { useCallback } from 'react'
import type { ReaderPlaybackState } from '@/features/reader/hooks/useReaderPlaybackState'

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const s = Math.floor(sec % 60)
  const m = Math.floor(sec / 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export type AudioDockProps = {
  playback: ReaderPlaybackState
}

export function AudioDock({ playback }: AudioDockProps) {
  const {
    audioCurrentSec,
    audioDurationSec,
    playing,
    togglePlay,
    seekAudio,
    canPlay,
  } = playback
  const pct =
    audioDurationSec > 0
      ? Math.min(100, (audioCurrentSec / audioDurationSec) * 100)
      : 0

  const onProgressPointer = useCallback(
    (clientX: number, width: number, left: number) => {
      if (audioDurationSec <= 0 || width <= 0) return
      const x = Math.min(Math.max(clientX - left, 0), width)
      seekAudio((x / width) * audioDurationSec)
    },
    [audioDurationSec, seekAudio],
  )

  return (
    <div className="reader-audio-dock">
      <button
        type="button"
        className="reader-audio-dock__play"
        onClick={togglePlay}
        disabled={!canPlay}
        aria-pressed={playing}
        aria-label={playing ? 'Пауза' : 'Воспроизведение'}
        aria-disabled={!canPlay}
        title={!canPlay ? 'Аудио ещё не готово' : undefined}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="reader-audio-dock__track">
        <div
          className="reader-audio-dock__progress"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            onProgressPointer(e.clientX, r.width, r.left)
          }}
          onKeyDown={(e) => {
            if (audioDurationSec <= 0) return
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault()
              const step = audioDurationSec * 0.05
              seekAudio(
                e.key === 'ArrowLeft'
                  ? audioCurrentSec - step
                  : audioCurrentSec + step,
              )
            }
          }}
          tabIndex={audioDurationSec > 0 ? 0 : -1}
        >
          <div
            className="reader-audio-dock__progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="reader-audio-dock__times">
          <span>{formatTime(audioCurrentSec)}</span>
          <span className="muted">{formatTime(audioDurationSec)}</span>
        </div>
      </div>
    </div>
  )
}

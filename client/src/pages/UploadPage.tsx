import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { UploadPipelineSteps } from '@/features/upload/components/UploadPipelineSteps'
import {
  runUploadPipelineStub,
  UPLOAD_PIPELINE_STEPS,
  type UploadPipelineResult,
} from '@/features/upload/pipeline'
import { appendUploadedBook, notifyLibraryChanged } from '@/lib/localLibrary'
import { formatBytes } from '@/lib/formatBytes'

type Phase = 'idle' | 'running' | 'done' | 'error'

export function UploadPage() {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [currentStep, setCurrentStep] = useState(0)
  const [result, setResult] = useState<UploadPipelineResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canStart = Boolean(file) && phase !== 'running'
  const showSteps = file !== null || phase !== 'idle'

  function reset() {
    setFile(null)
    setPhase('idle')
    setCurrentStep(0)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleStart() {
    if (!file) return
    setError(null)
    setResult(null)
    setPhase('running')
    setCurrentStep(0)
    try {
      const res = await runUploadPipelineStub(file.name, (index) => {
        setCurrentStep(index)
      })
      appendUploadedBook(res)
      notifyLibraryChanged()
      setResult(res)
      setPhase('done')
    } catch {
      setPhase('error')
      setError('Ошибка обработки (имитация). Попробуйте снова.')
    }
  }

  return (
    <div className="page page--wide">
      <h1>Загрузка PDF</h1>
      <p className="muted">
        Выберите файл. Обработка выполняется на заглушках — без реального бэкенда
        и без отправки данных в сеть.
      </p>

      <div className="upload-panel">
        <input
          ref={fileInputRef}
          id={inputId}
          className="upload-input"
          type="file"
          accept="application/pdf,.pdf"
          disabled={phase === 'running'}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            setFile(f)
            setPhase('idle')
            setResult(null)
            setError(null)
            setCurrentStep(0)
          }}
        />
        <div className="upload-actions">
          <button
            type="button"
            className="button button--primary"
            disabled={phase === 'running'}
            onClick={() => fileInputRef.current?.click()}
          >
            Выбрать PDF
          </button>
          {file ? (
            <span className="upload-file-meta">
              <span className="upload-file-name">{file.name}</span>
              <span className="muted">{formatBytes(file.size)}</span>
            </span>
          ) : (
            <span className="muted">Файл не выбран</span>
          )}
        </div>

        <div className="upload-toolbar">
          <button
            type="button"
            className="button button--primary"
            disabled={!canStart}
            onClick={() => void handleStart()}
          >
            Начать обработку
          </button>
          <button
            type="button"
            className="button"
            disabled={phase === 'running'}
            onClick={reset}
          >
            Сбросить
          </button>
        </div>
      </div>

      {error ? (
        <p className="upload-error" role="alert">
          {error}
        </p>
      ) : null}

      {showSteps ? (
        <UploadPipelineSteps
          steps={UPLOAD_PIPELINE_STEPS}
          phase={phase}
          currentStep={currentStep}
        />
      ) : null}

      {phase === 'done' && result ? (
        <div className="upload-success">
          <p>
            Книга «{result.title}» условно готова (стаб). Откройте в читалке или
            вернитесь в библиотеку.
          </p>
          <div className="cta-row">
            <Link
              to={`/reader/${encodeURIComponent(result.bookId)}`}
              className="button button--primary"
            >
              Слушать
            </Link>
            <Link to="/library" className="button">
              Библиотека
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

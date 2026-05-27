import type { UploadPipelineStep } from '@/features/upload/pipeline'

export type UploadPhase = 'idle' | 'running' | 'done' | 'error'

type UploadPipelineStepsProps = {
  steps: UploadPipelineStep[]
  phase: UploadPhase
  /** Активный шаг во время running; после ошибки — число завершённых до сбоя */
  currentStep: number
}

type StepVisualState = 'pending' | 'active' | 'done'

function stepState(
  index: number,
  phase: UploadPhase,
  currentStep: number,
): StepVisualState {
  if (phase === 'idle') return 'pending'
  if (phase === 'done') return 'done'
  if (phase === 'error') {
    return index < currentStep ? 'done' : 'pending'
  }
  if (phase === 'running') {
    if (index < currentStep) return 'done'
    if (index === currentStep) return 'active'
  }
  return 'pending'
}

export function UploadPipelineSteps({
  steps,
  phase,
  currentStep,
}: UploadPipelineStepsProps) {
  return (
    <ol className="upload-steps" aria-label="Этапы обработки">
      {steps.map((step, index) => {
        const state = stepState(index, phase, currentStep)
        return (
          <li
            key={step.id}
            className={[
              'upload-step',
              state === 'active' ? 'upload-step--active' : '',
              state === 'done' ? 'upload-step--done' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="upload-step__marker" aria-hidden>
              {state === 'done' ? '✓' : state === 'active' ? '…' : index + 1}
            </span>
            <div className="upload-step__body">
              <span className="upload-step__title">{step.title}</span>
              <span className="upload-step__desc">{step.description}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

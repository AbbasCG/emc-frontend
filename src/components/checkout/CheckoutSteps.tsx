import { Check } from 'lucide-react'

/**
 * The three progressive checkout steps (§9) rendered as ONE rail on ONE screen.
 *
 * Brand law: the rail is sea-family only — orange stays reserved for the single
 * primary action on the screen (the pay button), never for navigation chrome.
 * No shadows: public surfaces are drawn with hairlines and tokens only.
 */

export type CheckoutStepId = 1 | 2 | 3

export type CheckoutStep = {
  id: CheckoutStepId
  label: string
}

type Props = {
  steps: readonly CheckoutStep[]
  /** The step currently open. */
  current: CheckoutStepId
  /** Highest step the visitor unlocked — later steps stay locked until validation passes. */
  reached: CheckoutStepId
  onSelect: (id: CheckoutStepId) => void
}

export default function CheckoutSteps({ steps, current, reached, onSelect }: Props) {
  return (
    <nav aria-label="مراحل إتمام الطلب">
      <ol className="flex items-center gap-1.5 sm:gap-3">
        {steps.map((step, index) => {
          const isCurrent = step.id === current
          const isDone = step.id < reached || (step.id < current)
          const isLocked = step.id > reached

          const markerCls =
            isCurrent ? 'border-navy bg-navy text-white'
            : isDone ? 'border-customBlue bg-white text-customBlue'
            : 'border-line bg-white text-muted-500'

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={() => { if (!isLocked) onSelect(step.id) }}
                disabled={isLocked}
                aria-current={isCurrent ? 'step' : undefined}
                className="emc-focus-ring flex min-w-0 items-center gap-2 text-right disabled:cursor-not-allowed"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black tabular-nums ${markerCls}`}
                >
                  {isDone ? <Check size={14} aria-hidden /> : String(step.id)}
                </span>
                <span
                  className={`truncate text-xs font-black sm:text-sm ${
                    isCurrent ? 'text-navy' : isLocked ? 'text-muted-400' : 'text-customBlue'
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {index < steps.length - 1 && (
                <span aria-hidden className="hidden h-px flex-1 bg-line sm:block" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

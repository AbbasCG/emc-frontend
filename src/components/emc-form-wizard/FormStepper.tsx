import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type WizardStepMeta = {
  id: number
  title: string
  hint?: string
}

type Props = {
  steps: readonly WizardStepMeta[]
  /** 1-based */
  currentStep: number
  /** Allow jumping back to completed steps */
  onStepSelect?: (stepId: number) => void
  /** Compact single-row mode for overlay/modal use */
  compact?: boolean
}

export function FormStepper({ steps, currentStep, onStepSelect, compact }: Props) {
  // Compact mode: horizontal dots + current step label — keeps header height minimal
  if (compact) {
    const currentMeta = steps.find((m) => m.id === currentStep)
    return (
      <div className="flex items-center gap-2.5" role="list" aria-label="خطوات النموذج">
        <div className="flex items-center gap-1.5">
          {steps.map((meta) => {
            const done = currentStep > meta.id
            const active = currentStep === meta.id
            const clickable = Boolean(onStepSelect) && done
            return (
              <motion.button
                key={meta.id}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepSelect?.(meta.id)}
                title={meta.title}
                aria-current={active ? 'step' : undefined}
                layout
                className={cn(
                  'grid place-items-center rounded-lg font-black transition',
                  active && 'h-7 w-7 bg-[#F28C00] text-white shadow-md ring-2 ring-white/30 text-[11px]',
                  done && 'h-5 w-5 bg-emerald-400 text-white text-[9px]',
                  !done && !active && 'h-5 w-5 border border-white/25 bg-white/10 text-white/40 text-[9px]',
                  clickable && 'cursor-pointer hover:brightness-110',
                )}
              >
                {done ? <Check className="h-3 w-3" aria-hidden /> : meta.id}
              </motion.button>
            )
          })}
        </div>

        {currentMeta && (
          <span className="min-w-0 flex-1 truncate text-[11px] font-black text-white/80">
            {currentMeta.title}
          </span>
        )}

        <span className="shrink-0 text-[10px] font-black tabular-nums text-white/45">
          {currentStep}/{steps.length}
        </span>
      </div>
    )
  }

  // Full mode — used by inline variant
  return (
    <>
      <div className="hidden lg:block">
        <div className="relative mb-6">
          <div
            className="absolute end-[8%] start-[8%] top-[22px] z-0 h-[5px] rounded-full bg-gradient-to-l from-slate-200 via-[#0077B6]/25 to-slate-200"
            aria-hidden
          />
          <div
            className="relative z-[1] grid gap-2"
            style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
          >
            {steps.map((meta) => {
              const done = currentStep > meta.id
              const active = currentStep === meta.id
              const clickable = Boolean(onStepSelect) && done
              return (
                <div key={meta.id} className="flex flex-col items-center text-center">
                  <motion.button
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && onStepSelect?.(meta.id)}
                    layout
                    className={cn(
                      'grid h-11 w-11 place-items-center rounded-2xl text-[13px] font-black shadow-md ring-2 ring-white transition',
                      done && 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
                      active &&
                        !done &&
                        'bg-gradient-to-br from-[#F28C00] to-amber-600 text-white shadow-[0_12px_28px_rgba(242,140,0,0.35)]',
                      !done && !active && 'border border-slate-200 bg-white text-slate-500',
                      clickable && 'cursor-pointer hover:brightness-105',
                    )}
                  >
                    {done ?
                      <Check className="h-5 w-5" aria-hidden />
                    : meta.id}
                  </motion.button>
                  <p className="mt-2 hidden text-[11px] font-black leading-snug text-[#0C2A4B] lg:block">
                    {meta.title}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        {steps.map((meta) => {
          const done = currentStep > meta.id
          const active = currentStep === meta.id
          return (
            <div
              key={meta.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition',
                active && 'border-[#0077B6]/45 bg-[#0077B6]/[0.06] shadow-sm',
                done && !active && 'border-emerald-200/80 bg-emerald-50/50',
                !done && !active && 'border-slate-200/80 bg-white/90',
              )}
            >
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[11px] font-black',
                  done && 'bg-emerald-600 text-white',
                  active && !done && 'bg-[#F28C00] text-white',
                  !done && !active && 'bg-slate-100 text-slate-600',
                )}
              >
                {done ?
                  <Check className="h-3.5 w-3.5" aria-hidden />
                : meta.id}
              </span>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[12px] font-black text-[#0C2A4B]">{meta.title}</p>
                {meta.hint ?
                  <p className="text-[10px] font-semibold text-slate-500">{meta.hint}</p>
                : null}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

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
}

export function FormStepper({ steps, currentStep, onStepSelect }: Props) {
  return (
    <>
      <div className="hidden lg:block">
        <div className="relative mb-8">
          <div
            className="absolute end-[8%] start-[8%] top-[22px] z-0 h-[5px] rounded-full bg-gradient-to-l from-slate-200 via-[#2691C2]/25 to-slate-200"
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
                        'bg-gradient-to-br from-[#EC943C] to-amber-600 text-white shadow-[0_12px_28px_rgba(236,148,60,0.35)]',
                      !done && !active && 'border border-slate-200 bg-white text-slate-500',
                      clickable && 'cursor-pointer hover:brightness-105',
                    )}
                  >
                    {done ?
                      <Check className="h-5 w-5" aria-hidden />
                    : meta.id}
                  </motion.button>
                  <p className="mt-3 hidden text-[11px] font-black leading-snug text-[#22334A] lg:block">{meta.title}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {steps.map((meta) => {
          const done = currentStep > meta.id
          const active = currentStep === meta.id
          return (
            <div
              key={meta.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-4 py-3 transition',
                active && 'border-[#2691C2]/45 bg-[#2691C2]/[0.06] shadow-sm',
                done && !active && 'border-emerald-200/80 bg-emerald-50/50',
                !done && !active && 'border-slate-200/80 bg-white/90',
              )}
            >
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[12px] font-black',
                  done && 'bg-emerald-600 text-white',
                  active && !done && 'bg-[#EC943C] text-white',
                  !done && !active && 'bg-slate-100 text-slate-600',
                )}
              >
                {done ?
                  <Check className="h-4 w-4" aria-hidden />
                : meta.id}
              </span>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[13px] font-black text-[#22334A]">{meta.title}</p>
                {meta.hint ?
                  <p className="text-[11px] font-semibold text-muted-600">{meta.hint}</p>
                : null}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

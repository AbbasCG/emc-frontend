import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  EMC_WIZARD_GLASS_CARD,
  EMC_WIZARD_HEADER_GRADIENT,
} from '@/components/emc-form-wizard/emcWizardTokens'
import { FormProgressBar } from '@/components/emc-form-wizard/FormProgressBar'
import { FormStepper, type WizardStepMeta } from '@/components/emc-form-wizard/FormStepper'

type Variant = 'overlay' | 'inline'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  eyebrow?: string
  stepsMeta: readonly WizardStepMeta[]
  currentStep: number
  onStepSelect?: (stepId: number) => void
  /** 0–100 */
  progressPercent: number
  progressLabel?: string
  mainColumn: ReactNode
  sidebar: ReactNode
  variant?: Variant
  className?: string
  lockBodyScroll?: boolean
  /** Max width for overlay content */
  maxWidthClassName?: string
}

export function FormWizardShell({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  stepsMeta,
  currentStep,
  onStepSelect,
  progressPercent,
  progressLabel,
  mainColumn,
  sidebar,
  variant = 'overlay',
  className,
  lockBodyScroll = true,
  maxWidthClassName = 'max-w-6xl',
}: Props) {
  useEffect(() => {
    if (!lockBodyScroll || variant !== 'overlay') return
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, lockBodyScroll, variant])

  const inner = (
    <div
      className={cn(
        variant === 'overlay' && 'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[1.9rem] border border-white/65 bg-white/72 shadow-[0_28px_90px_-20px_rgba(15,23,42,0.45)] backdrop-blur-xl',
        variant === 'inline' && 'w-full',
        maxWidthClassName,
        variant === 'inline' && 'space-y-6 px-4 py-6 sm:px-6',
        className,
      )}
      dir="rtl"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={cn(EMC_WIZARD_HEADER_GRADIENT, variant === 'overlay' && 'm-3 shrink-0 sm:m-4 !py-3 sm:!py-4')}>
        <div className="pointer-events-none absolute -end-24 -top-24 h-56 w-56 rounded-full bg-[#0077B6]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 start-0 h-64 w-64 rounded-full bg-[#F28C00]/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-right">
            {eyebrow ?
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{eyebrow}</p>
            : null}
            <h2 className={cn('font-black leading-tight text-white', variant === 'overlay' ? 'text-xl sm:text-2xl' : 'mt-1 text-2xl sm:text-3xl')}>{title}</h2>
            {subtitle && variant !== 'overlay' ?
              <p className="mt-2 max-w-xl text-[13px] font-semibold leading-relaxed text-white/85">{subtitle}</p>
            : null}
          </div>
          {variant === 'overlay' ?
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          : null}
        </div>

        <div className={cn('relative', variant === 'overlay' ? 'mt-2 space-y-2' : 'mt-6 space-y-5')}>
          {variant === 'overlay' ? (
            <>
              <FormStepper steps={stepsMeta} currentStep={currentStep} onStepSelect={onStepSelect} compact />
              <div className="h-0.5 overflow-hidden rounded-full bg-white/15">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-l from-[#0077B6] to-[#F28C00]"
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                />
              </div>
            </>
          ) : (
            <>
              <FormStepper steps={stepsMeta} currentStep={currentStep} onStepSelect={onStepSelect} />
              <FormProgressBar percent={progressPercent} label={progressLabel} />
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-8 lg:grid-cols-12',
          variant === 'overlay' ? 'min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 sm:px-6' : '',
        )}
      >
        <div className="lg:col-span-8">
          <div className={cn(EMC_WIZARD_GLASS_CARD, 'p-5 sm:p-7')}>{mainColumn}</div>
        </div>
        <aside className="space-y-4 lg:col-span-4">{sidebar}</aside>
      </div>
    </div>
  )

  if (variant === 'inline') {
    if (!open) return null
    return inner
  }

  return (
    <AnimatePresence>
      {open ?
        <motion.div
          key="form-wizard-overlay"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[200] overflow-hidden bg-[#0F172A]/55 backdrop-blur-md"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <div className="flex h-full items-start justify-center p-3 sm:p-6">{inner}</div>
        </motion.div>
      : null}
    </AnimatePresence>
  )
}

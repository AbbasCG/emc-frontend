import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

/** Ring length for r=54 in viewBox 0 0 120 120 */
const RING_LEN = 2 * Math.PI * 54

type Props = {
  open: boolean
  title: string
  description?: ReactNode
  continueLabel?: string
  onContinue?: () => void
  /** Replaces the default single button when provided (e.g. multiple CTAs) */
  actions?: ReactNode
}

export function FormSuccessState({ open, title, description, continueLabel = 'تم', onContinue, actions }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(panelRef, { active: open, onEscape: onContinue })

  const particles = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: `${12 + (i * 41) % 76}%`,
    top: `${8 + (i * 29) % 72}%`,
    delay: i * 0.035,
    wide: i % 3 === 0,
    tone: i % 2 === 0 ? '#0077B6' : '#F28C00',
  }))

  return (
    <AnimatePresence>
      {open ?
        <motion.div
          key="form-success"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emc-form-success-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="fixed inset-0 z-[210] flex items-center justify-center bg-[#0F172A]/55 px-4 backdrop-blur-md"
        >
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-[0_28px_80px_-16px_rgba(12, 42, 75,0.35)] ring-1 ring-[#0077B6]/15 backdrop-blur-xl"
            dir="rtl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(0, 119, 182,0.14),transparent_50%),radial-gradient(ellipse_at_10%_90%,rgba(242, 140, 0,0.12),transparent_48%)]" />

            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {particles.map((p) => (
                <motion.span
                  key={p.id}
                  className="absolute rounded-full opacity-0 shadow-sm"
                  style={{
                    left: p.left,
                    top: p.top,
                    width: p.wide ? 10 : 6,
                    height: p.wide ? 10 : 6,
                    background: p.tone,
                  }}
                  initial={{ opacity: 0, scale: 0, y: 12 }}
                  animate={{
                    opacity: [0, 0.85, 0.35],
                    scale: [0, 1, 0.85],
                    y: [12, -28, -12],
                  }}
                  transition={{
                    duration: 1.15,
                    delay: 0.25 + p.delay,
                    ease: [0.22, 0.61, 0.36, 1],
                  }}
                />
              ))}
            </div>

            <div className="relative px-8 pb-9 pt-10 text-center">
              <div className="relative mx-auto mb-8 flex h-[120px] w-[120px] items-center justify-center">
                <svg width={120} height={120} viewBox="0 0 120 120" className="-rotate-90 shrink-0 overflow-visible" aria-hidden>
                  <defs>
                    <linearGradient id="emcFormSuccessRing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0077B6" />
                      <stop offset="100%" stopColor="#F28C00" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="url(#emcFormSuccessRing)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={RING_LEN}
                    initial={{ strokeDashoffset: RING_LEN }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 0.72, ease: [0.22, 0.61, 0.36, 1], delay: 0.08 }}
                  />
                </svg>

                <motion.span
                  className="absolute grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#0077B6] to-[#0C2A4B] text-white shadow-lg"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.35 }}
                >
                  <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
                </motion.span>
              </div>

              <h3 id="emc-form-success-title" className="text-xl font-black text-[#0C2A4B] sm:text-2xl">
                {title}
              </h3>
              {description ?
                <div id="emc-form-success-desc" className="mt-3 text-[13px] font-semibold leading-relaxed text-slate-600">
                  {description}
                </div>
              : null}

              {actions ?
                <div className="mt-8 flex w-full flex-col gap-3">{actions}</div>
              : onContinue ?
                <button
                  type="button"
                  onClick={onContinue}
                  className="mt-8 w-full rounded-2xl bg-gradient-to-l from-[#F28C00] to-[#0077B6] px-6 py-3 text-sm font-black text-white shadow-[0_16px_40px_-14px_rgba(242, 140, 0,0.55)] transition hover:brightness-[1.03]"
                >
                  {continueLabel}
                </button>
              : null}
            </div>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>
  )
}

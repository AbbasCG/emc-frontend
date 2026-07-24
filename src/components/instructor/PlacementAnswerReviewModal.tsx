import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { CEFR_MAP, toDMY } from './InstructorStudentDrawer'
import { PlacementAnswerReviewBody } from './PlacementAnswerReviewBody'

import type { PlacementStudentRow } from '@/api/placementApi'

export type ReviewSubject = {
  attemptId: number
  name: string
  email: string
  avatarUrl?: string | null
  score: number | null
  totalQuestions: number
  level: string | null
  completedAt?: string | null
  /** Full row for dashboard written-tab overview banner */
  row?: PlacementStudentRow
}

type Props = {
  subject: ReviewSubject | null
  onClose: () => void
}

/** Full-featured exam answer review — replaces the old drawer accordion. The
 *  question navigator/filters/search/fetch logic lives in
 *  PlacementAnswerReviewBody so it can also be embedded as a dashboard tab. */
export function PlacementAnswerReviewModal({ subject, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // ── Keyboard: ESC to close, basic focus trap ───────────────────────────
  useEffect(() => {
    if (!subject) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [subject, onClose])

  const pct = subject?.score != null && subject.totalQuestions > 0
    ? Math.round((subject.score / subject.totalQuestions) * 100)
    : null
  const cefr = subject?.level ? CEFR_MAP[subject.level] : null

  return (
    <AnimatePresence>
      {subject && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/55 p-0 backdrop-blur-sm sm:p-4"
          dir="rtl"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`مراجعة إجابات ${subject.name}`}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="flex h-full w-full flex-col overflow-hidden bg-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.45)] sm:h-[90vh] sm:max-h-[820px] sm:w-[92vw] sm:max-w-4xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-l from-[#0C2A4B] to-[#1a2d44] px-5 py-4 text-white sm:px-6 sm:py-5">
              <div className="pointer-events-none absolute -left-4 top-0 h-24 w-24 rounded-full bg-[#F28C00]/20 blur-[45px]" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {subject.avatarUrl ? (
                    <img src={subject.avatarUrl} alt={subject.name} className="h-11 w-11 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-[16px] font-black">
                      {subject.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-black leading-tight">{subject.name}</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-white/55">{subject.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {cefr && (
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${cefr.bg} ${cefr.text}`}>
                          {cefr.cefr} · {cefr.arabic}
                        </span>
                      )}
                      {subject.score != null && (
                        <span className="rounded-lg bg-white/15 px-2 py-0.5 font-mono text-[10px] font-black tabular-nums">
                          {subject.score}/{subject.totalQuestions}{pct != null ? ` · ${pct}%` : ''}
                        </span>
                      )}
                      {subject.completedAt && (
                        <span className="font-mono text-[10px] font-semibold text-white/40">{toDMY(subject.completedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <PlacementAnswerReviewBody subject={subject} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

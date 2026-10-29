import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { GuardContext, hasNestedLayer, lockBodyScroll, type Guard, type GuardApi } from './modalGuard'
import { cn } from '@/lib/utils'

/**
 * A large, centered workspace dialog: the platform's replacement for "details" panels that used to hang off
 * the screen edge.
 *
 *  - Desktop: centered, 85-92vw wide up to a sensible maximum, at most 94% of the viewport tall, with the body
 *    scrolling inside it. Mobile: full screen, one column, the close button always in the header.
 *  - Keyboard: focus is trapped, Escape closes, and focus returns to the control that opened it.
 *  - The page behind does not scroll while it is open.
 *  - It never closes by accident: while a child reports that it is submitting (busy) every close path is ignored,
 *    and while a child reports unsaved input (dirty) a confirmation is asked first.
 *  - Nested dialogs are respected: a native <dialog> (ConfirmDialog) or anything marked `data-nested-overlay`
 *    owns Escape and clicks while it is open, so one Escape never closes two layers.
 *
 * `onClose` is the request to close; this component decides whether to honour it.
 */

const SIZES = {
  md: 'sm:w-[min(92vw,40rem)]',
  lg: 'sm:w-[min(92vw,64rem)]',
  xl: 'sm:w-[min(92vw,85rem)]',
} as const

export interface CenteredModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  /** Shown under the title in the header (status pills and the like). */
  headerExtra?: ReactNode
  size?: keyof typeof SIZES
  /** Force the busy state from the parent (a child can also set it with useModalGuard). */
  busy?: boolean
  /** Force the unsaved-input state from the parent. */
  dirty?: boolean
  dirtyTitle?: string
  dirtyMessage?: string
  /** Where focus goes when it closes; defaults to whatever was focused when it opened. */
  returnFocusTo?: HTMLElement | null | (() => HTMLElement | null)
  footer?: ReactNode
  /** Test hook / analytics label for the panel. */
  testId?: string
  children: ReactNode
}

export function CenteredModal({
  open,
  onClose,
  title,
  subtitle,
  headerExtra,
  size = 'lg',
  busy = false,
  dirty = false,
  dirtyTitle = 'تجاهل التغييرات؟',
  dirtyMessage = 'لديك إدخال لم يُحفظ. إن أغلقت النافذة الآن سيضيع.',
  returnFocusTo,
  footer,
  testId,
  children,
}: CenteredModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const reduce = useReducedMotion()
  const [guards, setGuards] = useState<Record<string, Guard>>({})
  const [confirming, setConfirming] = useState(false)
  const openerRef = useRef<HTMLElement | null>(null)

  const api = useMemo<GuardApi>(
    () => ({
      set: (key, g) => setGuards((cur) => ((cur[key]?.busy ?? false) === (g.busy ?? false) && (cur[key]?.dirty ?? false) === (g.dirty ?? false) ? cur : { ...cur, [key]: { busy: g.busy ?? false, dirty: g.dirty ?? false } })),
      clear: (key) =>
        setGuards((cur) => {
          if (!(key in cur)) return cur
          const { [key]: _gone, ...rest } = cur
          void _gone

          return rest
        }),
    }),
    [],
  )

  const isBusy = busy || Object.values(guards).some((g) => g.busy)
  const isDirty = dirty || Object.values(guards).some((g) => g.dirty)

  // Remember what opened the dialog (before focus moves into it).
  useEffect(() => {
    if (open) openerRef.current = (document.activeElement as HTMLElement | null) ?? null
  }, [open])

  const requestClose = useCallback(() => {
    if (isBusy) return
    if (isDirty) {
      setConfirming(true)

      return
    }
    onClose()
  }, [isBusy, isDirty, onClose])

  useFocusTrap(panelRef, { active: open })

  // Escape: ignored while a nested layer owns it, otherwise a request to close.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (hasNestedLayer()) return
      e.preventDefault()
      requestClose()
    }
    document.addEventListener('keydown', onKey)

    return () => document.removeEventListener('keydown', onKey)
  }, [open, requestClose])

  useEffect(() => {
    if (!open) return

    return lockBodyScroll()
  }, [open])

  // Declared after the focus trap so its cleanup runs last and wins: focus goes to the opening control.
  const returnRef = useRef(returnFocusTo)
  useEffect(() => {
    returnRef.current = returnFocusTo
  })
  useEffect(() => {
    if (!open) return

    return () => {
      const want = typeof returnRef.current === 'function' ? returnRef.current() : returnRef.current
      const target = want && want.isConnected ? want : openerRef.current
      if (target && target.isConnected) target.focus?.()
    }
  }, [open])

  // A backdrop press closes only when the press STARTED and ENDED on the backdrop (a text selection that
  // drifts onto it must not), and only when nothing else would be lost.
  const pressStart = useRef(false)

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ?
        <GuardContext.Provider value={api} key="centered-modal">
          <motion.div
            className="fixed inset-0 z-modal-overlay bg-deepBlue/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.12 }}
            aria-hidden="true"
          />
          <div
            className="fixed inset-0 z-modal-content flex items-center justify-center p-0 sm:p-6"
            dir="rtl"
            onMouseDown={(e) => {
              pressStart.current = e.target === e.currentTarget
            }}
            onMouseUp={(e) => {
              if (pressStart.current && e.target === e.currentTarget && !isBusy && !isDirty && !hasNestedLayer()) onClose()
              pressStart.current = false
            }}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-busy={isBusy || undefined}
              data-testid={testId}
              data-size={size}
              tabIndex={-1}
              initial={reduce ? false : { opacity: 0, scale: 0.985, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.985, y: 6 }}
              transition={{ duration: reduce ? 0 : 0.14, ease: [0.22, 0.61, 0.36, 1] }}
              className={cn(
                'flex w-full flex-col overflow-hidden border border-deepBlue/10 bg-white shadow-[0_28px_90px_-20px_rgba(15,23,42,0.45)] outline-none',
                // Mobile: the whole screen. From the small breakpoint up: a centered card with room around it.
                'h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[94dvh] sm:rounded-3xl',
                SIZES[size],
              )}
            >
              <header className="flex flex-none items-start gap-3 border-b border-deepBlue/[0.08] bg-white px-4 py-3.5 sm:px-6 sm:py-4">
                <div className="min-w-0 flex-1">
                  <h2 id={titleId} className="text-lg font-black leading-snug text-deepBlue sm:text-xl">
                    {title}
                  </h2>
                  {subtitle ? <p className="mt-0.5 text-[12px] font-semibold text-deepBlue/55">{subtitle}</p> : null}
                  {headerExtra ? <div className="mt-2">{headerExtra}</div> : null}
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={isBusy}
                  aria-label="إغلاق النافذة"
                  className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-deepBlue/10 text-deepBlue/70 transition hover:border-customBlue/40 hover:bg-customBlue/[0.06] hover:text-customBlue focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 disabled:opacity-40 sm:h-9 sm:w-9"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">{children}</div>

              {footer ? <footer className="flex-none border-t border-deepBlue/[0.08] bg-white px-4 py-3 sm:px-6">{footer}</footer> : null}
            </motion.div>
          </div>

          <ConfirmDialog
            open={confirming}
            title={dirtyTitle}
            description={dirtyMessage}
            confirmLabel="تجاهل وإغلاق"
            cancelLabel="متابعة التحرير"
            variant="danger"
            onConfirm={() => {
              setConfirming(false)
              onClose()
            }}
            onCancel={() => setConfirming(false)}
          />
        </GuardContext.Provider>
      : null}
    </AnimatePresence>,
    document.body,
  )
}

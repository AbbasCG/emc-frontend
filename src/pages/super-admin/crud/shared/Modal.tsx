import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'

type ModalProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  widthClassName?: string
  children: React.ReactNode
  footerSlot?: React.ReactNode
}

export function CrudModal({
  open,
  title,
  subtitle,
  onClose,
  widthClassName,
  children,
  footerSlot,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, { active: open, onEscape: onClose })

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ?
        <>
          <motion.button
            type="button"
            aria-label="إغلاق"
            dir="rtl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-modal-overlay bg-foreground/35 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-modal-content grid place-items-center p-4" dir="rtl">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal
              aria-labelledby="emc-modal-title"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className={cn(
                'max-h-[min(92vh,860px)] w-full overflow-hidden rounded-3xl border border-ink-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.15)]',
                widthClassName ?? 'max-w-lg',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div dir="rtl" className="flex items-start justify-between gap-3 border-b border-ink-100 bg-gradient-to-l from-white via-brand-50/40 to-white px-5 py-4 text-right">
                <div className="min-w-0 text-right">
                  <h2 id="emc-modal-title" className="text-base font-black text-deepBlue sm:text-lg">
                    {title}
                  </h2>
                  {subtitle ?
                    <p className="mt-1 text-[12px] font-semibold leading-relaxed text-muted-600">{subtitle}</p>
                  : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-ink-100 text-deepBlue/70 transition hover:border-customBlue/30 hover:bg-brand-50 hover:text-customBlue"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div dir="rtl" className="max-h-[min(70vh,640px)] overflow-y-auto px-5 py-4 text-right rtl:text-right">
                {children}
              </div>
              {footerSlot ?
                <div dir="rtl" className="border-t border-ink-100 bg-slate-50/80 px-5 py-3 text-right rtl:text-right">
                  {footerSlot}
                </div>
              : null}
            </motion.div>
          </div>
        </>
      : null}
    </AnimatePresence>,
    document.body,
  )
}

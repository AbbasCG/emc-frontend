import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type CrudDrawerProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footerSlot?: ReactNode
  /** Panel width — default suitable for detail panels */
  widthClassName?: string
}

/** RTL slide-over panel from the logical start edge (right in Arabic RTL). */
export function CrudDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footerSlot,
  widthClassName = 'max-w-md sm:max-w-lg',
}: CrudDrawerProps) {
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
            aria-label="إغلاق اللوحة"
            dir="rtl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-modal-overlay bg-[#0F172A]/40 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal
            aria-labelledby="emc-drawer-title"
            dir="rtl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className={cn(
              'fixed inset-y-0 right-0 z-modal-content flex w-full flex-col border-l border-white/10 bg-white/95 shadow-[-12px_0_48px_rgba(15,23,42,0.12)] backdrop-blur-xl',
              widthClassName,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-ink-100/80 bg-gradient-to-l from-white via-brand-50/30 to-white px-5 py-4">
              <div className="min-w-0 text-right">
                <h2 id="emc-drawer-title" className="text-base font-black text-deepBlue sm:text-lg">
                  {title}
                </h2>
                {subtitle ?
                  <p className="mt-1 text-[12px] font-semibold leading-relaxed text-muted-600">{subtitle}</p>
                : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-ink-100 text-deepBlue/70 transition hover:border-customBlue/35 hover:bg-brand-50 hover:text-customBlue"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 text-right rtl:text-right">{children}</div>
            {footerSlot ?
              <div className="border-t border-ink-100 bg-slate-50/90 px-5 py-3 text-right rtl:text-right">{footerSlot}</div>
            : null}
          </motion.aside>
        </>
      : null}
    </AnimatePresence>,
    document.body,
  )
}

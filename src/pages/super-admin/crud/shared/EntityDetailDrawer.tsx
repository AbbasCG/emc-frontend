import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'

export type EntityDetailTab = {
  id: string
  labelAr: string
  content: ReactNode
}

export function EntityDetailSection(props: {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  const { title, icon, children, className } = props
  return (
    <section
      dir="rtl"
      className={cn(
        'rounded-2xl border border-ink-100/80 bg-gradient-to-bl from-white via-white to-slate-50/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-white/90',
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-ink-100/70 pb-2 rtl:flex-row-reverse">
        <h3 className="text-[12px] font-black uppercase tracking-wide text-deepBlue">{title}</h3>
        {icon ? <span className="text-muted-500">{icon}</span> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function EntityDetailField(props: {
  label: string
  value: ReactNode
  className?: string
}) {
  const { label, value, className } = props
  return (
    <div
      className={cn(
        'rounded-xl border border-ink-100/65 bg-white/95 px-3 py-2.5 text-right shadow-sm rtl:text-right',
        className,
      )}
    >
      <dt className="text-[10px] font-black uppercase tracking-wide text-muted-500">{label}</dt>
      <dd className="mt-1 text-[13px] font-semibold leading-snug text-deepBlue">{value}</dd>
    </div>
  )
}

type EntityDetailDrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  avatar?: ReactNode
  badges?: ReactNode
  /** When empty, body renders `fallback` or nothing */
  tabs?: EntityDetailTab[]
  /** Shown when tabs undefined or empty */
  children?: ReactNode
  footerSlot?: ReactNode
  widthClassName?: string
  defaultTabId?: string
  /** When false, body does not scroll — child handles layout (e.g. embedded form with sticky footer) */
  scrollBody?: boolean
}

/**
 * Large RTL drawer for “view details” — prefer over small CrudModal for read-only inspection.
 */
export function EntityDetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  avatar,
  badges,
  tabs,
  children,
  footerSlot,
  widthClassName = 'max-w-full sm:max-w-4xl lg:max-w-5xl',
  defaultTabId,
  scrollBody = true,
}: EntityDetailDrawerProps) {
  const panelRef = useRef<HTMLElement>(null)
  useFocusTrap(panelRef, { active: open, onEscape: onClose })

  const orderedTabs = tabs ?? []
  const [active, setActive] = useState(() => defaultTabId ?? orderedTabs[0]?.id ?? '')

  const activeContent = useMemo(() => {
    if (!orderedTabs.length) return children ?? null
    return orderedTabs.find((t) => t.id === active)?.content ?? orderedTabs[0]?.content ?? children
  }, [orderedTabs, active, children])

  useEffect(() => {
    if (!open) return
    const list = tabs ?? []
    setActive(defaultTabId ?? list[0]?.id ?? '')
  }, [open, title, defaultTabId, tabs])

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
            className="fixed inset-0 z-modal-overlay bg-[#0F172A]/45 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal
            aria-labelledby="emc-entity-drawer-title"
            dir="rtl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className={cn(
              'fixed inset-y-0 right-0 z-modal-content flex w-full flex-col border-l border-white/15 bg-white/[0.97] shadow-[-16px_0_56px_rgba(15,23,42,0.14)] backdrop-blur-2xl',
              widthClassName,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-ink-100/80 bg-gradient-to-l from-white via-brand-50/35 to-white px-5 py-5">
              <div className="flex items-start justify-between gap-4 rtl:flex-row-reverse">
                <div className="flex min-w-0 flex-1 items-start gap-4 rtl:flex-row-reverse">
                  {avatar ?
                    <div className="shrink-0">{avatar}</div>
                  : null}
                  <div className="min-w-0 flex-1 text-right">
                    <h2
                      id="emc-entity-drawer-title"
                      className="text-lg font-black leading-tight text-deepBlue sm:text-xl"
                    >
                      {title}
                    </h2>
                    {subtitle ?
                      <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-muted-600">{subtitle}</p>
                    : null}
                    {badges ? <div className="mt-3 flex flex-wrap justify-end gap-2">{badges}</div> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink-100 text-deepBlue/70 transition hover:border-customBlue/35 hover:bg-brand-50 hover:text-customBlue"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              {orderedTabs.length > 1 ?
                <div className="mt-5 flex flex-wrap gap-1 rounded-2xl border border-ink-100/80 bg-slate-50/80 p-1">
                  {orderedTabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActive(t.id)}
                      className={cn(
                        'rounded-xl px-3 py-2 text-[11px] font-black transition',
                        active === t.id ?
                          'bg-white text-deepBlue shadow-sm ring-1 ring-ink-100'
                        : 'text-muted-600 hover:text-deepBlue',
                      )}
                    >
                      {t.labelAr}
                    </button>
                  ))}
                </div>
              : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div
                className={cn(
                  'flex-1 text-right rtl:text-right',
                  scrollBody ? 'overflow-y-auto px-5 py-5' : 'flex min-h-0 flex-col overflow-hidden px-5 py-3',
                )}
              >
                {activeContent}
              </div>
            </div>

            {footerSlot ?
              <div className="border-t border-ink-100 bg-slate-50/95 px-5 py-4 text-right shadow-[0_-8px_32px_rgba(15,23,42,0.06)] rtl:text-right">
                {footerSlot}
              </div>
            : null}
          </motion.aside>
        </>
      : null}
    </AnimatePresence>,
    document.body,
  )
}

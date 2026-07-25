import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { getSidebarByRole } from '@/layouts/dashboardSidebar'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useAuth } from '@/contexts/AuthContext'
import {
  filterDashboardSearchEntries,
  flattenSidebarForSearch,
  type DashboardSearchEntry,
} from '@/utils/dashboardRouteSearch'

function groupResults(entries: DashboardSearchEntry[]): Map<string, DashboardSearchEntry[]> {
  const map = new Map<string, DashboardSearchEntry[]>()
  for (const e of entries) {
    map.set(e.section, [...(map.get(e.section) ?? []), e])
  }
  return map
}

export default function DashboardRouteSearchModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLElement | null>(null)

  useFocusTrap(panelRef, { active: open, onEscape: onClose })

  // Clear the box when the modal closes (adjust state during render — react.dev's
  // "adjusting state when a prop changes"); the effect below keeps the DOM side effects.
  const [seenOpen, setSeenOpen] = useState(open)
  if (seenOpen !== open) {
    setSeenOpen(open)
    if (!open) setQuery('')
  }

  const allEntries = useMemo(
    () => flattenSidebarForSearch(getSidebarByRole(user?.role)),
    [user?.role],
  )

  const filtered = useMemo(
    () => filterDashboardSearchEntries(allEntries, query, 50),
    [allEntries, query],
  )

  const grouped = useMemo(() => groupResults(filtered), [filtered])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => {
      document.body.style.overflow = prev
      window.clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق البحث"
            className="fixed inset-0 z-modal-overlay bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div
            className="fixed inset-0 z-modal-content flex justify-center px-3 pt-[min(9vh,3.5rem)] sm:px-4 sm:pt-[9vh]"
            dir="rtl"
            role="presentation"
          >
            <motion.section
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="بحث لوحة التحكم"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="pointer-events-auto flex max-h-[min(82vh,720px)] w-full max-w-[min(840px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-deepBlue/[0.08] bg-white font-[Cairo,Tajawal,sans-serif] shadow-[0_28px_80px_-20px_rgba(15,42,67,0.35)] ring-1 ring-deepBlue/[0.04]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-3">
                <Search size={18} className="shrink-0 text-customBlue" aria-hidden />
                <input
                  ref={inputRef}
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-deepBlue outline-none placeholder:text-slate-400"
                  placeholder="ابحث عن صفحة أو قسم في لوحة التحكم..."
                  aria-label="بحث الصفحات"
                />
                {query ?
                  <button
                    type="button"
                    aria-label="مسح البحث"
                    onClick={() => setQuery('')}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue"
                  >
                    <X size={15} />
                  </button>
                : null}
                <button
                  type="button"
                  aria-label="إغلاق"
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                {filtered.length === 0 ?
                  <p className="py-10 text-center text-sm font-bold text-slate-400">لا توجد نتائج</p>
                : [...grouped.entries()].map(([section, items]) => (
                    <div key={section} className="mb-4 last:mb-0">
                      <h3 className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        {section}
                      </h3>
                      <ul className="space-y-1">
                        {items.map((item) => (
                          <li key={item.href}>
                            <Link
                              to={item.href}
                              onClick={onClose}
                              className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-customBlue/15 hover:bg-[#F6F8FB]"
                            >
                              <span className="min-w-0 flex-1 text-right">
                                <span className="block truncate text-sm font-black text-deepBlue">{item.label}</span>
                                <span className="block truncate text-[11px] font-semibold text-slate-400">{section}</span>
                              </span>
                              <ArrowLeft size={14} className="shrink-0 text-slate-300" aria-hidden />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                }
              </div>

              <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[10px] font-bold text-slate-400">
                <span>{filtered.length} نتيجة</span>
                <span className="font-latin">Esc للإغلاق</span>
              </div>
            </motion.section>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

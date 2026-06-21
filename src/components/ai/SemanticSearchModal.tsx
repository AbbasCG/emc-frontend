import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { semanticSearch } from '@/api/aiSearchApi'
import type { AiContextScope, AiSearchGroup } from '@/types/ai'
import { LoadingSkeleton } from './LoadingSkeleton'

const filters: { id: AiContextScope | 'all'; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'knowledge', label: 'المعرفة' },
  { id: 'meetings', label: 'الاجتماعات' },
  { id: 'reports', label: 'التقارير' },
  { id: 'tasks', label: 'المهام' },
  { id: 'lms', label: 'LMS' },
  { id: 'documents', label: 'المستندات' },
  { id: 'programs', label: 'البرامج' },
]

export default function SemanticSearchModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<AiSearchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<AiContextScope | 'all'>('all')
  const panelRef = useRef<HTMLElement | null>(null)

  useFocusTrap(panelRef, { active: open, onEscape: onClose })

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await semanticSearch(query || ' ')
      if (!cancelled) {
        setGroups(res.groups)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, query])

  const visibleGroups = useMemo(
    () => (filter === 'all' ? groups : groups.filter((g) => g.scope === filter)),
    [groups, filter],
  )

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق البحث"
            className="fixed inset-0 z-modal-overlay bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="بحث دلالي"
            dir="rtl"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className="fixed left-1/2 top-[9vh] z-modal-content w-[min(840px,calc(100%-20px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <Search size={18} className="text-customBlue" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-deepBlue outline-none placeholder:text-slate-400"
                placeholder="بحث دلالي: المعرفة، الاجتماعات، التقارير..."
              />
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="border-b border-slate-100 px-4 py-2">
              <div className="flex flex-wrap gap-1.5">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={[
                      'rounded-full px-2.5 py-1 text-[11px] font-black transition',
                      filter === f.id ? 'bg-deepBlue text-white' : 'bg-slate-100 text-slate-600',
                    ].join(' ')}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[62vh] overflow-y-auto p-4">
              {loading && (
                <div className="space-y-3">
                  <LoadingSkeleton />
                  <LoadingSkeleton />
                  <LoadingSkeleton />
                </div>
              )}
              {!loading &&
                visibleGroups.map((group) => (
                  <div key={group.scope} className="mb-4">
                    <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">{group.label}</h3>
                    <div className="space-y-1.5">
                      {group.items.map((item) => (
                        <Link
                          key={`${group.scope}-${item.id}`}
                          to={item.href}
                          onClick={onClose}
                          className="flex items-center gap-3 rounded-xl bg-[#F6F8FB] px-3 py-2.5 transition hover:bg-slate-100"
                        >
                          <span className="text-[10px] font-black text-customOrange">
                            {(item.relevance * 100).toFixed(0)}%
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-deepBlue">{item.title}</span>
                            <span className="block truncate text-xs font-bold text-slate-400">{item.subtitle}</span>
                          </span>
                          <ArrowLeft size={14} className="text-slate-300" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

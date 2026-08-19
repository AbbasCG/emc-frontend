import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Loader2, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { globalSearch } from '@/api/searchApi'

type Props = {
  open: boolean
  onClose: () => void
}

export default function GlobalSearchCommand({ open, onClose }: Props) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof globalSearch>>['groups']>([])
  const panelRef = useRef<HTMLDivElement | null>(null)

  useFocusTrap(panelRef, { active: open, onEscape: onClose })

  // Adjust state during render when the panel opens/closes or the query changes:
  // clear the box on close, and arm the loading state before the effect below runs, so
  // the fetch never has to set it synchronously. `null` seed keeps the first pass live,
  // matching the mount run of the effects this replaces.
  const [seenSearch, setSeenSearch] = useState<{ open: boolean; q: string } | null>(null)
  if (!seenSearch || seenSearch.open !== open || seenSearch.q !== q) {
    setSeenSearch({ open, q })
    if (open) {
      setLoading(true)
      setError(null)
    } else {
      setQ('')
    }
  }

  useEffect(() => {
    if (!open) return
    const query = q || ' '
    let alive = true
    void (async () => {
      try {
        const res = await globalSearch(query)
        if (!alive) return
        setGroups(res.groups)
      } catch {
        if (!alive) return
        setError('تعذر تحميل النتائج')
        setGroups([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [open, q])

  const hint = useMemo(
    () =>
      typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
        ? '⌘ K'
        : 'Ctrl K',
    [],
  )

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-modal-overlay bg-black/50 backdrop-blur-sm"
            aria-label="إغلاق البحث"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="بحث عام"
            dir="rtl"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="fixed left-1/2 top-[12vh] z-modal-content w-[min(720px,calc(100%-24px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-300/40"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <Search size={18} className="shrink-0 text-customBlue" />
              <input
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm font-black text-deepBlue outline-none placeholder:text-slate-400"
                placeholder="ابحث في الدورات، المعرفة، المهام، الشركاء..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <span className="hidden shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 sm:inline">
                {hint}
              </span>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-gradient-to-l from-customBlue/10 to-transparent px-3 py-2 text-[11px] font-black text-deepBlue ring-1 ring-slate-100">
                <Sparkles size={14} className="text-customOrange" />
                بحث موحّد عبر المنظومة النتائج مجمّعة حسب النوع
              </div>
              {loading && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm font-bold text-slate-400">
                  <Loader2 className="animate-spin" size={18} />
                  جارٍ البحث...
                </div>
              )}
              {!loading && error && (
                <p className="py-10 text-center text-sm font-bold text-red-600">{error}</p>
              )}
              {!loading &&
                !error &&
                groups.map((g) => (
                  <div key={g.type} className="mb-4">
                    <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                      {g.label}
                    </p>
                    <ul className="space-y-1">
                      {g.items.map((item) => (
                        <li key={`${g.type}-${item.id}`}>
                          <Link
                            to={item.href}
                            onClick={onClose}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#F6F8FB]"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-deepBlue text-[11px] font-black text-white">
                              {g.label.slice(0, 2)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black text-deepBlue">{item.title}</span>
                              {item.subtitle && (
                                <span className="block truncate text-xs font-bold text-slate-400">{item.subtitle}</span>
                              )}
                            </span>
                            <ArrowLeft size={16} className="shrink-0 text-slate-300" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

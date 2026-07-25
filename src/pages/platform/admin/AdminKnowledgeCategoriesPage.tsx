import { motion } from 'framer-motion'
import { BookOpen, FolderOpen } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { fetchAdminKnowledgeCategories } from '@/api/knowledgeApi'
import type { AdminKnowledgeCategory } from '@/types/platform'

const STATUS_MAP: Record<string, { ar: string; cls: string }> = {
  active:   { ar: 'نشطة',   cls: 'bg-emerald-50 text-emerald-800 ring-emerald-100' },
  inactive: { ar: 'معطّلة', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
}
const DEFAULT_STATUS = { ar: 'غير محدد', cls: 'bg-slate-50 text-slate-500 ring-slate-200' }

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ? STATUS_MAP[status] : null) ?? DEFAULT_STATUS
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${s.cls}`}>{s.ar}</span>
  )
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function CategoryCard({ cat, index }: { cat: AdminKnowledgeCategory; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-customBlue to-deepBlue text-white shadow-sm">
          <FolderOpen size={18} />
        </div>
        <StatusBadge status={cat.status} />
      </div>

      <div>
        <h2 className="text-base font-black text-deepBlue">{cat.name}</h2>
        <p className="mt-0.5 font-mono text-[10px] font-bold text-slate-400" dir="ltr">{cat.slug}</p>
      </div>

      {cat.description && (
        <p className="text-xs font-medium leading-relaxed text-slate-500">{cat.description}</p>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <BookOpen size={13} className="text-customBlue" />
          <span>{cat.articles_count} مقالة</span>
        </div>
        {(cat.children?.length ?? 0) > 0 && (
          <span className="text-xs font-bold text-slate-400">{cat.children!.length} فئة فرعية</span>
        )}
        <span className="text-[10px] font-bold text-slate-400">{formatDate(cat.created_at)}</span>
      </div>

      {cat.department && (
        <div className="rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 ring-1 ring-sky-100">
          قسم: {cat.department.name}
        </div>
      )}
    </motion.div>
  )
}

const LOAD_ERROR = 'تعذّر تحميل فئات المعرفة. تحقق من الاتصال وأعد المحاولة.'

export default function AdminKnowledgeCategoriesPage() {
  const [cats, setCats] = useState<AdminKnowledgeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  /** Imperative retry from the button — outside the effect, so the synchronous flip to
   *  the loading state is allowed and wanted. */
  const load = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      setCats(await fetchAdminKnowledgeCategories())
    } catch {
      setLoadError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const rows = await fetchAdminKnowledgeCategories()
        if (alive) setCats(rows)
      } catch {
        if (alive) setLoadError(LOAD_ERROR)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
        <p className="font-black text-rose-800">{loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Taxonomy</p>
        <h1 className="mt-1 text-2xl font-black text-deepBlue">فئات المعرفة</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          إجمالي {cats.length} فئة — {cats.reduce((s, c) => s + c.articles_count, 0)} مقالة
        </p>
      </motion.div>

      {cats.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-14 text-center">
          <FolderOpen size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-black text-slate-500">لا توجد فئات مسجّلة بعد</p>
          <p className="mt-2 text-sm font-medium text-slate-400">أنشئ أول فئة لتنظيم قاعدة المعرفة</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c, i) => (
            <CategoryCard key={c.id} cat={c} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, Loader2, Search } from 'lucide-react'
import { fetchAdminCoursesStrict } from '@/api/superAdminCatalogApi'
import { formatEuroInteger } from '@/utils/currency'
import type { Course } from '@/types'

function statusBadge(s?: string | null) {
  if (s === 'published') return { label: 'منشور', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (s === 'draft') return { label: 'مسودة', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  if (s === 'archived') return { label: 'مؤرشف', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: s ?? '—', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
}

function courseThumb(c: Course) {
  const src = c.course_image ?? c.image_url ?? (c as { thumbnail?: string }).thumbnail ?? c.image ?? null
  if (src) return <img src={src} alt={c.title} className="h-10 w-14 shrink-0 rounded-lg object-cover" />
  return (
    <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100">
      <BookOpen className="h-4 w-4 text-slate-300" />
    </div>
  )
}

/**
 * Purpose-built for coupon course assignment — reuses the same catalog API
 * and visual language as the learning-path CourseSelector, but simpler
 * (checkbox multi-select, no reordering/inline-editing, which don't apply
 * to "which courses can this coupon be used on").
 */
export default function CouponCourseSelector({
  value,
  onChange,
  error,
}: {
  value: number[]
  onChange: (ids: number[]) => void
  error?: string
}) {
  const [catalog, setCatalog] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchAdminCoursesStrict().then((res) => {
      if (cancelled) return
      if (res.ok) setCatalog(res.rows.filter((c) => (c as { type?: string }).type === 'paid' || (c as { is_paid?: boolean }).is_paid))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const selectedSet = useMemo(() => new Set(value), [value])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((c) => c.title.toLowerCase().includes(q))
  }, [catalog, search])

  function toggle(id: number) {
    if (selectedSet.has(id)) onChange(value.filter((v) => v !== id))
    else onChange([...value, id])
  }

  return (
    <div dir="rtl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-black text-deepBlue">الدورات المشمولة</span>
        <span className="rounded-full bg-customBlue px-2 py-0.5 text-[10px] font-black text-white">{value.length}</span>
      </div>

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن دورة بالعنوان..."
          className="w-full rounded-xl border border-slate-200 py-2 pr-9 pl-3 text-xs font-semibold text-right outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/15"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-customBlue" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs font-semibold text-slate-400">
          لا توجد دورات مدفوعة تطابق البحث
        </p>
      ) : (
        <div className={`max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border ${error ? 'border-red-300' : 'border-slate-200'}`}>
          {filtered.map((course) => {
            const checked = selectedSet.has(course.id)
            const { label, cls } = statusBadge(course.status)
            return (
              <label
                key={course.id}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${checked ? 'bg-customBlue/[0.06]' : 'hover:bg-slate-50'}`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(course.id)} className="sr-only" />
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${checked ? 'border-customBlue bg-customBlue' : 'border-slate-300 bg-white'}`}>
                  {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </span>
                {courseThumb(course)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-deepBlue">{course.title}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-customOrange">
                      {course.price != null ? formatEuroInteger(Number(course.price), 'ar') : '—'}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${cls}`}>{label}</span>
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      )}
      {error && <p className="mt-1.5 text-[11px] font-bold text-red-600">{error}</p>}
    </div>
  )
}

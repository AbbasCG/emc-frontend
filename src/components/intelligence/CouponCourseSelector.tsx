import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, Loader2, Search } from 'lucide-react'
import { searchCouponCourses } from '@/api/couponsApi'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatEuroInteger } from '@/utils/currency'
import type { CouponCourseRef } from '@/types/intelligence'

function statusBadge(s?: string | null) {
  if (s === 'published') return { label: 'منشور', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (s === 'draft') return { label: 'مسودة', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  if (s === 'archived') return { label: 'مؤرشف', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: s ?? '—', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
}

function CourseThumb() {
  return (
    <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100">
      <BookOpen className="h-4 w-4 text-slate-300" />
    </div>
  )
}

type SearchState = { status: 'loading' } | { status: 'error' } | { status: 'ok'; rows: CouponCourseRef[] }

/**
 * Coupon course assignment with SERVER-SIDE search over paid courses of every status.
 * Courses already linked to the coupon (`initialCourses`) and anything the user ticks live in a local
 * map, so they stay visible and removable whatever the current search returns.
 */
export default function CouponCourseSelector({
  value,
  onChange,
  error,
  initialCourses,
}: {
  value: number[]
  onChange: (ids: number[]) => void
  error?: string
  initialCourses?: CouponCourseRef[]
}) {
  const [search, setSearch] = useState('')
  const term = useDebouncedValue(search.trim(), 300)
  const [state, setState] = useState<SearchState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [known, setKnown] = useState<Map<number, CouponCourseRef>>(
    () => new Map((initialCourses ?? []).map((c) => [c.id, c])),
  )

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before each request starts
    setState({ status: 'loading' })
    searchCouponCourses(term, ctrl.signal)
      .then((rows) => { if (!ctrl.signal.aborted) setState({ status: 'ok', rows }) })
      .catch(() => { if (!ctrl.signal.aborted) setState({ status: 'error' }) })
    return () => ctrl.abort()
  }, [term, attempt])

  const selectedSet = useMemo(() => new Set(value), [value])

  const selectedRows = useMemo(
    () => value.map((id) => known.get(id) ?? { id, title: `دورة #${id}` }),
    [value, known],
  )

  const resultRows = useMemo(
    () => (state.status === 'ok' ? state.rows.filter((c) => !selectedSet.has(c.id)) : []),
    [state, selectedSet],
  )

  const toggle = useCallback((course: CouponCourseRef) => {
    if (selectedSet.has(course.id)) {
      onChange(value.filter((v) => v !== course.id))
      return
    }
    setKnown((m) => new Map(m).set(course.id, course))
    onChange([...value, course.id])
  }, [selectedSet, value, onChange])

  function renderRow(course: CouponCourseRef) {
    const checked = selectedSet.has(course.id)
    const { label, cls } = statusBadge(course.status)
    return (
      <label
        key={course.id}
        className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${checked ? 'bg-customBlue/[0.06]' : 'hover:bg-slate-50'}`}
      >
        <input type="checkbox" checked={checked} onChange={() => toggle(course)} className="sr-only" aria-label={course.title} />
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${checked ? 'border-customBlue bg-customBlue' : 'border-slate-300 bg-white'}`}>
          {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </span>
        <CourseThumb />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-deepBlue">{course.title}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[11px] font-black text-customOrange">
              {course.price != null ? formatEuroInteger(Number(course.price), 'ar') : '—'}
            </span>
            {course.status !== undefined && (
              <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${cls}`}>{label}</span>
            )}
          </div>
        </div>
      </label>
    )
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
          aria-label="ابحث عن دورة"
          className="w-full rounded-xl border border-slate-200 py-2 pr-9 pl-3 text-xs font-semibold text-right outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/15"
        />
      </div>

      <div className={`max-h-64 overflow-y-auto rounded-xl border ${error ? 'border-red-300' : 'border-slate-200'}`}>
        {selectedRows.length > 0 && (
          <div data-testid="coupon-selected-courses">
            <p className="bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-500">المحددة ({selectedRows.length})</p>
            <div className="divide-y divide-slate-100">{selectedRows.map(renderRow)}</div>
          </div>
        )}

        {state.status === 'loading' && (
          <div className="flex items-center justify-center py-6" role="status" aria-label="جارٍ البحث">
            <Loader2 className="h-5 w-5 animate-spin text-customBlue" />
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" className="px-3 py-5 text-center">
            <p className="text-xs font-bold text-red-600">تعذّر تحميل الدورات. تحقق من الاتصال أو الصلاحيات وأعد المحاولة.</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-2 rounded-xl bg-deepBlue px-4 py-1.5 text-[11px] font-black text-white"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {state.status === 'ok' && state.rows.length === 0 && (
          <p className="py-6 text-center text-xs font-semibold text-slate-400">لا توجد نتائج</p>
        )}
        {state.status === 'ok' && resultRows.length > 0 && (
          <div className="divide-y divide-slate-100">{resultRows.map(renderRow)}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-[11px] font-bold text-red-600">{error}</p>}
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { Search, X, ChevronUp, ChevronDown, Loader2, BookOpen } from 'lucide-react'
import { fetchAdminCoursesStrict } from '@/api/superAdminCatalogApi'
import type { Course } from '@/types'

interface Props {
  value: number[]
  onChange: (ids: number[]) => void
}

function statusBadge(s?: string | null) {
  if (s === 'published') return { label: 'منشور',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (s === 'draft')     return { label: 'مسودة',  cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  if (s === 'archived')  return { label: 'مؤرشف', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: s ?? '—', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
}

function courseThumb(c: Course) {
  const src = c.course_image ?? c.image_url ?? c.thumbnail ?? c.cover_image ?? c.image ?? null
  if (src) return <img src={src} alt={c.title} className="h-10 w-14 shrink-0 rounded-xl object-cover" />
  return (
    <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
      <BookOpen className="h-4 w-4 text-slate-300" />
    </div>
  )
}

export default function CourseSelector({ value, onChange }: Props) {
  const [catalog, setCatalog]   = useState<Course[]>([])
  const [fetching, setFetching] = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    fetchAdminCoursesStrict().then((res) => {
      if (res.ok) setCatalog(res.rows)
      setFetching(false)
    })
  }, [])

  const selectedSet = useMemo(() => new Set(value), [value])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((c) => {
      const instr = c.instructor?.name ?? c.instructor_name ?? ''
      return c.title.toLowerCase().includes(q) || instr.toLowerCase().includes(q)
    })
  }, [catalog, search])

  // Map selected IDs → Course objects; preserve order; show placeholder for unknown IDs
  const selectedCourses = useMemo(
    () => value.map((id) => ({ id, course: catalog.find((c) => c.id === id) ?? null })),
    [value, catalog],
  )

  const add = (id: number) => {
    if (!selectedSet.has(id)) onChange([...value, id])
  }

  const remove = (id: number) => onChange(value.filter((v) => v !== id))

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...value]
    ;[arr[i], arr[i + dir]] = [arr[i + dir], arr[i]]
    onChange(arr)
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Selected list ───────────────────────────────────────────── */}
      {selectedCourses.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            الدورات المختارة ({selectedCourses.length})
          </p>
          <div className="space-y-2">
            {selectedCourses.map(({ id, course }, i) => {
              const { label, cls } = statusBadge(course?.status)
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-2xl border border-[#0077B6]/20 bg-[#0077B6]/5 p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#0077B6] text-xs font-black text-white">
                    {i + 1}
                  </span>
                  {course ? courseThumb(course) : (
                    <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-[10px] font-bold text-slate-400">
                      #{id}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#0C2A4B]">
                      {course?.title ?? `دورة #${id}`}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {course?.instructor?.name ?? course?.instructor_name ?? '—'}
                      {course?.duration ? ` · ${course.duration}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>
                    {label}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-25"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i >= value.length - 1}
                      className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-25"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center">
          <BookOpen className="mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">لم تُضَف دورات بعد — ابحث أدناه لإضافتها</p>
        </div>
      )}

      {/* ── Catalog search ──────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          إضافة دورات من الكتالوج
        </p>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالعنوان أو اسم المدرب..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-4 pr-9 text-sm text-right focus:border-[#0077B6] focus:outline-none focus:ring-2 focus:ring-[#0077B6]/20"
          />
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#0077B6]" />
          </div>
        ) : catalog.length === 0 ? (
          <p className="rounded-xl border border-slate-200 py-6 text-center text-sm text-slate-400">
            لا دورات متاحة في الكتالوج
          </p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-slate-200 py-6 text-center text-sm text-slate-400">
            لا نتائج تطابق "{search}"
          </p>
        ) : (
          <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200">
            {filtered.map((course) => {
              const already = selectedSet.has(course.id)
              const { label, cls } = statusBadge(course.status)
              return (
                <div
                  key={course.id}
                  className={`flex items-center gap-3 px-4 py-3 transition ${already ? 'opacity-40' : 'hover:bg-slate-50'}`}
                >
                  {courseThumb(course)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#0C2A4B]">{course.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {course.instructor?.name ?? course.instructor_name ?? '—'}
                      {course.duration ? ` · ${course.duration}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => add(course.id)}
                    disabled={already}
                    className="shrink-0 rounded-xl bg-[#0077B6] px-3 py-1.5 text-xs font-black text-white transition hover:bg-[#1d7aab] disabled:invisible"
                  >
                    إضافة
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

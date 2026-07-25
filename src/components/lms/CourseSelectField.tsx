import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Loader2, Search, X } from 'lucide-react'
import { fetchActiveCourses, type ActiveCourseOption } from '@/api/adminCoursesApi'

type Props = {
  value: number | null
  onChange: (id: number | null) => void
  error?: string
  label?: string
  required?: boolean
  placeholder?: string
}

export function CourseSelectField({
  value,
  onChange,
  error,
  label = 'الدورة',
  required,
  placeholder = 'اختر دورة…',
}: Props) {
  const [courses, setCourses] = useState<ActiveCourseOption[]>([])
  // Starts in the loading state — the fetch below is fired on mount unconditionally.
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('loading')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const list = await fetchActiveCourses()
        if (!alive) return
        setCourses(list)
        setLoadState('idle')
      } catch {
        if (alive) setLoadState('error')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const selected = courses.find((c) => c.id === value) ?? null

  const filtered = useMemo(() => {
    if (!query.trim()) return courses
    const q = query.toLowerCase()
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.instructor_name ?? '').toLowerCase().includes(q),
    )
  }, [courses, query])

  const inputCls =
    'w-full rounded-xl border border-[#0C2A4B]/10 bg-[#0C2A4B]/[0.02] px-3 py-2.5 text-sm font-semibold text-[#0C2A4B] outline-none focus:border-[#0077B6]/40 focus:ring-2 focus:ring-[#0077B6]/10'
  const hasError = !!error

  return (
    <div ref={containerRef} className="relative" dir="rtl">
      {label && (
        <label className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/60">
          {label}{required && <span className="text-rose-500"> *</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          inputCls,
          'flex items-center justify-between gap-2 text-right',
          hasError ? 'border-rose-300 ring-1 ring-rose-200' : '',
          open ? 'border-[#0077B6]/40 ring-2 ring-[#0077B6]/10' : '',
        ].join(' ')}
      >
        {loadState === 'loading' ? (
          <span className="flex items-center gap-2 text-[#0C2A4B]/40">
            <Loader2 size={13} className="animate-spin" />
            جاري التحميل…
          </span>
        ) : selected ? (
          <span className="min-w-0 flex-1 truncate text-right">
            <span className="font-black text-[#0C2A4B]">{selected.title}</span>
            {selected.instructor_name && (
              <span className="mr-1.5 text-[#0C2A4B]/40 text-[11px]">· {selected.instructor_name}</span>
            )}
          </span>
        ) : (
          <span className="text-[#0C2A4B]/35">{placeholder}</span>
        )}
        <span className="flex shrink-0 items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(null) } }}
              className="rounded p-0.5 hover:bg-slate-200"
            >
              <X size={11} className="text-[#0C2A4B]/40" />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-[#0C2A4B]/40 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {hasError && <p className="mt-1 text-[11px] font-bold text-rose-600">{error}</p>}

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-[200] mt-1.5 w-full rounded-2xl border border-[#0C2A4B]/10 bg-white py-2 shadow-xl">
          {/* Search */}
          <div className="relative mx-2 mb-2">
            <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0C2A4B]/30" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالعنوان أو المدرب…"
              className="w-full rounded-xl border border-[#0C2A4B]/10 bg-slate-50 py-2 pr-8 pl-3 text-[12px] outline-none focus:border-[#0077B6]/40"
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            {loadState === 'error' ? (
              <p className="px-4 py-3 text-[12px] text-rose-500">تعذّر تحميل الدورات</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-3 text-[12px] text-[#0C2A4B]/35">لا توجد دورات تطابق البحث</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setOpen(false); setQuery('') }}
                  className={[
                    'flex w-full flex-col items-start px-4 py-2.5 text-right transition hover:bg-[#0077B6]/5',
                    c.id === value ? 'bg-[#0077B6]/[0.07]' : '',
                  ].join(' ')}
                >
                  <span className={`text-[13px] font-black ${c.id === value ? 'text-[#0077B6]' : 'text-[#0C2A4B]'}`}>
                    {c.title}
                  </span>
                  {c.instructor_name && (
                    <span className="text-[11px] font-medium text-[#0C2A4B]/40">{c.instructor_name}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

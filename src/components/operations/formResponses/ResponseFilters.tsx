import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { activeFilterCount, EMPTY_FILTERS, RESPONSE_STATUSES } from '@/api/formsResponsesApi'
import type { ResponseFilters as Filters, ResponseOptions, ResponseStatus } from '@/api/formsResponsesApi'
import { STATUS_AR, STATUS_TONE } from './responsesUi'

const FIELD = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue outline-none focus:border-customBlue'

/**
 * The filters of the response table. Everything but the search box applies at once; the search waits for a pause in typing. The
 * server does the filtering: this only says what to ask for.
 */
export default function ResponseFilters({
  filters,
  options,
  counts,
  onChange,
}: {
  filters: Filters
  options: ResponseOptions | null
  counts: Record<ResponseStatus, number>
  onChange: (next: Filters) => void
}) {
  const [search, setSearch] = useState(filters.search)
  const latest = useRef(filters)
  useEffect(() => { latest.current = filters }, [filters])

  useEffect(() => {
    if (search === latest.current.search) return
    const timer = setTimeout(() => onChange({ ...latest.current, search }), 350)
    return () => clearTimeout(timer)
  }, [search, onChange])

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const toggleStatus = (status: ResponseStatus) =>
    set({ status: filters.status.includes(status) ? filters.status.filter((s) => s !== status) : [...filters.status, status] })
  const active = activeFilterCount(filters)

  return (
    <section aria-label="تصفية الإرسالات" className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-deepBlue/[0.06]" data-testid="response-filters">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">بحث في الإرسالات</span>
          <Search size={14} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في الإجابات أو اسم المُرسِل أو رقم الرد"
            className={`${FIELD} ps-9`}
          />
        </label>
        {active > 0 && (
          <button
            type="button"
            onClick={() => { setSearch(''); onChange(EMPTY_FILTERS) }}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-deepBlue ring-1 ring-deepBlue/10 hover:bg-slate-50"
          >
            <X size={13} aria-hidden />
            مسح التصفية ({active})
          </button>
        )}
      </div>

      <div role="group" aria-label="حالة الرد" className="flex flex-wrap gap-2">
        {RESPONSE_STATUSES.map((status) => {
          const on = filters.status.includes(status)
          return (
            <button
              key={status}
              type="button"
              aria-pressed={on}
              onClick={() => toggleStatus(status)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ring-1 transition ${on ? `${STATUS_TONE[status]} ring-2` : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}
            >
              {STATUS_AR[status]}
              <span className="rounded-full bg-black/5 px-1.5 text-[10px]" aria-label={`${counts[status]} رد`}>{counts[status]}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-1">
          <span className="text-[11px] font-black text-slate-500">المُسنَد إليه</span>
          <select value={filters.assignee} onChange={(e) => set({ assignee: e.target.value })} className={FIELD}>
            <option value="">الجميع</option>
            <option value="me">المُسنَدة إليّ</option>
            <option value="none">غير مُسنَدة</option>
            {(options?.assignees ?? []).map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-black text-slate-500">إصدار النموذج</span>
          <select value={filters.version} onChange={(e) => set({ version: e.target.value })} className={FIELD}>
            <option value="">كل الإصدارات</option>
            {(options?.versions ?? []).map((v) => <option key={v.id} value={String(v.id)}>الإصدار {v.number} ({v.responses})</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-black text-slate-500">مصدر الإرسال</span>
          <select value={filters.source} onChange={(e) => set({ source: e.target.value })} className={FIELD}>
            <option value="">أي مصدر</option>
            <option value="public">الرابط العام</option>
            <option value="link">أي رابط مشاركة</option>
            {(options?.links ?? []).map((l) => <option key={l.id} value={String(l.id)}>رابط: {l.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-black text-slate-500">من تاريخ</span>
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} className={FIELD} />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-black text-slate-500">إلى تاريخ</span>
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} className={FIELD} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-xs font-black text-deepBlue">
        <input type="checkbox" checked={filters.corrected} onChange={(e) => set({ corrected: e.target.checked })} className="accent-customBlue" />
        الردود التي صُحِّحت إجاباتها فقط
      </label>
    </section>
  )
}

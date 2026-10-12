import { useState } from 'react'
import { ListFilter, Search, X } from 'lucide-react'
import type { DepartmentOption } from '@/api/operationsReportsApi'
import { EMPTY_FILTERS, activeFilterCount, type MeetingReportFilters } from './meetingReportsUi'

const field =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-semibold text-navy outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15'

interface Props {
  value: MeetingReportFilters
  onChange: (next: MeetingReportFilters) => void
  /** Departments the viewer may browse. Empty / one entry hides the department filter. */
  departments: DepartmentOption[]
  showDepartment: boolean
}

/**
 * Search is always visible; the rest collapse behind a "تصفية" toggle on small
 * screens so the list stays within the first viewport on a phone, and are
 * always open from the `sm` breakpoint up.
 */
export function MeetingReportsFilters({ value, onChange, departments, showDepartment }: Props) {
  const [open, setOpen] = useState(false)
  const active = activeFilterCount(value)
  const set = <K extends keyof MeetingReportFilters>(key: K, v: MeetingReportFilters[K]) => onChange({ ...value, [key]: v })

  return (
    <section aria-label="البحث والتصفية" className="space-y-3 rounded-3xl border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">ابحث بعنوان الاجتماع</span>
          <Search size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-400" aria-hidden="true" />
          <input
            type="search"
            value={value.q}
            onChange={(e) => set('q', e.target.value)}
            placeholder="ابحث بعنوان الاجتماع…"
            maxLength={100}
            className={`${field} ps-10`}
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="meeting-report-filter-panel"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm font-bold text-navy transition hover:bg-slate-50 sm:hidden"
        >
          <ListFilter size={16} aria-hidden="true" />
          تصفية
          {active > 0 && (
            <span className="rounded-full bg-brand-500 px-1.5 text-[10px] font-black text-white">{active}</span>
          )}
        </button>
      </div>

      <div
        id="meeting-report-filter-panel"
        className={`${open ? 'grid' : 'hidden'} grid-cols-1 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4`}
      >
        {showDepartment && (
          <label className="grid gap-1.5 text-[11px] font-black text-muted-500">
            الإدارة
            <select
              value={value.department_id}
              onChange={(e) => set('department_id', e.target.value ? Number(e.target.value) : '')}
              className={field}
            >
              <option value="">كل الإدارات</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="grid gap-1.5 text-[11px] font-black text-muted-500">
          من تاريخ
          <input type="date" dir="ltr" value={value.date_from} max={value.date_to || undefined} onChange={(e) => set('date_from', e.target.value)} className={field} />
        </label>
        <label className="grid gap-1.5 text-[11px] font-black text-muted-500">
          إلى تاريخ
          <input type="date" dir="ltr" value={value.date_to} min={value.date_from || undefined} onChange={(e) => set('date_to', e.target.value)} className={field} />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            disabled={active === 0}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-muted-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <X size={14} aria-hidden="true" />
            مسح التصفية
          </button>
        </div>
      </div>
    </section>
  )
}

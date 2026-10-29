import { useState } from 'react'
import { ListFilter, Search, X } from 'lucide-react'
import type { MeetingRef, MeetingType } from '@/types/operations'
import { MEETING_TYPE_AR } from '@/data/operationsLabels'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import { EMPTY_MEETING_FILTERS, activeMeetingFilterCount, type MeetingFilters } from './meetingsUi'

const field =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-semibold text-navy outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15'

type Props = {
  value: MeetingFilters
  onChange: (next: MeetingFilters) => void
  /** Departments the viewer can filter by. Fewer than two hides the control. */
  departments: MeetingRef[]
}

/** Search is always visible; the rest collapse behind a toggle on phones. */
export function MeetingsFilters({ value, onChange, departments }: Props) {
  const [open, setOpen] = useState(false)
  const active = activeMeetingFilterCount(value)
  const set = <K extends keyof MeetingFilters>(key: K, v: MeetingFilters[K]) => onChange({ ...value, [key]: v })

  return (
    <section aria-label="البحث والتصفية" className="space-y-3 rounded-3xl border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">ابحث بعنوان الاجتماع</span>
          <Search size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-400" aria-hidden="true" />
          <input
            type="search"
            value={value.q}
            maxLength={100}
            onChange={(e) => set('q', e.target.value)}
            placeholder="ابحث بعنوان الاجتماع…"
            className={`${field} ps-10`}
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="meeting-filter-panel"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm font-bold text-navy transition hover:bg-slate-50 sm:hidden"
        >
          <ListFilter size={16} aria-hidden="true" />
          تصفية
          {active > 0 && <span className="rounded-full bg-brand-500 px-1.5 text-[10px] font-black text-white">{active}</span>}
        </button>
      </div>

      <div id="meeting-filter-panel" className={`${open ? 'grid' : 'hidden'} grid-cols-1 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3`}>
        <label className="grid gap-1.5 text-[11px] font-black text-muted-500">
          نوع الاجتماع
          <select value={value.type} onChange={(e) => set('type', e.target.value as MeetingType | '')} className={field}>
            <option value="">كل الأنواع</option>
            {(Object.keys(MEETING_TYPE_AR) as MeetingType[]).map((t) => (
              <option key={t} value={t}>{MEETING_TYPE_AR[t]}</option>
            ))}
          </select>
        </label>
        {departments.length > 1 && (
          <label className="grid gap-1.5 text-[11px] font-black text-muted-500">
            الإدارة
            <select value={value.department_id} onChange={(e) => set('department_id', e.target.value ? Number(e.target.value) : '')} className={field}>
              <option value="">كل الإدارات</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="grid gap-1.5 text-[11px] font-black text-muted-500">
          حالة التقرير
          <select value={value.report_status} onChange={(e) => set('report_status', e.target.value as MeetingFilters['report_status'])} className={field}>
            <option value="">الكل</option>
            <option value="pending">بانتظار رفع التقرير</option>
            <option value="submitted">تم رفع التقرير</option>
          </select>
        </label>
        <EmcDatePicker label="من تاريخ" layout="stacked" showPresets={false} value={value.date_from} maxDate={value.date_to || undefined} onChange={(v) => set('date_from', v)} />
        <EmcDatePicker label="إلى تاريخ" layout="stacked" showPresets={false} value={value.date_to} minDate={value.date_from || undefined} onChange={(v) => set('date_to', v)} />
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onChange(EMPTY_MEETING_FILTERS)}
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

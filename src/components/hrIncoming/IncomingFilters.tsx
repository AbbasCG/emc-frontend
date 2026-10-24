import { Search, X } from 'lucide-react'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import { EMPTY_FILTERS, STATUS_FILTERS, type IncomingFilterState } from './hrIncomingUi'

const FIELD = 'w-full rounded-xl border border-deepBlue/10 bg-white px-3 py-2.5 text-sm font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'

export function IncomingFilters({
  value,
  onChange,
  departments,
}: {
  value: IncomingFilterState
  onChange: (next: IncomingFilterState) => void
  departments: { id: number; name: string }[]
}) {
  const set = <K extends keyof IncomingFilterState>(k: K, v: IncomingFilterState[K]) => onChange({ ...value, [k]: v })
  const dirty = JSON.stringify(value) !== JSON.stringify(EMPTY_FILTERS)

  return (
    <section aria-label="التصفية" className="rounded-3xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm">
      <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="relative block sm:col-span-2">
          <span className="sr-only">بحث</span>
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-deepBlue/40" aria-hidden="true" />
          <input type="search" value={value.q} onChange={(e) => set('q', e.target.value)} placeholder="ابحث بالمسمى أو القسم أو الطالب أو المهارات…" className={`${FIELD} ps-9`} />
        </label>

        <label className="block">
          <span className="sr-only">الحالة</span>
          <select aria-label="الحالة" value={value.status} onChange={(e) => set('status', e.target.value as IncomingFilterState['status'])} className={FIELD}>
            {STATUS_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">القسم</span>
          <select aria-label="القسم" value={String(value.departmentId)} onChange={(e) => set('departmentId', e.target.value ? Number(e.target.value) : '')} className={FIELD}>
            <option value="">كل الأقسام</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">المسودة</span>
          <select aria-label="المسودة" value={value.hasDraft} onChange={(e) => set('hasDraft', e.target.value as IncomingFilterState['hasDraft'])} className={FIELD}>
            <option value="">كل الطلبات</option>
            <option value="yes">لها مسودة فرصة</option>
            <option value="no">بلا مسودة فرصة</option>
          </select>
        </label>

        <div className="min-w-0" data-testid="date-from">
          <EmcDatePicker layout="stacked" label="من تاريخ" value={value.dateFrom} onChange={(v) => set('dateFrom', v)} maxDate={value.dateTo || undefined} />
          {value.dateFrom ? <button type="button" onClick={() => set('dateFrom', '')} className="mt-1 text-[11px] font-black text-customBlue hover:underline" aria-label="مسح تاريخ البداية">مسح</button> : null}
        </div>
        <div className="min-w-0" data-testid="date-to">
          <EmcDatePicker layout="stacked" label="إلى تاريخ" value={value.dateTo} onChange={(v) => set('dateTo', v)} minDate={value.dateFrom || undefined} />
          {value.dateTo ? <button type="button" onClick={() => set('dateTo', '')} className="mt-1 text-[11px] font-black text-customBlue hover:underline" aria-label="مسح تاريخ النهاية">مسح</button> : null}
        </div>
      </div>

      {dirty ?
        <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-customBlue hover:underline">
          <X size={13} aria-hidden="true" /> مسح التصفية
        </button>
      : null}
    </section>
  )
}

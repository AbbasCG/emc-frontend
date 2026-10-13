import { Search, X } from 'lucide-react'
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="relative block md:col-span-2">
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

        <div className="flex gap-2">
          <label className="block flex-1">
            <span className="sr-only">من تاريخ</span>
            <input type="date" aria-label="من تاريخ" value={value.dateFrom} onChange={(e) => set('dateFrom', e.target.value)} className={FIELD} />
          </label>
          <label className="block flex-1">
            <span className="sr-only">إلى تاريخ</span>
            <input type="date" aria-label="إلى تاريخ" value={value.dateTo} onChange={(e) => set('dateTo', e.target.value)} className={FIELD} />
          </label>
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

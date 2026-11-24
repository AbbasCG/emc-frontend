import { Search } from 'lucide-react'
import { TASK_PRIORITY_AR } from '@/data/operationsLabels'
import type { DueFilter, WorkFilters, WorkKindFilter, WorkPriority } from '@/lib/myWork'
import { cn } from '@/lib/utils'

const KINDS: { id: WorkKindFilter; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'tasks', label: 'المهام' },
  { id: 'tickets', label: 'التذاكر' },
]

const DUES: { id: DueFilter; label: string }[] = [
  { id: 'all', label: 'كل المواعيد' },
  { id: 'overdue', label: 'المتأخرة' },
  { id: 'week', label: 'خلال 7 أيام' },
  { id: 'none', label: 'بلا موعد' },
]

const FIELD = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue outline-none focus:border-customBlue focus:ring-1 focus:ring-customBlue'

/**
 * «الكل / المهام / التذاكر» (with counts), plus search, priority and due date. The filters act on tasks and
 * tickets alike, so the same search and the same priority mean the same thing for both.
 */
export default function MyWorkFilters({
  value,
  onChange,
  counts,
  searchLabel = 'بحث في مهامي وتذاكري',
  testId = 'my-work-filters',
}: {
  value: WorkFilters
  onChange: (next: WorkFilters) => void
  counts: { all: number; tasks: number; tickets: number }
  /** Accessible name of the search box (the global board searches everyone's work, not «mine»). */
  searchLabel?: string
  testId?: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-deepBlue/[0.03] p-3 ring-1 ring-deepBlue/[0.06] md:flex-row md:flex-wrap md:items-center md:justify-between" data-testid={testId}>
      <div role="group" aria-label="نوع العناصر" className="inline-flex max-w-full self-start rounded-xl bg-white p-1 ring-1 ring-deepBlue/[0.08]">
        {KINDS.map((k) => {
          const on = value.kind === k.id

          return (
            <button
              key={k.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ ...value, kind: k.id })}
              className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition', on ? 'bg-deepBlue text-white' : 'text-deepBlue/70 hover:bg-slate-50')}
            >
              {k.label}
              <span className={cn('rounded-full px-1.5 text-[10px]', on ? 'bg-white/20' : 'bg-slate-100')}>{counts[k.id]}</span>
            </button>
          )
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:justify-end">
        <label className="relative min-w-[12rem] flex-1 md:max-w-xs">
          <span className="sr-only">{searchLabel}</span>
          <Search size={14} className="pointer-events-none absolute right-3 top-2.5 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            maxLength={100}
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="بحث بالعنوان أو رقم التذكرة…"
            className={cn(FIELD, 'w-full pr-9')}
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-black text-deepBlue">
          الأولوية
          <select value={value.priority} onChange={(e) => onChange({ ...value, priority: e.target.value as WorkPriority | 'all' })} className={FIELD}>
            <option value="all">الكل</option>
            {(Object.keys(TASK_PRIORITY_AR) as WorkPriority[]).map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_AR[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-black text-deepBlue">
          الموعد
          <select value={value.due} onChange={(e) => onChange({ ...value, due: e.target.value as DueFilter })} className={FIELD}>
            {DUES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

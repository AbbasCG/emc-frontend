import type { CommandCenterSource, CommandCenterSourceKey } from '@/api/executiveCommandCenterApi'
import { cn } from '@/lib/utils'
import { SOURCE_META, SOURCE_ORDER } from './commandCenterUi'

export type SourceFilter = CommandCenterSourceKey | 'all'

/** Source chips. Scrolls sideways on narrow screens instead of wrapping into a wall. */
export function CommandCenterFilters({
  value,
  onChange,
  sources,
  total,
}: {
  value: SourceFilter
  onChange: (next: SourceFilter) => void
  sources: CommandCenterSource[]
  total: number
}) {
  const counts = new Map(sources.map((s) => [s.key, s]))
  const chips: { key: SourceFilter; label: string; count: number | null; available: boolean }[] = [
    { key: 'all', label: 'الكل', count: total, available: true },
    ...SOURCE_ORDER.map((k) => ({ key: k as SourceFilter, label: SOURCE_META[k].label, count: counts.get(k)?.count ?? null, available: counts.get(k)?.available !== false })),
  ]

  return (
    <nav aria-label="تصفية حسب المصدر" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" data-testid="source-filters">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          aria-pressed={value === c.key}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-black transition',
            value === c.key ? 'border-customBlue bg-customBlue text-white shadow-sm' : 'border-deepBlue/10 bg-white text-deepBlue/70 hover:border-customBlue/40 hover:text-deepBlue',
          )}
        >
          {!c.available ? <span className="h-1.5 w-1.5 rounded-full bg-red-400" title="مصدر غير متاح" aria-label="مصدر غير متاح" /> : null}
          {c.label}
          {c.count !== null ? <span className={cn('rounded-full px-1.5 text-[10px]', value === c.key ? 'bg-white/20' : 'bg-deepBlue/[0.06]')}>{c.count}</span> : null}
        </button>
      ))}
    </nav>
  )
}

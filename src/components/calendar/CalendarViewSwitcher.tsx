import type { CalendarViewMode } from '@/utils/calendarGrid'
import { VIEW_OPTIONS } from '@/utils/calendarGrid'
import { LayoutGrid, List } from 'lucide-react'

const ICONS: Partial<Record<CalendarViewMode, typeof List>> = {
  list: List,
  month: LayoutGrid,
}

export default function CalendarViewSwitcher({
  value,
  onChange,
}: {
  value: CalendarViewMode
  onChange: (mode: CalendarViewMode) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
      {VIEW_OPTIONS.map((opt) => {
        const Icon = ICONS[opt.id]
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={[
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition',
              value === opt.id
                ? 'bg-[#0C2A4B] text-white shadow-md'
                : 'bg-[#F6F8FB] text-slate-600 hover:text-[#0C2A4B]',
            ].join(' ')}
          >
            {Icon ? <Icon size={14} /> : null}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

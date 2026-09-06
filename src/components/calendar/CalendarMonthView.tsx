import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarEventRecord } from '@/types/phase7'
import CalendarGridEventChip from '@/components/calendar/CalendarGridEventChip'
import {
  buildMonthGrid,
  formatMonthTitle,
  groupEventsByDayKey,
  WEEKDAY_LABELS,
  type MonthCell,
} from '@/utils/calendarGrid'
import { formatCalendarDateTime } from '@/utils/calendarFormat'

function NavBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:border-[#0077B6]/40 hover:text-[#0077B6]"
    >
      {label === 'prev' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
    </button>
  )
}

export default function CalendarMonthView({
  anchor,
  events,
  onPrev,
  onNext,
  onToday,
  onSelectEvent,
  onSelectDay,
}: {
  anchor: Date
  events: CalendarEventRecord[]
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSelectEvent: (ev: CalendarEventRecord) => void
  onSelectDay: (date: Date) => void
}) {
  const cells = buildMonthGrid(anchor)
  const byDay = groupEventsByDayKey(events)

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[#0C2A4B]">{formatMonthTitle(anchor)}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToday}
            className="rounded-xl bg-[#0077B6]/10 px-3 py-1.5 text-xs font-black text-[#0077B6]"
          >
            اليوم
          </button>
          <NavBtn onClick={onPrev} label="prev" />
          <NavBtn onClick={onNext} label="next" />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-[10px] font-black text-slate-400 sm:text-xs"
          >
            {label}
          </div>
        ))}

        {cells.map((cell: MonthCell) => {
          const dayEvents = byDay.get(cell.key) ?? []
          const visible = dayEvents.slice(0, 3)
          const extra = dayEvents.length - visible.length
          const dayNum = formatCalendarDateTime(cell.date.toISOString(), { day: 'numeric' })

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDay(cell.date)}
              className={[
                'min-h-[72px] rounded-xl border p-1 text-start transition sm:min-h-[110px] sm:p-2',
                cell.inMonth ? 'border-slate-100 bg-[#F6F8FB]/80 hover:border-[#0077B6]/30' : 'border-transparent bg-slate-50/50 opacity-50',
                cell.isToday ? 'ring-2 ring-[#0077B6]/40' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black sm:text-xs',
                  cell.isToday ? 'bg-[#0077B6] text-white' : 'text-[#0C2A4B]',
                ].join(' ')}
              >
                {dayNum}
              </span>
              <div className="mt-1 space-y-0.5">
                {visible.map((ev) => (
                  <CalendarGridEventChip
                    key={ev.id}
                    event={ev}
                    variant="badge"
                    onClick={onSelectEvent}
                  />
                ))}
                {extra > 0 && (
                  <p className="px-1 text-[10px] font-bold text-[#0077B6]">+{String(extra)} أخرى</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

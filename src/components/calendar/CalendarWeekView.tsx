import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarEventRecord } from '@/types/phase7'
import CalendarGridEventChip from '@/components/calendar/CalendarGridEventChip'
import { buildWeekDays, formatWeekTitle, groupEventsByDayKey } from '@/utils/calendarGrid'

function NavBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:border-[#2691C2]/40 hover:text-[#2691C2]"
    >
      {label === 'prev' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
    </button>
  )
}

export default function CalendarWeekView({
  anchor,
  events,
  onPrev,
  onNext,
  onToday,
  onSelectEvent,
}: {
  anchor: Date
  events: CalendarEventRecord[]
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSelectEvent: (ev: CalendarEventRecord) => void
}) {
  const days = buildWeekDays(anchor)
  const byDay = groupEventsByDayKey(events)

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[#22334A]">{formatWeekTitle(anchor)}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToday}
            className="rounded-xl bg-[#2691C2]/10 px-3 py-1.5 text-xs font-black text-[#2691C2]"
          >
            اليوم
          </button>
          <NavBtn onClick={onPrev} label="prev" />
          <NavBtn onClick={onNext} label="next" />
        </div>
      </div>

      <div className="-mx-2 overflow-x-auto px-2 pb-2">
        <div className="grid min-w-[640px] grid-cols-7 gap-2 sm:min-w-0 sm:gap-3">
          {days.map((day) => {
            const dayEvents = byDay.get(day.key) ?? []
            return (
              <div
                key={day.key}
                className={[
                  'flex min-h-[280px] flex-col rounded-2xl border border-slate-100 bg-[#F6F8FB]/60 p-2 sm:p-3',
                  day.isToday ? 'ring-2 ring-[#2691C2]/35' : '',
                ].join(' ')}
              >
                <p className="mb-2 text-[11px] font-black text-[#22334A] sm:text-xs">{day.label}</p>
                <div className="flex flex-1 flex-col gap-2">
                  {dayEvents.length === 0 ? (
                    <p className="text-[10px] text-slate-400">—</p>
                  ) : (
                    dayEvents.map((ev) => (
                      <CalendarGridEventChip
                        key={ev.id}
                        event={ev}
                        variant="card"
                        onClick={onSelectEvent}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

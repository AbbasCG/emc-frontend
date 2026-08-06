import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarEventRecord } from '@/types/phase7'
import CalendarGridEventChip from '@/components/calendar/CalendarGridEventChip'
import { formatDayTitle, getDayKey, groupEventsByDayKey, getHourInTz, TIMELINE_HOURS } from '@/utils/calendarGrid'

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

export default function CalendarDayView({
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
  const key = getDayKey(anchor)
  const byDay = groupEventsByDayKey(events)
  const dayEvents = byDay.get(key) ?? []

  const byHour = new Map<number, CalendarEventRecord[]>()
  for (const ev of dayEvents) {
    const h = getHourInTz(ev.start_at)
    const bucket = byHour.get(h) ?? []
    bucket.push(ev)
    byHour.set(h, bucket)
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[#22334A]">{formatDayTitle(anchor)}</h2>
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
        <div className="min-w-[320px] space-y-2">
          {TIMELINE_HOURS.map((hour) => {
            const slotEvents = byHour.get(hour) ?? []
            return (
              <div key={hour} className="grid grid-cols-[52px_1fr] gap-3 border-b border-slate-100 py-2">
                <span className="pt-1 text-[11px] font-black text-slate-400">
                  {String(hour).padStart(2, '0')}:00
                </span>
                <div className="min-h-[48px] space-y-2">
                  {slotEvents.length === 0 ? (
                    <span className="text-[10px] text-slate-300">—</span>
                  ) : (
                    slotEvents.map((ev) => (
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

          {dayEvents.filter((ev) => !TIMELINE_HOURS.includes(getHourInTz(ev.start_at))).length > 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
              <p className="mb-2 text-xs font-black text-slate-500">أحداث أخرى</p>
              <div className="space-y-2">
                {dayEvents
                  .filter((ev) => !TIMELINE_HOURS.includes(getHourInTz(ev.start_at)))
                  .map((ev) => (
                    <CalendarGridEventChip
                      key={ev.id}
                      event={ev}
                      variant="card"
                      onClick={onSelectEvent}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

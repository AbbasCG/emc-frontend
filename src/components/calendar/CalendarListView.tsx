import { CalendarClock } from 'lucide-react'
import type { CalendarEventRecord } from '@/types/phase7'
import CalendarEventCard from '@/components/enterprise/CalendarEventCard'
import { groupEventsByDay } from '@/utils/calendarFormat'

export default function CalendarListView({
  events,
  emptyMsg,
  onSelect,
  onEdit,
  onDelete,
}: {
  events: CalendarEventRecord[]
  emptyMsg: string
  onSelect: (ev: CalendarEventRecord) => void
  onEdit: (ev: CalendarEventRecord) => void
  onDelete: (ev: CalendarEventRecord) => void
}) {
  const grouped = groupEventsByDay(events)

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
          <CalendarClock size={28} className="text-slate-300" />
        </div>
        <p className="text-base font-black text-[#0C2A4B]">لا أحداث</p>
        <p className="mt-1 max-w-xs text-sm text-slate-400">{emptyMsg}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {grouped.map((group) => (
        <section key={group.key}>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <h2 className="shrink-0 text-sm font-black text-[#0C2A4B]">{group.label}</h2>
            <span className="rounded-full bg-[#0077B6]/10 px-2.5 py-0.5 text-[11px] font-black text-[#0077B6]">
              {String(group.items.length)}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="space-y-4">
            {group.items.map((ev) => (
              <CalendarEventCard
                key={ev.id}
                event={ev}
                onClick={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

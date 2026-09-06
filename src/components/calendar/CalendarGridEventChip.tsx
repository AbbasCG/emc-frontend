import type { CalendarEventRecord } from '@/types/phase7'
import { MeetingLinkAction } from '@/components/enterprise/CalendarEventCard'
import {
  formatCalendarTime,
  translateEventStatus,
  typeLabel,
  TYPE_COLORS,
} from '@/utils/calendarFormat'

const TYPE_BAR: Record<string, string> = {
  session: 'bg-[#0077B6]',
  workshop: 'bg-purple-500',
  meeting: 'bg-amber-500',
  task: 'bg-red-500',
  course: 'bg-emerald-500',
  program: 'bg-[#0C2A4B]',
  learning_path: 'bg-indigo-500',
  event: 'bg-slate-400',
}

type Variant = 'badge' | 'card'

export default function CalendarGridEventChip({
  event,
  variant = 'badge',
  onClick,
}: {
  event: CalendarEventRecord
  variant?: Variant
  onClick?: (ev: CalendarEventRecord) => void
}) {
  const bar = TYPE_BAR[event.type] ?? TYPE_BAR.event
  const colorCls = TYPE_COLORS[event.type] ?? TYPE_COLORS.event

  if (variant === 'badge') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(event)
        }}
        className={`flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-start text-[10px] font-bold text-[#0C2A4B] ring-1 ring-slate-100 transition hover:ring-[#0077B6]/30 ${colorCls}`}
      >
        <span className={`h-2 w-1 shrink-0 rounded-full ${bar}`} />
        <span className="min-w-0 flex-1 truncate">{event.title}</span>
        <span className="shrink-0 opacity-70">{formatCalendarTime(event.start_at)}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      dir="rtl"
      onClick={() => onClick?.(event)}
      className="w-full rounded-xl border border-slate-100 border-s-4 bg-white p-3 text-right shadow-sm transition hover:border-[#0077B6]/25 hover:shadow-md"
      style={{ borderInlineStartColor: undefined }}
    >
      <div className={`mb-2 h-1 w-full rounded-full ${bar}`} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ring-1 ${colorCls}`}>
          {typeLabel(event.type)}
        </span>
        {event.status && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {translateEventStatus(event.status)}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-black text-[#0C2A4B]">{event.title}</p>
      <p className="mt-1 text-[11px] font-bold text-slate-500">{formatCalendarTime(event.start_at)}</p>
      {event.meeting_link && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <MeetingLinkAction event={event} compact />
        </div>
      )}
    </button>
  )
}

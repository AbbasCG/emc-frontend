import {
  CalendarClock, MapPin, Video, BookOpen, Users, CheckSquare, Layers,
  ExternalLink, Clock, ChevronLeft, GraduationCap, Route,
} from 'lucide-react'
import type { CalendarEventRecord } from '@/types/phase7'
import {
  formatCalendarDateShort,
  formatCalendarTime,
  getMeetingJoinState,
  translateEventStatus,
  typeLabel,
  TYPE_COLORS,
  TYPE_ACCENT,
} from '@/utils/calendarFormat'

function TypeIcon({ type }: { type: CalendarEventRecord['type'] }) {
  const cls = 'h-3.5 w-3.5'
  switch (type) {
    case 'session':
      return <Video className={cls} />
    case 'workshop':
      return <Layers className={cls} />
    case 'meeting':
      return <Users className={cls} />
    case 'task':
      return <CheckSquare className={cls} />
    case 'course':
      return <BookOpen className={cls} />
    case 'program':
      return <GraduationCap className={cls} />
    case 'learning_path':
      return <Route className={cls} />
    default:
      return <CalendarClock className={cls} />
  }
}

interface Props {
  event: CalendarEventRecord
  onEdit?: (ev: CalendarEventRecord) => void
  onDelete?: (ev: CalendarEventRecord) => void
  onClick?: (ev: CalendarEventRecord) => void
}

function MeetingLinkAction({ event, compact }: { event: CalendarEventRecord; compact?: boolean }) {
  if (!event.meeting_link) return null

  const state = getMeetingJoinState(event.start_at, event.end_at)
  const base = compact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'

  if (state === 'live') {
    return (
      <a
        href={event.meeting_link}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-2 rounded-xl bg-[#0077B6] font-black text-white shadow-md transition hover:opacity-90 ${base}`}
      >
        <Video size={compact ? 13 : 14} />
        انضم للاجتماع
        <ExternalLink size={compact ? 11 : 12} />
      </a>
    )
  }

  if (state === 'before') {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-xl bg-slate-100 font-bold text-slate-500 ${base}`}
      >
        <Clock size={compact ? 13 : 14} />
        الرابط سيتاح قبل الموعد
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-2 rounded-xl bg-slate-50 font-bold text-slate-400 ${base}`}>
      انتهى الاجتماع
    </span>
  )
}

export default function CalendarEventCard({ event, onEdit, onDelete, onClick }: Props) {
  const colorCls = TYPE_COLORS[event.type] ?? TYPE_COLORS.event
  const accentCls = TYPE_ACCENT[event.type] ?? TYPE_ACCENT.event
  const instructorName = event.instructor?.name ?? event.owner?.name
  const contextLine = event.subtitle ?? event.course?.title ?? event.department?.name_ar

  return (
    <article
      dir="rtl"
      className={`group cursor-pointer rounded-2xl border border-slate-100 border-s-4 bg-white p-5 shadow-sm transition hover:border-[#0077B6]/25 hover:shadow-md ${accentCls}`}
      onClick={() => onClick?.(event)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-4">
          {event.image_url && (
            <img
              src={event.image_url}
              alt=""
              className="hidden h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-slate-100 sm:block"
            />
          )}
          <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black ring-1 ${colorCls}`}>
              <TypeIcon type={event.type} />
              {typeLabel(event.type)}
            </span>
            {event.status && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                {translateEventStatus(event.status)}
              </span>
            )}
            {event.visibility === 'private' && (
              <span className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-400 ring-1 ring-slate-100">
                خاص
              </span>
            )}
          </div>

          <h3 className="mt-3 text-base font-black leading-snug text-[#0C2A4B]">{event.title}</h3>

          {contextLine && (
            <p className="mt-1 text-[11px] font-medium text-slate-400">{contextLine}</p>
          )}

          {instructorName && (
            <p className="mt-1 text-[11px] font-bold text-slate-500">{instructorName}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-2">
              <CalendarClock size={14} className="text-[#0077B6]" />
              {formatCalendarDateShort(event.start_at)}
            </span>
            {event.end_at && (
              <span className="inline-flex items-center gap-1 font-normal text-slate-400">
                <Clock size={12} />
                {'حتى '}
                {formatCalendarTime(event.end_at)}
              </span>
            )}
          </div>

          {event.location && (
            <p className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500">
              <MapPin size={14} className="text-[#F28C00]" />
              {event.location}
            </p>
          )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
          <MeetingLinkAction event={event} compact />

          <button
            type="button"
            onClick={() => onClick?.(event)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#0077B6] opacity-0 transition group-hover:opacity-100 hover:bg-[#0077B6]/5"
          >
            التفاصيل
            <ChevronLeft size={14} />
          </button>

          {event.can_edit && (
            <div className="flex gap-2 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onEdit?.(event)}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-600 transition hover:bg-[#0077B6]/10 hover:text-[#0077B6]"
              >
                تعديل
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(event)}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600"
              >
                حذف
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export { MeetingLinkAction }

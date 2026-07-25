import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronRight, ChevronLeft, List, Grid3x3, Columns3, Sun, Video } from 'lucide-react'
import type { LmsSessionEvent } from '@/api/placementApi'
import { formatAmsterdamDMY, formatWallClockDMY, formatWallClockTime24 } from '@/utils/amsterdamTime'
import SessionStatusBadge from './SessionStatusBadge'
import toast from '@/lib/toast'

export type ViewMode = 'month' | 'week' | 'day' | 'agenda'

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setDate(out.getDate() - out.getDay())
  out.setHours(0, 0, 0, 0)
  return out
}

/**
 * Shared calendar surface reused by both the instructor and student calendar
 * pages — same views, same event card shape, same bounded-range fetch
 * contract. Callers supply the fetcher (instructor vs student endpoint) and
 * an onEventClick handler (instructor vs student session-detail route); no
 * management-only behavior lives inside this component.
 */
export default function SessionCalendar({
  fetchEvents,
  onEventClick,
  filters,
  title = 'التقويم',
}: {
  fetchEvents: (from: string, to: string) => Promise<LmsSessionEvent[]>
  onEventClick: (ev: LmsSessionEvent) => void
  /** Optional extra filter controls (course/class dropdowns) rendered in the toolbar — instructor-only. */
  filters?: React.ReactNode
  title?: string
}) {
  const [view, setView] = useState<ViewMode>('agenda')
  const [anchor, setAnchor] = useState(() => new Date())
  const [events, setEvents] = useState<LmsSessionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const { from, to } = useMemo(() => {
    if (view === 'day') {
      const d = toISODate(anchor)
      return { from: d, to: d }
    }
    if (view === 'week') {
      const start = startOfWeek(anchor)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { from: toISODate(start), to: toISODate(end) }
    }
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
    return { from: toISODate(start), to: toISODate(end) }
  }, [anchor, view])

  // Re-arm the loading state during render when the visible range (or the fetcher)
  // changes — react.dev "adjusting state when a prop changes". On mount the effect only
  // re-set the already-initial values, so seeding `seen` here keeps behaviour identical.
  const [seenRange, setSeenRange] = useState({ from, to, fetchEvents })
  if (seenRange.from !== from || seenRange.to !== to || seenRange.fetchEvents !== fetchEvents) {
    setSeenRange({ from, to, fetchEvents })
    setLoading(true)
    setError(false)
  }

  useEffect(() => {
    let cancelled = false
    fetchEvents(from, to)
      .then((rows) => { if (!cancelled) setEvents(rows) })
      .catch(() => { if (!cancelled) { setError(true); toast.error('تعذّر تحميل التقويم') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [from, to, fetchEvents])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, LmsSessionEvent[]>()
    for (const ev of events) {
      if (!ev.date) continue
      const list = map.get(ev.date) ?? []
      list.push(ev)
      map.set(ev.date, list)
    }
    return map
  }, [events])

  const monthDays = useMemo(() => {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
    const leading = start.getDay()
    const days: (Date | null)[] = Array.from({ length: leading }, () => null)
    for (let d = 1; d <= end.getDate(); d++) days.push(new Date(anchor.getFullYear(), anchor.getMonth(), d))
    return days
  }, [anchor])

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d })
  }, [anchor])

  function step(delta: number) {
    if (view === 'day') setAnchor(new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + delta))
    else if (view === 'week') setAnchor(new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + delta * 7))
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1))
  }

  const heading = view === 'day'
    ? anchor.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${formatAmsterdamDMY(toISODate(startOfWeek(anchor)))} – ${formatAmsterdamDMY(toISODate(weekDays[6]))}`
      : anchor.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-deepBlue via-[#1a2d44] to-customBlue px-6 py-6 shadow-[0_20px_50px_-20px_rgba(12,42,75,0.5)] sm:px-8"
      >
        <div aria-hidden className="pointer-events-none absolute -left-10 top-0 h-44 w-44 rounded-full bg-customOrange/15 blur-[80px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">{title}</p>
            <h1 className="mt-0.5 flex items-center gap-2 text-[1.4rem] font-black leading-tight text-white">
              <Calendar className="h-5 w-5" />
              {heading}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => step(-1)} className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20" aria-label="السابق">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setAnchor(new Date())} className="rounded-xl bg-white/15 px-3 py-2 text-[11px] font-black text-white hover:bg-white/25">
              اليوم
            </button>
            <button type="button" onClick={() => step(1)} className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20" aria-label="التالي">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2" role="tablist">
          {([
            ['agenda', List, 'قائمة'], ['day', Sun, 'يوم'], ['week', Columns3, 'أسبوع'], ['month', Grid3x3, 'شهر'],
          ] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              role="tab"
              aria-selected={view === id}
              className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-[12px] font-black transition ${view === id ? 'bg-deepBlue text-white' : 'border border-deepBlue/10 bg-white text-deepBlue/60'}`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        {filters}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 py-14 text-center text-[13px] font-semibold text-red-500">
          تعذّر تحميل التقويم — حاول مرة أخرى
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center text-[13px] font-semibold text-deepBlue/40">
          لا توجد جلسات في هذه الفترة
        </div>
      ) : view === 'agenda' ? (
        <AgendaList events={events} onEventClick={onEventClick} />
      ) : view === 'day' ? (
        <AgendaList events={eventsByDate.get(toISODate(anchor)) ?? []} onEventClick={onEventClick} emptyLabel="لا توجد جلسات في هذا اليوم" />
      ) : view === 'week' ? (
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => {
            const dayEvents = eventsByDate.get(toISODate(day)) ?? []
            return (
              <div key={day.toISOString()} className="min-h-[140px] rounded-xl border border-slate-200 bg-white p-1.5">
                <p className="text-center text-[10px] font-black text-deepBlue/50">
                  {day.toLocaleDateString('ar-EG', { weekday: 'short' })} {day.getDate()}
                </p>
                <div className="mt-1 space-y-1">
                  {dayEvents.map((ev) => (
                    <button key={ev.id} type="button" onClick={() => onEventClick(ev)}
                      className="block w-full truncate rounded bg-sky-50 px-1 py-0.5 text-right text-[9px] font-bold text-sky-700">
                      {formatWallClockTime24(ev.start_time)} {ev.title}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map((d) => (
            <div key={d} className="pb-1 text-center text-[10px] font-black text-deepBlue/40">{d}</div>
          ))}
          {monthDays.map((day, i) => {
            const dateKey = day ? toISODate(day) : null
            const dayEvents = dateKey ? (eventsByDate.get(dateKey) ?? []) : []
            return (
              <div key={i} className={`min-h-[76px] rounded-xl border p-1.5 ${day ? 'border-slate-200 bg-white' : 'border-transparent'}`}>
                {day && (
                  <>
                    <p className="text-[10px] font-bold text-deepBlue/40">{day.getDate()}</p>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <button key={ev.id} type="button" onClick={() => onEventClick(ev)}
                          className="block w-full truncate rounded px-1 py-0.5 text-right text-[9px] font-bold bg-sky-50 text-sky-700">
                          {ev.title}
                        </button>
                      ))}
                      {dayEvents.length > 2 && <p className="text-[8px] font-bold text-deepBlue/30">+{dayEvents.length - 2}</p>}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AgendaList({ events, onEventClick, emptyLabel }: { events: LmsSessionEvent[]; onEventClick: (ev: LmsSessionEvent) => void; emptyLabel?: string }) {
  if (events.length === 0) {
    return <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center text-[13px] font-semibold text-deepBlue/40">{emptyLabel ?? 'لا توجد جلسات'}</div>
  }
  return (
    <div className="space-y-2">
      {events.map((ev) => (
        <button
          key={ev.id}
          type="button"
          onClick={() => onEventClick(ev)}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right transition hover:border-[#0077B6]/30"
        >
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black text-deepBlue">{ev.title}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-deepBlue/45">
              {ev.class_group?.name ?? '—'} {ev.course?.title ? `· ${ev.course.title}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {ev.meeting.provider !== 'none' && <Video className="h-3.5 w-3.5 text-deepBlue/30" />}
            <SessionStatusBadge status={ev.status} />
            <span className="font-mono text-[11px] font-bold text-deepBlue/50">
              {formatWallClockDMY(ev.date)} · {formatWallClockTime24(ev.start_time)}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}

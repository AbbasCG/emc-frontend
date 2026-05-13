import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchCalendarEvents } from '@/api/calendarApi'
import CalendarEventCard from '@/components/enterprise/CalendarEventCard'
import IcsDownloadButton from '@/components/enterprise/IcsDownloadButton'
import EmptyState from '@/components/dashboard/EmptyState'
import { LoadingSkeletonStack } from '@/components/enterprise/LoadingSkeleton'
import type { CalendarEventRecord, CalendarFilterKind } from '@/types/phase7'

const FILTERS: { id: CalendarFilterKind; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'session', label: 'الجلسات القادمة' },
  { id: 'meeting', label: 'الاجتماعات' },
  { id: 'task', label: 'المهام' },
]

export default function CalendarPage() {
  const location = useLocation()
  const isAdmin = location.pathname.includes('/dashboard/admin/calendar')
  const [filter, setFilter] = useState<CalendarFilterKind>('all')
  const [events, setEvents] = useState<CalendarEventRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const list = await fetchCalendarEvents(filter === 'all' ? undefined : filter)
      if (!cancelled) {
        setEvents(list)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [filter])

  const title = useMemo(() => (isAdmin ? 'تقويم الإدارة' : 'التقويم'), [isAdmin])

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-customOrange">Calendar</p>
          <h1 className="text-3xl font-black text-deepBlue">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-500">
            الجلسات والاجتماعات والمهام في خط زمني واحد مع تصدير ICS قياسي لأي تقويم خارجي.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IcsDownloadButton kind={filter === 'all' ? undefined : filter} label="تحميل ICS" />
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-white px-4 py-2 text-xs font-black text-deepBlue shadow-sm ring-1 ring-slate-200 transition hover:ring-customBlue/40"
          >
            إضافة إلى التقويم
          </a>
          {isAdmin && (
            <Link
              to="/dashboard/admin/integrations"
              className="rounded-xl bg-deepBlue px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-deepBlue/90"
            >
              التكاملات
            </Link>
          )}
        </div>
      </motion.div>

      <div dir="rtl" className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={[
              'rounded-xl px-4 py-2 text-xs font-black transition',
              filter === f.id ? 'bg-customBlue text-white shadow-md' : 'bg-[#F6F8FB] text-slate-600 hover:text-deepBlue',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
          <LoadingSkeletonStack rows={4} />
        ) : events.length === 0 ? (
          <EmptyState title="لا أحداث ضمن الفلتر الحالي" description="جرّب نوعًا آخر أو انتظر مزامنة الخادم." />
        ) : (
          events.map((ev) => <CalendarEventCard key={ev.id} event={ev} />)
        )}
      </div>
    </div>
  )
}

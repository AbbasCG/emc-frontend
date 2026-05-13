import { CalendarClock, Link as LinkIcon, MapPin, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CalendarEventRecord } from '@/types/phase7'

function kindLabel(kind: CalendarEventRecord['kind']) {
  if (kind === 'session') return 'جلسة'
  if (kind === 'meeting') return 'اجتماع'
  return 'مهمة'
}

export default function CalendarEventCard({ event }: { event: CalendarEventRecord }) {
  const when = new Date(event.starts_at).toLocaleString('ar-SA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const joinIsExternal = Boolean(event.join_url?.startsWith('http'))

  return (
    <article dir="rtl" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-customBlue/25 hover:shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-deepBlue/5 px-2 py-1 text-[11px] font-black text-deepBlue ring-1 ring-deepBlue/10">
              {kindLabel(event.kind)}
            </span>
            <span className="rounded-lg bg-[#F6F8FB] px-2 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-100">
              {event.status_ar}
            </span>
          </div>
          <h3 className="mt-3 text-base font-black text-deepBlue">{event.title}</h3>
          <p className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500">
            <CalendarClock size={15} className="text-customBlue" />
            {when}
          </p>
          {event.location_ar && (
            <p className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500">
              <MapPin size={15} className="text-customOrange" />
              {event.location_ar}
            </p>
          )}
        </div>
        {event.join_url && (
          joinIsExternal ? (
            <a
              href={event.join_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-4 py-2 text-xs font-black text-white shadow-md transition hover:opacity-95"
            >
              <Video size={15} />
              الانضمام
              <LinkIcon size={14} />
            </a>
          ) : (
            <Link
              to={event.join_url}
              className="inline-flex items-center gap-2 rounded-xl bg-deepBlue px-4 py-2 text-xs font-black text-white shadow-md transition hover:opacity-95"
            >
              <Video size={15} />
              فتح الرابط
            </Link>
          )
        )}
      </div>
    </article>
  )
}

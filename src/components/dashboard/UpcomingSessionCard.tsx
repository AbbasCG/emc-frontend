import { CalendarClock, ExternalLink, MapPin, Video } from 'lucide-react'

type SessionPlatform = 'zoom' | 'meet' | 'teams'

type UpcomingSessionCardProps = {
  courseName: string
  date: string
  time?: string
  type: 'online' | 'offline'
  instructor?: string
  location?: string
  meetingLink?: string
  platform?: SessionPlatform
}

const platformLabel: Record<SessionPlatform, string> = {
  zoom: 'Zoom',
  meet: 'Google Meet',
  teams: 'Microsoft Teams',
}

const platformColor: Record<SessionPlatform, string> = {
  zoom:  'bg-blue-50 text-blue-600 ring-blue-100',
  meet:  'bg-green-50 text-green-600 ring-green-100',
  teams: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
}

export default function UpcomingSessionCard({
  courseName,
  date,
  time,
  type,
  instructor,
  location,
  meetingLink,
  platform = 'zoom',
}: UpcomingSessionCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-deepBlue">{courseName}</p>
          {instructor && (
            <p className="mt-0.5 truncate text-xs text-slate-400">{instructor}</p>
          )}
        </div>
        <span
          className={[
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1',
            type === 'online'
              ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
              : 'bg-slate-50 text-slate-500 ring-slate-100',
          ].join(' ')}
        >
          {type === 'online' ? 'أونلاين' : 'حضوري'}
        </span>
      </div>

      {/* Meta */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <CalendarClock size={14} className="shrink-0 text-customBlue" />
          <span>{date}{time ? ` — ${time}` : ''}</span>
        </div>

        {type === 'offline' && location && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <MapPin size={14} className="shrink-0 text-customOrange" />
            <span>{location}</span>
          </div>
        )}

        {type === 'online' && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Video size={14} className="shrink-0 text-emerald-500" />
            <span
              className={[
                'rounded-full px-2 py-0.5 ring-1',
                platformColor[platform],
              ].join(' ')}
            >
              {platformLabel[platform]}
            </span>
          </div>
        )}
      </div>

      {/* Join button */}
      {type === 'online' && meetingLink && (
        <a
          href={meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600"
        >
          <ExternalLink size={15} />
          انضم للجلسة
        </a>
      )}
    </div>
  )
}

import { motion } from 'framer-motion'
import { ExternalLink, PlayCircle, Video } from 'lucide-react'
import type { LmsSession } from '@/types/lms'
import { formatSessionSchedule, getSessionJoinState } from '@/utils/lmsSession'
import LmsStatusBadge from './LmsStatusBadge'

type Props = {
  session: LmsSession
  showRecording?: boolean
  /** Optional label for joining online meeting link */
  joinMeetingLabel?: string
}

export default function SessionCard({ session, showRecording = true, joinMeetingLabel }: Props) {
  const scheduleLine = formatSessionSchedule(session)
  const joinState = getSessionJoinState(session, Date.now(), joinMeetingLabel ?? 'انضم للجلسة')

  return (
    <motion.article
      layout
      className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white p-5 shadow-lg shadow-deepBlue/[0.04] ring-1 ring-deepBlue/[0.05]"
    >
      <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-customBlue to-customOrange opacity-90" />
      <div className="flex flex-col gap-4 text-right sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2 pr-2">
          <div className="flex flex-wrap items-center justify-start gap-2">
            <LmsStatusBadge status={session.status} kind="session" />
            {session.type && (
              <span className="rounded-full bg-deepBlue/[0.05] px-2 py-0.5 text-[10px] font-black text-deepBlue/70">
                {session.type === 'online' ? 'أونلاين' : 'حضوري'}
              </span>
            )}
          </div>
          <h3 className="text-base font-black leading-snug text-deepBlue">
            {session.title ?? session.course_name}
          </h3>
          <p className="text-xs font-bold text-slate-500">{session.course_name}</p>
          <div className="flex flex-wrap items-center justify-start gap-3 text-xs font-bold text-slate-600">
            <span>{scheduleLine}</span>
            {session.instructor_name && <span>المدرب: {session.instructor_name}</span>}
            {session.location && session.type === 'offline' && <span>{session.location}</span>}
          </div>
          {joinState.kind === 'no_link' && (
            <p className="rounded-xl border border-sky-200/85 bg-sky-50/90 px-3 py-2 text-[11px] font-bold leading-relaxed text-sky-950">
              {joinState.label}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {joinState.kind === 'join' && (
            <a
              href={joinState.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-customBlue px-4 py-2.5 text-xs font-black text-white shadow-md shadow-customBlue/25 transition hover:opacity-95"
            >
              <PlayCircle size={16} />
              {joinState.label}
            </a>
          )}
          {(joinState.kind === 'waiting' || joinState.kind === 'cancelled' || joinState.kind === 'ended') && (
            <span
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black ring-1 ${
                joinState.kind === 'cancelled' ?
                  'bg-rose-50 text-rose-700 ring-rose-100'
                : joinState.kind === 'ended' ?
                  'bg-slate-100 text-slate-500 ring-slate-200'
                : 'bg-amber-50 text-amber-800 ring-amber-100'
              }`}
            >
              {joinState.label}
            </span>
          )}
          {joinState.kind === 'offline' && (
            <span className="inline-flex items-center justify-center rounded-xl border border-deepBlue/10 bg-slate-50 px-4 py-2.5 text-xs font-black text-deepBlue">
              {joinState.label}
            </span>
          )}
          {showRecording && session.recording_link && (
            <a
              href={session.recording_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-deepBlue/10 bg-white px-4 py-2 text-xs font-black text-deepBlue transition hover:border-customOrange/40 hover:text-customOrange"
            >
              <Video size={16} />
              مشاهدة التسجيل
              <ExternalLink size={12} className="opacity-50" />
            </a>
          )}
        </div>
      </div>
    </motion.article>
  )
}

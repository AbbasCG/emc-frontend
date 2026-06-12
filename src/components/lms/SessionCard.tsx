import { motion } from 'framer-motion'
import { ExternalLink, PlayCircle, Video } from 'lucide-react'
import type { LmsSession } from '@/types/lms'
import { formatSessionSchedule, getSessionJoinState } from '@/utils/lmsSession'

type Props = {
  session: LmsSession
  showRecording?: boolean
  /** Optional label for joining online meeting link */
  joinMeetingLabel?: string
  compact?: boolean
}

/** Derive a consistent status badge from the join state so badge + CTA never conflict. */
function StatusBadgeFromJoinState({ kind }: { kind: string }) {
  if (kind === 'join') {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
        مباشرة الآن
      </span>
    )
  }
  if (kind === 'cancelled') {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700 ring-1 ring-red-100">
        ملغاة
      </span>
    )
  }
  if (kind === 'ended') {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
        انتهت
      </span>
    )
  }
  // waiting / offline / no_link → upcoming
  return (
    <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-customBlue ring-1 ring-sky-100">
      قادمة
    </span>
  )
}

export default function SessionCard({ session, showRecording = true, joinMeetingLabel, compact = false }: Props) {
  const scheduleLine = formatSessionSchedule(session)
  const joinState = getSessionJoinState(session, Date.now(), joinMeetingLabel ?? 'انضم للجلسة')

  return (
    <motion.article
      layout
      className={`group relative overflow-hidden rounded-2xl border border-white/80 bg-white shadow-lg shadow-deepBlue/[0.04] ring-1 ring-deepBlue/[0.05] ${compact ? 'p-3.5' : 'p-5'}`}
    >
      <div className={`absolute right-0 top-0 h-full w-1 opacity-90 ${
        joinState.kind === 'join' ? 'bg-emerald-500'
        : joinState.kind === 'ended' ? 'bg-slate-300'
        : joinState.kind === 'cancelled' ? 'bg-rose-400'
        : 'bg-gradient-to-b from-customBlue to-customOrange'
      }`} />
      <div className={`flex flex-col gap-3 text-right ${compact ? '' : 'sm:flex-row sm:items-center sm:justify-between'}`}>
        <div className="min-w-0 flex-1 space-y-2 pr-2">
          <div className="flex flex-wrap items-center justify-start gap-2">
            <StatusBadgeFromJoinState kind={joinState.kind} />
            {session.type && (
              <span className="rounded-full bg-deepBlue/[0.05] px-2 py-0.5 text-[10px] font-black text-deepBlue/70">
                {session.type === 'online' ? 'أونلاين' : 'حضوري'}
              </span>
            )}
          </div>
          <h3 className={`font-black leading-snug text-deepBlue ${compact ? 'text-[13px]' : 'text-base'}`}>
            {session.title ?? session.course_name}
          </h3>
          {!compact && <p className="text-xs font-bold text-slate-500">{session.course_name}</p>}
          <div className="flex flex-wrap items-center justify-start gap-3 text-xs font-bold text-slate-600">
            <span dir="ltr">{scheduleLine}</span>
            {session.instructor_name && <span>المدرب: {session.instructor_name}</span>}
            {session.location && session.type === 'offline' && <span>{session.location}</span>}
          </div>
          {joinState.kind === 'no_link' && (
            <p className="rounded-xl border border-sky-200/85 bg-sky-50/90 px-3 py-2 text-[11px] font-bold leading-relaxed text-sky-950">
              {joinState.label}
            </p>
          )}
        </div>

        <div className={`flex shrink-0 flex-col gap-2 ${compact ? '' : 'sm:items-end'}`}>
          {joinState.kind === 'join' && (
            <a
              href={joinState.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-700"
            >
              <PlayCircle size={16} />
              {joinState.label}
            </a>
          )}
          {joinState.kind === 'waiting' && (
            <span className="inline-flex items-center justify-center rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-800 ring-1 ring-amber-100">
              {joinState.label}
            </span>
          )}
          {joinState.kind === 'cancelled' && (
            <span className="inline-flex items-center justify-center rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 ring-1 ring-rose-100">
              {joinState.label}
            </span>
          )}
          {joinState.kind === 'ended' && (
            <span className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-500 ring-1 ring-slate-200">
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

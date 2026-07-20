import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Loader2, PlayCircle, Video } from 'lucide-react'
import type { LmsSession } from '@/types/lms'
import { formatSessionSchedule, getSessionJoinState } from '@/utils/lmsSession'
import { formatStudentDateTime } from '@/components/lms/lmsFormatters'
import { openStudentSessionLink } from '@/api/studentApi'
import toast from '@/lib/toast'

type Props = {
  session: LmsSession
  showRecording?: boolean
  joinMeetingLabel?: string
  compact?: boolean
  /**
   * Use the Arabic long-date student format ("الخميس، 16 يوليو 2026 — 19:00")
   * instead of the shared instructor/admin DD/MM/YYYY format. Set this on
   * student-area call sites only — SessionCard is also reused on
   * instructor/admin pages that must keep their existing date format.
   */
  studentDateFormat?: boolean
}

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
  return (
    <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-customBlue ring-1 ring-sky-100">
      قادمة
    </span>
  )
}

export default function SessionCard({ session, showRecording = true, joinMeetingLabel, compact = false, studentDateFormat = false }: Props) {
  const scheduleLine = studentDateFormat
    ? formatStudentDateTime(session.starts_at ?? session.date ?? null)
    : formatSessionSchedule(session)
  const joinState = getSessionJoinState(session, Date.now(), joinMeetingLabel ?? 'انضم للجلسة')
  const [joining, setJoining] = useState(false)

  async function handleJoin() {
    if (joining) return
    setJoining(true)
    try {
      const url = await openStudentSessionLink(Number(session.id))
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        toast.warning('انتهت الجلسة أو تم إلغاؤها.')
      } else if (status === 403) {
        toast.error('غير مسجّل في هذه الدورة.')
      } else if (status === 422) {
        toast.warning('لا يوجد رابط اجتماع لهذه الجلسة.')
      } else {
        // Fallback: open direct link if tracking fails
        const fallbackUrl = joinState.kind === 'join' ? joinState.href : null
        if (fallbackUrl && fallbackUrl !== '#') {
          window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
        } else {
          toast.error('تعذّر فتح الجلسة. حاول مرة أخرى.')
        }
      }
    } finally {
      setJoining(false)
    }
  }

  return (
    <motion.article
      layout
      className={`group relative overflow-hidden rounded-2xl border border-white/80 bg-white shadow-lg shadow-deepBlue/[0.04] ring-1 ring-deepBlue/[0.05] ${compact ? 'p-3' : 'p-5'}`}
    >
      <div className={`absolute right-0 top-0 h-full w-1 opacity-90 ${
        joinState.kind === 'join' ? 'bg-emerald-500'
        : joinState.kind === 'ended' ? 'bg-slate-300'
        : joinState.kind === 'cancelled' ? 'bg-rose-400'
        : 'bg-gradient-to-b from-customBlue to-customOrange'
      }`} />
      <div className={`flex flex-col text-right ${compact ? 'gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3' : 'gap-3 sm:flex-row sm:items-center sm:justify-between'}`}>
        <div className={`min-w-0 flex-1 pr-2 ${compact ? 'space-y-1' : 'space-y-2'}`}>
          <div className="flex flex-wrap items-center justify-start gap-2">
            <StatusBadgeFromJoinState kind={joinState.kind} />
            {session.type && (
              <span className="rounded-full bg-deepBlue/[0.05] px-2 py-0.5 text-[10px] font-black text-deepBlue/70">
                {session.type === 'online' ? 'أونلاين' : 'حضوري'}
              </span>
            )}
            <h3 className={`truncate font-black leading-snug text-deepBlue ${compact ? 'text-[13px]' : 'text-base'}`}>
              {session.title ?? session.course_name}
            </h3>
          </div>
          {!compact && <p className="text-xs font-bold text-slate-500">{session.course_name}</p>}
          <div className={`flex flex-wrap items-center justify-start gap-x-3 gap-y-0.5 font-bold text-slate-600 ${compact ? 'text-[11px]' : 'text-xs'}`}>
            <span dir="ltr">{scheduleLine}</span>
            {session.instructor_name && <span>المدرب: {session.instructor_name}</span>}
            {session.location && session.type === 'offline' && <span>{session.location}</span>}
          </div>
          {joinState.kind === 'no_link' && (
            <p className={`rounded-xl border border-sky-200/85 bg-sky-50/90 font-bold leading-relaxed text-sky-950 ${compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-2 text-[11px]'}`}>
              {joinState.label}
            </p>
          )}
        </div>

        <div className={`flex shrink-0 flex-col gap-2 ${compact ? 'sm:items-end' : 'sm:items-end'}`}>
          {joinState.kind === 'join' && (
            <button
              type="button"
              onClick={() => void handleJoin()}
              disabled={joining}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-xs font-black text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-700 disabled:opacity-60 ${compact ? 'px-3 py-1.5' : 'px-4 py-2.5'}`}
            >
              {joining ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
              {joinState.label}
            </button>
          )}
          {joinState.kind === 'waiting' && (
            <span className={`inline-flex items-center justify-center rounded-xl bg-amber-50 text-xs font-black text-amber-800 ring-1 ring-amber-100 ${compact ? 'px-3 py-1.5' : 'px-4 py-2.5'}`}>
              {joinState.label}
            </span>
          )}
          {joinState.kind === 'cancelled' && (
            <span className={`inline-flex items-center justify-center rounded-xl bg-rose-50 text-xs font-black text-rose-700 ring-1 ring-rose-100 ${compact ? 'px-3 py-1.5' : 'px-4 py-2.5'}`}>
              {joinState.label}
            </span>
          )}
          {joinState.kind === 'ended' && (
            <span className={`inline-flex items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500 ring-1 ring-slate-200 ${compact ? 'px-3 py-1.5' : 'px-4 py-2.5'}`}>
              {joinState.label}
            </span>
          )}
          {joinState.kind === 'offline' && (
            <span className={`inline-flex items-center justify-center rounded-xl border border-deepBlue/10 bg-slate-50 text-xs font-black text-deepBlue ${compact ? 'px-3 py-1.5' : 'px-4 py-2.5'}`}>
              {joinState.label}
            </span>
          )}
          {showRecording && session.recording_link && (
            <a
              href={session.recording_link}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-deepBlue/10 bg-white text-xs font-black text-deepBlue transition hover:border-customOrange/40 hover:text-customOrange ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}
            >
              <Video size={14} />
              مشاهدة التسجيل
              <ExternalLink size={11} className="opacity-50" />
            </a>
          )}
        </div>
      </div>
    </motion.article>
  )
}

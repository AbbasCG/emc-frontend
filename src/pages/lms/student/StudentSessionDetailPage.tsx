import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { fetchStudentSessionDetail, type LmsSessionEvent } from '@/api/placementApi'
import { BackButton } from '@/components/shared/BackButton'
import SessionStatusBadge from '@/components/sessions/SessionStatusBadge'
import { formatWallClockDMY, formatWallClockTime24 } from '@/utils/amsterdamTime'

/**
 * Student-facing session detail. Deliberately never renders instructor
 * permissions, transition buttons, delete/edit actions, or other students'
 * attendance — this is read-only, student-scoped information only. The join
 * button is shown strictly when the backend says join_allowed && url is set;
 * access is never inferred from status here.
 */
export default function StudentSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<LmsSessionEvent | null>(null)
  const [loading, setLoading] = useState(true)

  // Re-arm the loading state during render when the session changes (react.dev
  // "adjusting state when a prop changes") — the initial state is already `true`, so the
  // effect below never touches state synchronously.
  const [seenSessionId, setSeenSessionId] = useState(sessionId)
  if (seenSessionId !== sessionId) {
    setSeenSessionId(sessionId)
    if (sessionId) setLoading(true)
  }

  useEffect(() => {
    if (!sessionId) return
    fetchStudentSessionDetail(Number(sessionId)).then(setSession).finally(() => setLoading(false))
  }, [sessionId])

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      <BackButton to="/dashboard/student/calendar" />

      {loading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
      ) : !session ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-[14px] font-black text-deepBlue">تعذّر العثور على هذه الجلسة</p>
          <p className="mt-1 text-[11px] font-semibold text-deepBlue/40">قد تكون غير موجودة أو غير متاحة لك.</p>
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-deepBlue via-[#1a2d44] to-customBlue px-6 py-6 shadow-[0_20px_50px_-20px_rgba(12,42,75,0.5)] sm:px-8">
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                  {session.class_group?.name ?? ''} {session.course?.title ? `· ${session.course.title}` : ''}
                </p>
                <h1 className="mt-0.5 text-[1.4rem] font-black leading-tight text-white">{session.title}</h1>
                <p className="mt-1 font-mono text-[12px] font-semibold text-white/60">
                  {formatWallClockDMY(session.date)} · {formatWallClockTime24(session.start_time)}–{formatWallClockTime24(session.end_time)}
                </p>
                {session.instructor?.name && <p className="mt-0.5 text-[11px] font-semibold text-white/50">المدرّب: {session.instructor.name}</p>}
              </div>
              <SessionStatusBadge status={session.status} className="!text-[11px]" />
            </div>
          </motion.div>

          {session.description && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-[12px] font-semibold text-deepBlue/70">
              {session.description}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black text-deepBlue/50">الموقع والاجتماع</p>
              <p className="mt-2 text-[12px] font-semibold text-deepBlue/70">{session.location ?? 'عبر الإنترنت'}</p>
              {session.meeting.join_allowed && session.meeting.url ? (
                <a href={session.meeting.url} target="_blank" rel="noreferrer"
                  className="mt-3 flex w-fit items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-700">
                  <ExternalLink className="h-3.5 w-3.5" /> الانضمام للجلسة
                </a>
              ) : (
                <p className="mt-3 text-[11px] font-semibold text-deepBlue/35">رابط الاجتماع غير متاح حالياً</p>
              )}
              {session.recording_url && (
                <a href={session.recording_url} target="_blank" rel="noreferrer" className="mt-2 block text-[11px] font-bold text-[#0077B6] underline">
                  عرض التسجيل
                </a>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black text-deepBlue/50">المواد التعليمية</p>
              <p className="mt-2 text-[12px] font-semibold text-deepBlue/70">{session.materials_count} مادة مرتبطة بهذه الجلسة</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

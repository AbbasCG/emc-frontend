import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Megaphone } from 'lucide-react'
import { fetchStudentClassAnnouncements, type ClassAnnouncementRow } from '@/api/placementApi'
import { BackButton } from '@/components/shared/BackButton'
import { formatAmsterdamDMY, formatAmsterdamTime24 } from '@/utils/amsterdamTime'

const PRIORITY_LABEL: Record<string, string> = { normal: 'عادي', important: 'مهم', urgent: 'عاجل' }
const PRIORITY_CLS: Record<string, string> = {
  normal: 'bg-slate-100 text-slate-600', important: 'bg-amber-50 text-amber-700', urgent: 'bg-red-50 text-red-700',
}

/**
 * Student surface for GET /api/student/classes/{group}/announcements —
 * backend already scopes this to published announcements for active class
 * members only (403 for any other student). This page renders the raw
 * response and never invents visibility rules on top of it.
 */
export default function StudentClassAnnouncementsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const [announcements, setAnnouncements] = useState<ClassAnnouncementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  // Re-arm the loading state during render when the class changes (react.dev
  // "adjusting state when a prop changes") — the initial state already carries the
  // first pass's values, so the effect below never touches state synchronously.
  const [seenGroupId, setSeenGroupId] = useState(groupId)
  if (seenGroupId !== groupId) {
    setSeenGroupId(groupId)
    if (groupId) {
      setLoading(true)
      setForbidden(false)
    }
  }

  useEffect(() => {
    if (!groupId) return
    fetchStudentClassAnnouncements(Number(groupId))
      .then(setAnnouncements)
      .catch((err) => {
        if (err?.response?.status === 403) setForbidden(true)
      })
      .finally(() => setLoading(false))
  }, [groupId])

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      <BackButton to="/dashboard/student/courses" />
      <h1 className="text-[1.2rem] font-black text-deepBlue">إعلانات الصف</h1>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : forbidden ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <p className="text-[13px] font-semibold text-deepBlue/40">أنت لست عضوًا نشطًا في هذا الصف.</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-[13px] font-semibold text-deepBlue/40">لا توجد إعلانات لهذا الصف بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[13px] font-black text-deepBlue">{a.title}</p>
                <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black ${PRIORITY_CLS[a.priority] ?? PRIORITY_CLS.normal}`}>
                  {PRIORITY_LABEL[a.priority] ?? a.priority}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-line text-[11.5px] font-semibold text-deepBlue/70">{a.body}</p>
              {a.published_at && (
                <p className="mt-1.5 font-mono text-[10px] font-bold text-deepBlue/40">
                  {formatAmsterdamDMY(a.published_at)} · {formatAmsterdamTime24(a.published_at)}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

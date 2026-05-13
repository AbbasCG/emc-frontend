import axios from 'axios'
import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { fetchInstructorSessions } from '@/api/instructorApi'
import type { LmsSession } from '@/types/lms'
import { DashboardSection } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, SessionCard } from '@/components/lms'

export default function InstructorSessionsPage() {
  const [sessions, setSessions] = useState<LmsSession[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)

  useEffect(() => {
    let alive = true
    fetchInstructorSessions()
      .then((rows) => {
        if (alive) setSessions(rows)
      })
      .catch((err) => {
        if (!alive || axios.isCancel(err)) return
        setApiMissing(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const upcoming = sessions.filter((s) => s.status !== 'completed')
  const past = sessions.filter((s) => s.status === 'completed')

  if (loading) return <LmsPageSkeleton />

  return (
    <div className="space-y-10">
      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          تحقق من <code className="rounded bg-white/80 px-1">GET /api/instructor/sessions</code>.
        </div>
      )}

      <DashboardSection title="جلسات قادمة">
        {upcoming.length === 0 ? (
          <LmsEmptyState
            icon={Calendar}
            title="لا توجد جلسات مجدولة"
            description="ستُعرض الجلسات المرتبطة بدوراتك هنا."
          />
        ) : (
          <div className="grid gap-4">
            {upcoming.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </DashboardSection>

      <DashboardSection title="جلسات منتهية">
        {past.length === 0 ? (
          <LmsEmptyState icon={Calendar} title="لا يوجد سجل بعد" description="—" />
        ) : (
          <div className="grid gap-4">
            {past.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </DashboardSection>
    </div>
  )
}

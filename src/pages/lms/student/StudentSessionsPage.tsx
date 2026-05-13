import axios from 'axios'
import { useEffect, useState } from 'react'
import { CalendarClock, History } from 'lucide-react'
import { fetchStudentSessions } from '@/api/studentApi'
import type { LmsSession } from '@/types/lms'
import { DashboardSection } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, SessionCard } from '@/components/lms'

export default function StudentSessionsPage() {
  const [upcoming, setUpcoming] = useState<LmsSession[]>([])
  const [completed, setCompleted] = useState<LmsSession[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)

  useEffect(() => {
    let alive = true
    fetchStudentSessions()
      .then((data) => {
        if (!alive) return
        setUpcoming(data.upcoming)
        setCompleted(data.completed)
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

  if (loading) return <LmsPageSkeleton />

  return (
    <div className="space-y-10">
      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          واجهة <code className="rounded bg-white/80 px-1">GET /api/student/sessions</code> غير متاحة —
          يعرض الواجهة حالة فارغة حتى يتوفر الخادم.
        </div>
      )}

      <DashboardSection title="الجلسات القادمة" subtitle="روابط الدخول والتفاصيل لكل جلسة مجدولة.">
        {upcoming.length === 0 ? (
          <LmsEmptyState
            icon={CalendarClock}
            title="لا توجد جلسات قادمة"
            description="ستظهر جلساتك هنا فور جدولتها ضمن دوراتك."
          />
        ) : (
          <div className="grid gap-4">
            {upcoming.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </DashboardSection>

      <DashboardSection title="جلسات مكتملة" subtitle="سجلّ التسجيلات والروابط بعد انتهاء الجلسة.">
        {completed.length === 0 ? (
          <LmsEmptyState
            icon={History}
            title="لا توجد جلسات مكتملة بعد"
            description="بعد حضور الجلسات ستجد روابط التسجيل هنا إن وُفرت."
          />
        ) : (
          <div className="grid gap-4">
            {completed.map((s) => (
              <SessionCard key={s.id} session={s} showRecording />
            ))}
          </div>
        )}
      </DashboardSection>
    </div>
  )
}

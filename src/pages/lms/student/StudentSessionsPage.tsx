import { CalendarClock, History, RefreshCw } from 'lucide-react'
import { DashboardSection } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, SessionCard } from '@/components/lms'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { StudentBackButton } from '@/components/shared/StudentBackButton'

export default function StudentSessionsPage() {
  const { loading, refreshing, loadError, refresh, sessionsUpcoming, sessionsCompleted, registrations } =
    useStudentDashboardData()

  if (loading && sessionsUpcoming.length === 0 && sessionsCompleted.length === 0) {
    return <LmsPageSkeleton />
  }

  return (
    <div className="space-y-10 text-right rtl" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-[1.35rem] border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.04]">
        <div>
          <h1 className="text-xl font-black text-deepBlue">جلساتي</h1>
          <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-relaxed text-muted-700">
            جلسات مجمّعة من <span className="font-mono text-[11px]">GET /student/sessions</span> ولوحة الطالب، ومقيّدة بدوراتك
            المسجّلة ({registrations.length} تسجيل).
          </p>
          {loadError ?
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-950">
              {loadError}
            </p>
          : null}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-2xl border border-deepBlue/10 bg-deepBlue/[0.04] px-4 py-2 text-[11px] font-black text-deepBlue transition hover:bg-deepBlue/[0.07] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          تحديث
        </button>
      </header>

      <StudentBackButton fallback="/dashboard/student" label="العودة إلى لوحة الطالب" />

      <DashboardSection title="الجلسات القادمة" subtitle="روابط الدخول والتفاصيل لكل جلسة مجدولة لدوراتك.">
        {sessionsUpcoming.length === 0 ?
          <LmsEmptyState
            icon={CalendarClock}
            title="لا توجد جلسات قادمة"
            description="ستظهر الجلسات هنا بعد جدولتها ضمن دوراتك المسجّلة."
          />
        : <div className="grid gap-4">
            {sessionsUpcoming.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        }
      </DashboardSection>

      <DashboardSection title="جلسات مكتملة" subtitle="سجلّ الجلسات التي أنهيتها ضمن دوراتك.">
        {sessionsCompleted.length === 0 ?
          <LmsEmptyState
            icon={History}
            title="لا توجد جلسات مكتملة بعد"
            description="عند انتهاء الجلسات ستُعرض هنا مع روابط التسجيل إن وُجدت."
          />
        : <div className="grid gap-4">
            {sessionsCompleted.map((s) => (
              <SessionCard key={s.id} session={s} showRecording />
            ))}
          </div>
        }
      </DashboardSection>
    </div>
  )
}

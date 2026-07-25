import { BookOpen, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { DashboardSection, ProgressCard } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, ProgressRing } from '@/components/lms'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { StudentBackButton } from '@/components/shared/StudentBackButton'

export default function StudentProgressPage() {
  const { loading, refreshing, loadError, refresh, progressMerged, registrations } = useStudentDashboardData()

  const courseProgress = Array.isArray(progressMerged.course_progress) ? progressMerged.course_progress : []
  const trackProgress =
    progressMerged.track_progress && Array.isArray(progressMerged.track_progress) ? progressMerged.track_progress : []

  const attendancePercent = Number.isFinite(progressMerged.attendance_percent) ? progressMerged.attendance_percent : 0
  const assignmentPercent =
    Number.isFinite(progressMerged.overall_assignment_completion) ? progressMerged.overall_assignment_completion : 0

  if (loading && courseProgress.length === 0 && registrations.length === 0) {
    return (
      <div className="space-y-4 text-right rtl" dir="rtl">
        <p className="text-sm font-bold text-slate-500">جاري تحميل التقدّم...</p>
        <LmsPageSkeleton />
      </div>
    )
  }

  const hasTracks = trackProgress.length > 0
  const hasCourses = courseProgress.length > 0

  return (
    <div className="space-y-10 text-right rtl" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-[1.35rem] border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.04]">
        <div>
          <h1 className="text-xl font-black text-deepBlue">التقدّم</h1>
          <p className="mt-2 max-w-2xl text-[13px] font-semibold text-muted-700">
            متابعة تقدّمك في جميع الدورات والمسارات التعليمية المسجّلة.
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

      <div className="flex flex-col items-center justify-between gap-8 rounded-[1.35rem] bg-white p-8 shadow-lg ring-1 ring-deepBlue/[0.05] lg:flex-row-reverse">
        <div className="text-center lg:text-right">
          <h2 className="text-2xl font-black text-deepBlue">مؤشرات موجزة</h2>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-slate-600">
            نسبة إجمالية لحضورك وإتمام الواجبات عبر دوراتك.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-10">
          <ProgressRing percent={attendancePercent} label="حضور" sublabel="نسبة الحضور الإجمالية" />
          <ProgressRing percent={assignmentPercent} label="واجبات" sublabel="إتمام الواجبات" />
        </div>
      </div>

      {hasTracks && (
        <DashboardSection title="تقدم المسارات">
          <div className="grid gap-4 sm:grid-cols-2">
            {trackProgress.map((t) => (
              <ProgressCard
                key={t.track_id}
                title={t.title}
                current={t.progress_percent}
                total={100}
                unit=""
                color="orange"
              />
            ))}
          </div>
        </DashboardSection>
      )}

      <DashboardSection title="تقدم الدورات المسجّلة">
        {!hasCourses ?
          <LmsEmptyState
            icon={BookOpen}
            title="لا توجد دورات مسجّلة بعد"
            description="سجّل في دورة ثم عد لهذه الصفحة لمتابعة التقدّم الحقيقي."
          />
        : <div className="grid gap-4 lg:grid-cols-2">
            {courseProgress.map((c) => (
              <motion.div
                key={c.course_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.06]"
              >
                <div className="flex flex-col gap-6 sm:flex-row-reverse sm:items-center sm:justify-between">
                  <ProgressRing percent={c.progress_percent} size={100} stroke={8} />
                  <div className="min-w-0 flex-1 text-right">
                    <h3 className="font-black text-deepBlue">{c.course_title}</h3>
                    <div className="mt-4 grid gap-3 text-xs font-bold text-slate-600">
                      <p>
                        الجلسات: {c.sessions_completed} / {c.sessions_total}
                      </p>
                      <p>
                        الواجبات: {c.assignments_done} / {c.assignments_total}
                      </p>
                      {c.slug ?
                        <Link className="text-customBlue hover:underline" to={`/courses/${c.slug}`}>
                          صفحة الدورة العامة
                        </Link>
                      : null}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        }
      </DashboardSection>
    </div>
  )
}

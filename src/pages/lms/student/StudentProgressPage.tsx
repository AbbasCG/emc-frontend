import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { BookOpen, PieChart } from 'lucide-react'
import { motion } from 'framer-motion'
import { fetchStudentProgress } from '@/api/studentApi'
import type { StudentProgressPayload } from '@/types/lms'
import { DashboardSection, ProgressCard } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, ProgressRing } from '@/components/lms'

export default function StudentProgressPage() {
  const [data, setData] = useState<StudentProgressPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetchStudentProgress()
      .then((row) => {
        if (!alive) return
        setData(row)
        setError(null)
      })
      .catch((err) => {
        if (!alive || axios.isCancel(err)) return
        setData(null)
        setError('تعذر تحميل بيانات التقدم')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const courseProgress = useMemo(
    () => (data && Array.isArray(data.course_progress) ? data.course_progress : []),
    [data],
  )
  const trackProgress = useMemo(
    () =>
      data && Array.isArray(data.track_progress) && data.track_progress.length > 0 ?
        data.track_progress
      : [],
    [data],
  )

  const attendancePercent = data && Number.isFinite(data.attendance_percent) ? data.attendance_percent : 0
  const assignmentPercent =
    data && Number.isFinite(data.overall_assignment_completion) ? data.overall_assignment_completion : 0

  if (loading) {
    return (
      <div className="space-y-4 text-right">
        <p className="text-sm font-bold text-slate-500">جاري تحميل التقدم...</p>
        <LmsPageSkeleton />
      </div>
    )
  }

  if (error || !data) {
    return (
      <LmsEmptyState
        icon={PieChart}
        title={error ?? 'تعذر تحميل بيانات التقدم'}
        description="تحقّق من الاتصال بالخادم أو حاول مرة أخرى لاحقًا."
      />
    )
  }

  const hasTracks = trackProgress.length > 0
  const hasCourses = courseProgress.length > 0

  return (
    <div className="space-y-10">
      <div className="flex flex-col items-center justify-between gap-8 rounded-[1.35rem] bg-white p-8 shadow-lg ring-1 ring-deepBlue/[0.05] lg:flex-row-reverse">
        <div className="text-center lg:text-right">
          <h2 className="text-2xl font-black text-deepBlue">مؤشرات التقدم</h2>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-slate-600">
            نظرة موحّدة على الحضور، الواجبات، والجلسات ضمن منظومة EMC.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-10">
          <ProgressRing
            percent={attendancePercent}
            label="حضور"
            sublabel="نسبة الحضور الإجمالية"
          />
          <ProgressRing
            percent={assignmentPercent}
            label="واجبات"
            sublabel="إتمام الواجبات"
          />
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

      <DashboardSection title="تقدم الدورات">
        {!hasCourses ?
          <LmsEmptyState
            icon={BookOpen}
            title="لا توجد بيانات تقدم متاحة حاليًا"
            description="عندما تكون مسجلاً في دورة نشطة، ستُعرض تفاصيل الجلسات والواجبات هنا."
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

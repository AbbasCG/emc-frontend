import axios from 'axios'
import { useEffect, useState } from 'react'
import { BookOpen, PieChart } from 'lucide-react'
import { motion } from 'framer-motion'
import { fetchStudentProgress } from '@/api/studentApi'
import type { StudentProgressPayload } from '@/types/lms'
import { DashboardSection, ProgressCard } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, ProgressRing } from '@/components/lms'

export default function StudentProgressPage() {
  const [data, setData] = useState<StudentProgressPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)

  useEffect(() => {
    let alive = true
    fetchStudentProgress()
      .then((row) => {
        if (alive) setData(row)
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

  if (!data && apiMissing) {
    return (
      <div className="space-y-6">
        {import.meta.env.DEV && (
          <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
            يتطلب الخادم <code className="rounded bg-white/80 px-1">GET /api/student/progress</code>.
          </div>
        )}
        <LmsEmptyState
          icon={PieChart}
          title="لا توجد بيانات تقدم"
          description="عند ربط حسابك بدورة نشطة ستُحسب نسب الإنجاز والحضور هنا."
        />
      </div>
    )
  }

  const payload = data ?? {
    course_progress: [],
    attendance_percent: 0,
    overall_assignment_completion: 0,
  }

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
            percent={payload.attendance_percent}
            label="حضور"
            sublabel="نسبة الحضور الإجمالية"
          />
          <ProgressRing
            percent={payload.overall_assignment_completion}
            label="واجبات"
            sublabel="إتمام الواجبات"
          />
        </div>
      </div>

      {payload.track_progress && payload.track_progress.length > 0 && (
        <DashboardSection title="تقدم المسارات">
          <div className="grid gap-4 sm:grid-cols-2">
            {payload.track_progress.map((t) => (
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
        {payload.course_progress.length === 0 ? (
          <LmsEmptyState
            icon={BookOpen}
            title="لا توجد دورات ضمن التقرير"
            description="سجّل في دورة أو أكمل تفعيل التسجيل لعرض التفاصيل."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {payload.course_progress.map((c) => (
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
        )}
      </DashboardSection>
    </div>
  )
}

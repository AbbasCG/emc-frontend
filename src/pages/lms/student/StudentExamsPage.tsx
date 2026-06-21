import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Award, CheckCircle, ClipboardCheck, MessageSquare } from 'lucide-react'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import {
  fetchPlacementStatus,
  getLevelFromScore,
  PLACEMENT_LEVELS,
  type PlacementAttempt,
} from '@/api/placementApi'

type AttemptRow = {
  courseId: number
  courseTitle: string
  attempt: PlacementAttempt
}

const STATUS_LABEL: Record<string, string> = {
  written_submitted: 'الاختبار الكتابي مكتمل',
  oral_booked:       'المقابلة الشفوية محجوزة',
  oral_completed:    'المقابلة الشفوية مكتملة',
  completed:         'مكتمل',
}

const STATUS_COLOR: Record<string, string> = {
  written_submitted: 'bg-amber-100 text-amber-700',
  oral_booked:       'bg-customBlue/10 text-customBlue',
  oral_completed:    'bg-blue-100 text-blue-700',
  completed:         'bg-emerald-100 text-emerald-700',
}

const DONE_STATUSES = new Set(['written_submitted', 'oral_booked', 'oral_completed', 'completed'])

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function StudentExamsPage() {
  const { enrollmentsMerged, loading: enrollLoading } = useStudentDashboardData()
  const [rows, setRows]       = useState<AttemptRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for enrollments to arrive
    if (enrollLoading) return

    const placementCourses = enrollmentsMerged.filter((e) => {
      const cx = e.course as Record<string, unknown>
      return !!(cx.requires_placement_test || cx.requires_placement)
    })

    if (placementCourses.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)
    void Promise.all(
      placementCourses.map(async (e) => {
        const { attempt } = await fetchPlacementStatus(e.course.id)
        if (!attempt || !DONE_STATUSES.has(attempt.status)) return null
        return {
          courseId:    e.course.id,
          courseTitle: e.course.title,
          attempt,
        } satisfies AttemptRow
      }),
    ).then((results) => {
      setRows(results.filter((r): r is AttemptRow => r !== null))
      setLoading(false)
    })
  }, [enrollmentsMerged, enrollLoading])

  return (
    <div className="space-y-6 pb-16 text-right" dir="rtl">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-deepBlue via-[#1f3046] to-customBlue px-6 py-7 shadow-[0_20px_50px_-20px_rgba(12, 42, 75,0.5)] sm:px-10"
      >
        <div aria-hidden className="pointer-events-none absolute -left-20 top-0 h-48 w-48 rounded-full bg-amber-400/15 blur-[90px]" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">مركز الاختبارات</p>
          <h1 className="mt-1 text-[1.7rem] font-black leading-tight text-white">اختباراتي</h1>
          <p className="mt-2 max-w-md text-[13px] font-semibold leading-relaxed text-white/75">
            نتائج اختبارات تحديد المستوى التي أكملتها — درجاتك ومستوياتك وحالة المقابلات.
          </p>
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-deepBlue/[0.07] bg-white px-8 py-14 text-center shadow-sm"
        >
          <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" aria-hidden />
          <p className="mt-5 text-[16px] font-black text-deepBlue">لا توجد اختبارات مكتملة بعد</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] font-semibold leading-relaxed text-deepBlue/50">
            اختبارات تحديد المستوى تظهر هنا بعد إكمالها. الاختبارات المطلوبة تظهر على بطاقة الدورة.
          </p>
          <Link
            to="/dashboard/student/courses"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-customBlue px-6 py-2.5 text-[12px] font-black text-white shadow-md transition hover:brightness-105"
          >
            عرض دوراتي
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {rows.map(({ courseId, courseTitle, attempt }, i) => {
            const score  = attempt.written_score ?? 0
            const total  = attempt.total_questions ?? 70
            const pct    = total > 0 ? Math.round((score / total) * 100) : 0
            const level  = getLevelFromScore(score, total)
            const lvlDef = PLACEMENT_LEVELS.find((l) => l.level === level.level)

            return (
              <motion.div
                key={attempt.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="overflow-hidden rounded-3xl border border-deepBlue/[0.06] bg-white shadow-sm"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-deepBlue/[0.05] px-5 py-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-deepBlue/35">
                      اختبار تحديد المستوى
                    </p>
                    <h2 className="mt-0.5 text-[15px] font-black text-deepBlue">{courseTitle}</h2>
                    {attempt.created_at && (
                      <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/45">
                        بتاريخ: {formatDate(attempt.created_at)}
                      </p>
                    )}
                  </div>
                  <span className={`self-start rounded-xl px-3 py-1 text-[11px] font-black ${STATUS_COLOR[attempt.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABEL[attempt.status] ?? attempt.status}
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-deepBlue/[0.05] sm:grid-cols-4">
                  {/* Score */}
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-deepBlue/35">الدرجة</p>
                    <p className="mt-1 font-mono text-[22px] font-black tabular-nums text-deepBlue">
                      {score}
                      <span className="text-[13px] text-deepBlue/35">/{total}</span>
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-l from-customBlue to-customBlue/70"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut', delay: i * 0.04 + 0.1 }}
                      />
                    </div>
                    <p className="mt-1 font-mono text-[10px] font-black tabular-nums text-deepBlue/40">{pct}%</p>
                  </div>

                  {/* Level */}
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-deepBlue/35">المستوى التقديري</p>
                    <p className="mt-1 text-[15px] font-black text-deepBlue">{level.label}</p>
                    {lvlDef && (
                      <p className="mt-0.5 text-[10px] font-semibold text-deepBlue/45 leading-snug">{lvlDef.description}</p>
                    )}
                  </div>

                  {/* Oral booking */}
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-deepBlue/35">المقابلة الشفوية</p>
                    {attempt.oral_booking_at ? (
                      <>
                        <div className="mt-1 flex items-center gap-1.5 text-customBlue">
                          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                          <span className="text-[12px] font-black">محجوزة</span>
                        </div>
                        <p className="mt-0.5 text-[10px] font-semibold text-deepBlue/45">
                          {formatDate(attempt.oral_booking_at)}
                        </p>
                      </>
                    ) : attempt.status === 'written_submitted' ? (
                      <Link
                        to={`/dashboard/student/courses/${courseId}/oral-booking`}
                        className="mt-1 inline-flex items-center gap-1 rounded-xl bg-customBlue/10 px-2.5 py-1.5 text-[11px] font-black text-customBlue transition hover:bg-customBlue/15"
                      >
                        <MessageSquare className="h-3 w-3" aria-hidden />
                        احجز الآن
                      </Link>
                    ) : (
                      <p className="mt-1 text-[12px] font-semibold text-deepBlue/35">—</p>
                    )}
                  </div>

                  {/* Final level */}
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-deepBlue/35">المستوى النهائي</p>
                    {attempt.final_level ? (
                      <>
                        <div className="mt-1 flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle className="h-4 w-4" aria-hidden />
                          <span className="text-[14px] font-black">{attempt.final_level}</span>
                        </div>
                        {attempt.oral_score != null && (
                          <p className="mt-0.5 text-[10px] font-semibold text-deepBlue/45">
                            درجة المقابلة: {attempt.oral_score}
                          </p>
                        )}
                      </>
                    ) : attempt.status === 'oral_completed' ? (
                      <p className="mt-1 text-[12px] font-semibold text-amber-600">بانتظار اعتماد المستوى</p>
                    ) : attempt.status === 'completed' ? (
                      <div className="mt-1 flex items-center gap-1.5 text-emerald-600">
                        <Award className="h-4 w-4" aria-hidden />
                        <span className="text-[13px] font-black">مكتمل</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-[12px] font-semibold text-deepBlue/35">في انتظار المدرب</p>
                    )}
                  </div>
                </div>

                {/* Action footer */}
                <div className="border-t border-deepBlue/[0.04] px-5 py-3">
                  <Link
                    to={`/dashboard/student/courses/${courseId}/placement-result`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-black text-customBlue transition hover:text-deepBlue"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                    عرض التفاصيل الكاملة
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import StudentMyCourseCard from '@/components/dashboard/StudentMyCourseCard'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import type { Course, Enrollment } from '@/types'
import { useMemo, useState } from 'react'

function hasScheduledDate(course: Course): boolean {
  const d = course.start_date
  if (d == null) return false
  const s = String(d).trim()
  if (s === '' || s === '—') return false
  return true
}

function isFutureScheduledStart(course: Course): boolean {
  if (!hasScheduledDate(course)) return false
  const t = new Date(String(course.start_date)).getTime()
  if (Number.isNaN(t)) return false
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  return t > endOfToday.getTime()
}

type CoursesTabId = 'active' | 'upcoming' | 'completed' | 'pending'

/** Place each enrollment in exactly one tab (RTL labels: نشطة / قادمة / مكتملة / معلّقة). */
function tabForEnrollment(e: Enrollment): CoursesTabId {
  if (e.status === 'pending') return 'pending'
  if (e.status === 'completed') return 'completed'
  const started = e.completed_sessions > 0
  const waitingSchedule = !hasScheduledDate(e.course) || isFutureScheduledStart(e.course)
  if (!started && waitingSchedule) return 'upcoming'
  return 'active'
}

export default function StudentMyCoursesPage() {
  const {
    loading,
    refreshing,
    loadError,
    refresh,
    enrollmentsMerged,
    sessionsUpcoming,
    lmsDashboard,
  } = useStudentDashboardData()

  const [tab, setTab] = useState<CoursesTabId>('active')

  const buckets = useMemo(() => {
    const grouped: Record<CoursesTabId, Enrollment[]> = {
      active: [],
      upcoming: [],
      completed: [],
      pending: [],
    }
    for (const e of enrollmentsMerged) {
      grouped[tabForEnrollment(e)].push(e)
    }
    return grouped
  }, [enrollmentsMerged])

  const currentCourses = useMemo(() => enrollmentsMerged.filter((e) => e.status !== 'completed').length, [enrollmentsMerged])
  const completedCourses = buckets.completed.length

  const certCount =
    Array.isArray(lmsDashboard.certificates_placeholder) ? lmsDashboard.certificates_placeholder.length : 0

  const fatalError =
    loadError &&
    enrollmentsMerged.length === 0 &&
    !loading

  const tabLabels: Record<CoursesTabId, string> = {
    active: 'نشطة',
    upcoming: 'قادمة',
    completed: 'مكتملة',
    pending: 'معلّقة',
  }

  return (
    <div className="space-y-8 pb-16 text-right rtl" dir="rtl">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-bl from-deepBlue via-[#1f3046] to-customBlue px-6 py-8 shadow-[0_28px_60px_-28px_rgba(34,51,74,0.55)] sm:px-10 sm:py-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-customOrange/25 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-16 h-64 w-64 rounded-full bg-white/12 blur-[90px]"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/65">مسارات التعلّم</p>
            <h1 className="text-[1.85rem] font-black leading-[1.12] text-white sm:text-[2.1rem]">دوراتي</h1>
            <p className="max-w-xl text-[14px] font-semibold leading-relaxed text-white/85">
              الدورات التي سجلت بها ومتابعة تقدمك التعليمي — كل البيانات مربوطة بحسابك على المنصّة.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard/student/available-courses"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-customOrange px-5 py-3 text-[12px] font-black text-white shadow-lg shadow-orange-900/25 transition hover:brightness-105"
            >
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              استكشاف دورات جديدة
            </Link>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading || refreshing}
              className="rounded-2xl border border-white/35 bg-white/10 px-5 py-3 text-[12px] font-black text-white backdrop-blur transition hover:bg-white/18 disabled:opacity-55"
            >
              {refreshing ? 'جارٍ التحديث…' : 'تحديث'}
            </button>
          </div>
        </div>
      </motion.section>

      {/* Fatal sync error only */}
      {fatalError ?
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50/95 via-white to-white p-8 text-center shadow-lg ring-1 ring-red-100/80"
          role="alert"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-700">
            <AlertCircle className="h-7 w-7" aria-hidden />
          </div>
          <p className="text-lg font-black text-deepBlue">لم نتمكن من تحميل دوراتك</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] font-semibold leading-relaxed text-deepBlue/65">
            {loadError ?? 'تحقّق من اتصالك ثم حاول مرة أخرى.'}
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-6 rounded-2xl bg-customBlue px-8 py-3 text-[13px] font-black text-white shadow-md transition hover:brightness-105"
          >
            إعادة المحاولة
          </button>
        </motion.div>
      : null}

      {!fatalError ?
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                Icon: Layers,
                label: 'الدورات الحالية',
                value: String(currentCourses),
                accent: 'from-customBlue/18 to-transparent',
              },
              {
                Icon: BookOpen,
                label: 'الدورات المكتملة',
                value: String(completedCourses),
                accent: 'from-emerald-500/15 to-transparent',
              },
              {
                Icon: Calendar,
                label: 'الجلسات القادمة',
                value: String(sessionsUpcoming.length),
                accent: 'from-customOrange/18 to-transparent',
              },
              {
                Icon: Award,
                label: 'شهادات متاحة',
                value: String(certCount),
                accent: 'from-amber-400/22 to-transparent',
              },
            ].map(({ Icon, label, value, accent }) => (
              <div
                key={label}
                className="relative overflow-hidden rounded-3xl border border-deepBlue/[0.06] bg-white p-5 shadow-emc ring-1 ring-deepBlue/[0.03]"
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-bl ${accent} opacity-95`}
                />
                <Icon className="relative mb-4 h-5 w-5 text-customBlue" aria-hidden />
                <p className="relative text-[13px] font-bold text-deepBlue/58">{label}</p>
                <p className="relative mt-1 text-3xl font-black tracking-tight text-deepBlue font-latin tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="rounded-3xl border border-deepBlue/[0.06] bg-white/[0.65] p-2 shadow-inner ring-1 ring-deepBlue/[0.03] backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-between">
              {(Object.keys(tabLabels) as CoursesTabId[]).map((id) => {
                const selected = tab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    role="tab"
                    aria-selected={selected}
                    className={`rounded-2xl px-4 py-3 text-center text-[12px] font-black transition sm:flex-1 ${
                      selected ?
                        'bg-gradient-to-bl from-deepBlue to-[#2a4460] text-white shadow-lg shadow-deepBlue/20'
                      : 'text-deepBlue/60 hover:bg-white/80 hover:text-deepBlue'
                    }`}
                  >
                    {tabLabels[id]}
                    <span className="mr-1.5 text-[11px] font-bold opacity-85">({buckets[id].length})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          {loading ?
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`sk-${String(i)}`}
                  className="flex h-[28rem] flex-col overflow-hidden rounded-3xl bg-slate-100/90 shadow-inner ring-1 ring-white animate-pulse"
                >
                  <div className="h-40 bg-gradient-to-bl from-slate-200 to-slate-100" />
                  <div className="flex-1 space-y-4 p-5">
                    <div className="h-5 w-[88%] rounded-xl bg-white/95" />
                    <div className="h-3 w-[55%] rounded-lg bg-white/85" />
                    <div className="h-12 w-full rounded-2xl bg-white/85" />
                    <div className="h-2 w-full rounded-full bg-white/95" />
                    <div className="h-10 w-full rounded-2xl bg-white/80" />
                  </div>
                </div>
              ))}
            </div>
          : enrollmentsMerged.length === 0 ?
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-deepBlue/[0.08] bg-gradient-to-br from-white via-sky-50/30 to-orange-50/25 px-8 py-16 text-center shadow-[0_28px_60px_-32px_rgba(38,145,194,0.35)] ring-1 ring-deepBlue/[0.04]"
            >
              <BookOpen className="mx-auto h-14 w-14 text-customBlue opacity-85" aria-hidden />
              <h2 className="mt-6 text-xl font-black text-deepBlue">لم تُسجّل في أي دورة بعد</h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] font-semibold leading-relaxed text-deepBlue/60">
                ابدأ رحلة التعلّم من قائمة الدورات المتاحة وستظهر بطاقاتك هنا بعد إتمام التسجيل.
              </p>
              <Link
                to="/dashboard/student/available-courses"
                className="mx-auto mt-8 inline-flex items-center gap-2 rounded-2xl bg-customOrange px-8 py-3.5 text-[13px] font-black text-white shadow-lg transition hover:brightness-105"
              >
                تصفّح الدورات المتاحة
              </Link>
            </motion.div>
          : buckets[tab].length === 0 ?
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-3xl border border-dashed border-deepBlue/15 bg-white/90 px-6 py-14 text-center"
            >
              <p className="text-[15px] font-black text-deepBlue">لا توجد دورات ضمن هذا التبويب حالياً</p>
              <p className="mx-auto mt-2 max-w-md text-[13px] font-semibold text-deepBlue/55">
                جرّب تبويبًا آخر أو عد لاحقاً بعد تحديث جدولك.
              </p>
            </motion.div>
          : (
            <motion.div layout className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {buckets[tab].map((e) => (
                <StudentMyCourseCard key={`e-${String(e.id)}-${String(e.course?.id ?? 0)}`} enrollment={e} />
              ))}
            </motion.div>
          )}
        </>
      : null}
    </div>
  )
}

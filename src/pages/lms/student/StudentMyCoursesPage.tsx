import {
  AlertCircle,
  Award,
  Bell,
  BookOpen,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Layers,
  RefreshCw,
  Sparkles,
  TrendingUp,
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
  return s !== '' && s !== '—'
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

function tabForEnrollment(e: Enrollment): CoursesTabId {
  if (e.status === 'pending') return 'pending'
  if (e.status === 'completed') return 'completed'
  const waitingSchedule = !hasScheduledDate(e.course) || isFutureScheduledStart(e.course)
  if (e.completed_sessions === 0 && waitingSchedule) return 'upcoming'
  return 'active'
}

const QUICK_ACTIONS = [
  { label: 'الدورات المتاحة', href: '/dashboard/student/available-courses', icon: Sparkles,      color: 'text-customOrange', bg: 'bg-orange-50 hover:bg-orange-100/80' },
  { label: 'اختباراتي',       href: '/dashboard/student/exams',             icon: ClipboardCheck, color: 'text-amber-600',   bg: 'bg-amber-50  hover:bg-amber-100/80'  },
  { label: 'جلساتي',          href: '/dashboard/student/sessions',          icon: Calendar,       color: 'text-customBlue',  bg: 'bg-blue-50   hover:bg-blue-100/80'   },
  { label: 'المواد',          href: '/dashboard/student/materials',         icon: FolderOpen,     color: 'text-teal-600',    bg: 'bg-teal-50   hover:bg-teal-100/80'   },
  { label: 'الواجبات',        href: '/dashboard/student/assignments',       icon: ClipboardList,  color: 'text-violet-600',  bg: 'bg-violet-50 hover:bg-violet-100/80' },
  { label: 'التقدم',          href: '/dashboard/student/progress',          icon: TrendingUp,     color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100/80' },
  { label: 'تقييم الدورة',    href: '/dashboard/student/course-rating',     icon: FileText,       color: 'text-rose-500',    bg: 'bg-rose-50   hover:bg-rose-100/80'   },
  { label: 'إشعاراتي',       href: '/dashboard/student/notifications',     icon: Bell,           color: 'text-deepBlue',    bg: 'bg-slate-50  hover:bg-slate-100/80'  },
] as const

const TAB_LABELS: Record<CoursesTabId, string> = {
  active:    'نشطة',
  upcoming:  'قادمة',
  completed: 'مكتملة',
  pending:   'معلّقة',
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
    const grouped: Record<CoursesTabId, Enrollment[]> = { active: [], upcoming: [], completed: [], pending: [] }
    for (const e of enrollmentsMerged) grouped[tabForEnrollment(e)].push(e)
    return grouped
  }, [enrollmentsMerged])

  const currentCourses  = useMemo(() => enrollmentsMerged.filter((e) => e.status !== 'completed').length, [enrollmentsMerged])
  const completedCourses = buckets.completed.length
  const certCount = Array.isArray(lmsDashboard.certificates_placeholder)
    ? lmsDashboard.certificates_placeholder.length
    : 0
  const fatalError = loadError && enrollmentsMerged.length === 0 && !loading

  return (
    <div className="space-y-6 pb-16 text-right" dir="rtl">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-deepBlue via-[#1f3046] to-customBlue px-6 py-7 shadow-[0_20px_50px_-20px_rgba(34,51,74,0.5)] sm:px-10"
      >
        <div aria-hidden className="pointer-events-none absolute -left-20 top-0 h-48 w-48 rounded-full bg-customOrange/20 blur-[90px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-12 h-52 w-52 rounded-full bg-white/10 blur-[80px]" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">مسارات التعلّم</p>
            <h1 className="text-[1.7rem] font-black leading-tight text-white sm:text-[2rem]">دوراتي</h1>
            <p className="max-w-md text-[13px] font-semibold leading-relaxed text-white/75">
              تابع دوراتك، اختباراتك، جلساتك، موادك، واجباتك، وتقدمك من مكان واحد.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Link
              to="/dashboard/student/available-courses"
              className="inline-flex items-center gap-2 rounded-2xl bg-customOrange px-4 py-2.5 text-[12px] font-black text-white shadow-md transition hover:brightness-105"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              استكشاف دورات جديدة
            </Link>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-2.5 text-[12px] font-black text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              {refreshing ? 'تحديث…' : 'تحديث'}
            </button>
          </div>
        </div>
      </motion.section>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="rounded-2xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon, color, bg }) => (
            <Link
              key={href}
              to={href}
              className={`flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center transition ${bg}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ${color}`}>
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="text-[10px] font-black leading-tight text-deepBlue/75">{label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Fatal error ───────────────────────────────────────────────────── */}
      {fatalError && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-red-100 bg-red-50/80 p-8 text-center"
          role="alert"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-600">
            <AlertCircle className="h-6 w-6" aria-hidden />
          </div>
          <p className="font-black text-deepBlue">لم نتمكن من تحميل دوراتك</p>
          <p className="mt-1 text-[13px] font-semibold text-deepBlue/60">{loadError ?? 'تحقّق من اتصالك وأعد المحاولة.'}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-5 rounded-2xl bg-customBlue px-6 py-2.5 text-[12px] font-black text-white transition hover:brightness-105"
          >
            إعادة المحاولة
          </button>
        </motion.div>
      )}

      {!fatalError && (
        <>
          {/* ── Stats ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { Icon: Layers,   label: 'الدورات الحالية',  value: currentCourses,         accent: 'bg-customBlue/8'  },
              { Icon: BookOpen, label: 'الدورات المكتملة', value: completedCourses,        accent: 'bg-emerald-500/8' },
              { Icon: Calendar, label: 'الجلسات القادمة',  value: sessionsUpcoming.length, accent: 'bg-amber-500/8'   },
              { Icon: Award,    label: 'شهادات متاحة',     value: certCount,               accent: 'bg-violet-500/8'  },
            ].map(({ Icon, label, value, accent }) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-2xl border border-deepBlue/[0.06] bg-white px-4 py-3.5 shadow-sm`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
                  <Icon className="h-5 w-5 text-deepBlue/60" aria-hidden />
                </div>
                <div>
                  <p className="font-mono text-[22px] font-black tabular-nums leading-none text-deepBlue">
                    {value}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/50">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter tabs ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2" role="tablist">
            {(Object.keys(TAB_LABELS) as CoursesTabId[]).map((id) => {
              const selected = tab === id
              const count = buckets[id].length
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(id)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2 text-[12px] font-black transition-all ${
                    selected
                      ? 'bg-deepBlue text-white shadow-md shadow-deepBlue/20'
                      : 'border border-deepBlue/[0.1] bg-white text-deepBlue/60 hover:border-deepBlue/20 hover:text-deepBlue'
                  }`}
                >
                  {TAB_LABELS[id]}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none tabular-nums ${
                      selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Course cards ─────────────────────────────────────────────── */}
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[26rem] animate-pulse overflow-hidden rounded-3xl bg-slate-100 ring-1 ring-white">
                  <div className="h-36 bg-gradient-to-bl from-slate-200 to-slate-100" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-4/5 rounded-xl bg-white/90" />
                    <div className="h-3 w-1/2 rounded-lg bg-white/80" />
                    <div className="h-10 rounded-2xl bg-white/80" />
                    <div className="h-2 rounded-full bg-white/90" />
                    <div className="h-9 rounded-2xl bg-white/75" />
                  </div>
                </div>
              ))}
            </div>
          ) : enrollmentsMerged.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-deepBlue/[0.07] bg-white px-8 py-16 text-center shadow-sm"
            >
              <BookOpen className="mx-auto h-12 w-12 text-customBlue/60" aria-hidden />
              <h2 className="mt-5 text-[18px] font-black text-deepBlue">لم تُسجّل في أي دورة بعد</h2>
              <p className="mx-auto mt-2 max-w-sm text-[13px] font-semibold leading-relaxed text-deepBlue/55">
                ابدأ رحلة التعلّم وستظهر بطاقاتك هنا بعد إتمام التسجيل.
              </p>
              <Link
                to="/dashboard/student/available-courses"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-customOrange px-6 py-3 text-[12px] font-black text-white shadow-md transition hover:brightness-105"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                تصفّح الدورات المتاحة
              </Link>
            </motion.div>
          ) : buckets[tab].length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-3xl border border-dashed border-deepBlue/12 bg-white/80 px-6 py-12 text-center"
            >
              <p className="font-black text-deepBlue">لا توجد دورات في هذا التبويب</p>
              <p className="mt-1 text-[13px] font-semibold text-deepBlue/50">جرّب تبويبًا آخر</p>
            </motion.div>
          ) : (
            <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {buckets[tab].map((e) => (
                <StudentMyCourseCard
                  key={`e-${String(e.id)}-${String(e.course?.id ?? 0)}`}
                  enrollment={e}
                />
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

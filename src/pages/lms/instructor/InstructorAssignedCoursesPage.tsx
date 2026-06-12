import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookMarked,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Layers,
  MessageSquare,
  RefreshCw,
  UserCheck,
  Users,
  GraduationCap,
} from 'lucide-react'
import { fetchInstructorCourses } from '@/api/instructorApi'
import type { TeachingCourseLms } from '@/types/lms'
import { useAuth } from '@/contexts/AuthContext'
/* ── Status maps ─────────────────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  draft:     'bg-slate-100 text-slate-500',
  inactive:  'bg-red-100 text-red-600',
  published: 'bg-emerald-100 text-emerald-700',
  upcoming:  'bg-amber-100 text-amber-700',
}

const STATUS_AR: Record<string, string> = {
  active:    'نشط',
  draft:     'مسودة',
  inactive:  'غير نشط',
  published: 'منشور',
  upcoming:  'قادم',
}

/* ── Quick actions (base — placement-specific ones added conditionally) ─── */

const BASE_ACTIONS = [
  { label: 'كل طلابي',        href: '/dashboard/instructor/students',     icon: Users,         placement: false },
  { label: 'التوفر والمواعيد', href: '/dashboard/instructor/availability', icon: CalendarDays,  placement: false },
  { label: 'الجلسات',          href: '/dashboard/instructor/sessions',     icon: CalendarCheck, placement: false },
  { label: 'التسليمات',        href: '/dashboard/instructor/submissions',  icon: ClipboardList, placement: false },
  { label: 'الحضور',           href: '/dashboard/instructor/attendance',   icon: UserCheck,     placement: false },
]

const PLACEMENT_ACTIONS = [
  { label: 'اختبارات تحديد المستوى', href: '/dashboard/instructor/placement-tests',  icon: ClipboardCheck, placement: true },
  { label: 'المقابلات الشفوية',       href: '/dashboard/instructor/oral-assessments', icon: MessageSquare,  placement: true },
  { label: 'الصفوف والمجموعات',       href: '/dashboard/instructor/classes',          icon: GraduationCap,  placement: true },
]

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function InstructorAssignedCoursesPage() {
  const { user } = useAuth()
  const [rows, setRows]       = useState<TeachingCourseLms[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const list = await fetchInstructorCourses()
      setRows(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(true)
      setRows([])
      if (import.meta.env.DEV) console.error('[courses] load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hasPlacementCourses = useMemo(
    () => rows.some((c) => c.requires_placement_test),
    [rows],
  )

  const quickActions = useMemo(
    () => hasPlacementCourses
      ? [...PLACEMENT_ACTIONS, ...BASE_ACTIONS]
      : BASE_ACTIONS,
    [hasPlacementCourses],
  )

  const kpi = useMemo(() => ({
    courses:  rows.length,
    students: rows.reduce((s, c) => s + (c.enrolled_students_count ?? c.students_count ?? c.student_count ?? 0), 0),
    written:  rows.reduce((s, c) => s + (c.written_tests_count ?? c.written_completed_count ?? c.placement_completed_count ?? 0), 0),
    final:    rows.reduce((s, c) => s + (c.final_level_count ?? c.oral_completed_count ?? 0), 0),
  }), [rows])

  return (
    <div className="space-y-6 pb-16 text-right" dir="rtl">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-[#22334A] via-[#1a2d44] to-[#2691C2] shadow-[0_24px_60px_-20px_rgba(34,51,74,0.55)]"
      >
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-12 h-72 w-72 rounded-full bg-[#EC943C]/15 blur-[100px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-20 h-56 w-56 rounded-full bg-[#2691C2]/25 blur-[80px]" />

        <div className="relative px-6 pb-6 pt-7 sm:px-10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">مدرّب EMC</p>
              <h1 className="mt-1 text-[1.75rem] font-black leading-tight text-white">دوراتي المسندة</h1>
              {user?.name && (
                <p className="mt-1 text-[12px] font-semibold text-white/55">أهلًا، {user.name}</p>
              )}
              <p className="mt-2 max-w-lg text-[11px] font-medium leading-loose text-white/40">
                تابع دوراتك وطلابك واختبارات تحديد المستوى والمقابلات من مكان واحد.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-3.5 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>

          {!loading && (
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {([
                { label: 'دورة مسندة',    value: kpi.courses   },
                { label: 'طالب مسجّل',    value: kpi.students  },
                { label: 'اختبار مكتمل',  value: kpi.written   },
                { label: 'نتيجة معتمدة',  value: kpi.final     },
              ] as const).map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
                  <p className="font-mono text-[22px] font-black tabular-nums text-white">{value}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-white/45">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <section>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-deepBlue/30">وصول سريع</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {quickActions.map(({ label, href, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.04 }}
            >
              <Link
                to={href}
                className="flex h-full flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-3.5 text-center text-[10px] font-black text-deepBlue/65 shadow-sm transition hover:border-[#2691C2]/30 hover:bg-[#2691C2]/[0.04] hover:text-[#2691C2]"
              >
                <Icon className="h-5 w-5" />
                <span className="leading-tight">{label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Course grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-100 bg-red-50 py-14 text-center">
          <BookOpen className="mx-auto h-9 w-9 text-red-300" />
          <p className="mt-3 font-black text-deepBlue">تعذّر تحميل الدورات</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#2691C2] px-5 py-2.5 text-[12px] font-black text-white transition hover:brightness-105"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            إعادة المحاولة
          </button>
        </div>
      ) : rows.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center"
        >
          <BookMarked className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-[16px] font-black text-deepBlue">لا توجد دورات مسندة</p>
          <p className="mx-auto mt-2 max-w-xs text-[12px] font-semibold leading-relaxed text-deepBlue/40">
            عند إسناد دورة جديدة ستظهر هنا
          </p>
        </motion.div>
      ) : (
        <div className={`grid gap-5 ${rows.length === 1 ? 'mx-auto max-w-sm' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
          {rows.map((c, i) => <CourseCard key={c.id} course={c} index={i} />)}
        </div>
      )}
    </div>
  )
}

/* ── CourseCard ───────────────────────────────────────────────────────────── */

function CourseCard({ course: c, index }: { course: TeachingCourseLms; index: number }) {
  const enrolled  = c.enrolled_students_count ?? c.students_count ?? c.student_count ?? null
  const written   = c.written_tests_count ?? c.written_completed_count ?? c.placement_completed_count ?? null
  const oralPend  = c.oral_pending_count ?? c.waiting_oral_count ?? null
  const oralBook  = c.oral_booked_count ?? null
  const finalLvl  = c.final_level_count ?? c.oral_completed_count ?? null
  const statusKey = (c.status ?? '').toLowerCase()

  const needsPlacement = !!c.requires_placement_test

  const metrics = needsPlacement ? [
    { label: 'الطلاب',           value: enrolled, color: 'text-[#2691C2]'   },
    { label: 'اختبارات مكتملة',  value: written,  color: 'text-[#EC943C]'  },
    { label: 'بانتظار المقابلة', value: oralPend, color: 'text-amber-500'   },
    { label: 'مقابلات محجوزة',   value: oralBook, color: 'text-violet-600'  },
    { label: 'نتائج معتمدة',     value: finalLvl, color: 'text-emerald-600' },
  ] : [
    { label: 'الطلاب',  value: enrolled, color: 'text-[#2691C2]'   },
  ]

  const baseActions = [
    {
      label: 'طلاب الدورة',
      icon:  BookOpen,
      href:  `/dashboard/instructor/courses/${c.id}/students`,
      cls:   'border-[#2691C2]/20 bg-[#2691C2]/[0.05] text-[#2691C2] hover:bg-[#2691C2]/[0.12]',
    },
    {
      label: 'التوفر',
      icon:  CalendarDays,
      href:  '/dashboard/instructor/availability',
      cls:   'border-slate-200 bg-slate-50 text-deepBlue/55 hover:bg-slate-100',
    },
    {
      label: 'المحتوى',
      icon:  Layers,
      href:  `/dashboard/instructor/courses/${c.id}/content`,
      cls:   'border-slate-200 bg-slate-50 text-deepBlue/55 hover:bg-slate-100',
    },
  ]

  const placementActions = needsPlacement ? [
    {
      label: 'تحديد المستوى',
      icon:  ClipboardCheck,
      href:  `/dashboard/instructor/courses/${c.id}/placement-students`,
      cls:   'border-[#EC943C]/20 bg-[#EC943C]/[0.05] text-[#EC943C] hover:bg-[#EC943C]/[0.12]',
    },
    {
      label: 'المقابلات',
      icon:  MessageSquare,
      href:  '/dashboard/instructor/oral-assessments',
      cls:   'border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100',
    },
    {
      label: 'الصفوف',
      icon:  GraduationCap,
      href:  `/dashboard/instructor/classes?course_id=${c.id}`,
      cls:   'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    },
  ] : []

  const actions = needsPlacement
    ? [baseActions[0], ...placementActions, ...baseActions.slice(1)]
    : baseActions

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      {/* Image or gradient banner */}
      {(c.thumbnail ?? (c as Record<string, unknown>).image) ? (
        <div className="relative h-36 overflow-hidden">
          <img
            src={((c.thumbnail ?? (c as Record<string, unknown>).image) as string)}
            alt={c.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-deepBlue/50 via-transparent to-transparent" />
          {c.status && (
            <span className={`absolute right-3 top-3 rounded-xl px-2.5 py-0.5 text-[9px] font-black shadow-sm ${STATUS_COLOR[statusKey] ?? 'bg-slate-100 text-slate-500'}`}>
              {STATUS_AR[statusKey] ?? c.status}
            </span>
          )}
        </div>
      ) : (
        <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-bl from-[#22334A]/90 to-[#2691C2]">
          <div aria-hidden className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#EC943C]/20 blur-2xl" />
          <BookMarked className="relative h-8 w-8 text-white/20" />
          {c.status && (
            <span className={`absolute right-3 top-3 rounded-xl px-2.5 py-0.5 text-[9px] font-black ${STATUS_COLOR[statusKey] ?? 'bg-white/15 text-white'}`}>
              {STATUS_AR[statusKey] ?? c.status}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 text-[14px] font-black leading-snug text-deepBlue">{c.title}</h2>

        {/* Metric tiles */}
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {metrics.map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-slate-50 px-1 py-2 text-center">
              <p className={`font-mono text-[16px] font-black tabular-nums ${color}`}>
                {value ?? '—'}
              </p>
              <p className="mt-0.5 text-[8px] font-black leading-tight text-deepBlue/35">{label}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {actions.map(({ label, icon: Icon, href, cls }) => (
            <Link
              key={label}
              to={href}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[10px] font-black transition ${cls}`}
            >
              <Icon className="h-3 w-3 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </motion.article>
  )
}


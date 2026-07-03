import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookMarked,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Clock,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Layers,
  MessageSquare,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from 'lucide-react'
import { fetchInstructorCourses } from '@/api/instructorApi'
import type { TeachingCourseLms } from '@/types/lms'
import { useAuth } from '@/contexts/AuthContext'

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const STATUS_AR: Record<string, string> = {
  active:    'نشط',
  draft:     'مسودة',
  inactive:  'غير نشط',
  published: 'منشور',
  upcoming:  'قادم',
  completed: 'مكتمل',
  archived:  'مؤرشف',
}

type TabKey = 'all' | 'active' | 'upcoming' | 'completed' | 'draft'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: 'الكل'    },
  { key: 'active',    label: 'نشطة'    },
  { key: 'upcoming',  label: 'قادمة'   },
  { key: 'completed', label: 'مكتملة'  },
  { key: 'draft',     label: 'مسودة'   },
]

function groupCourse(c: TeachingCourseLms, today: string): 'active' | 'upcoming' | 'completed' | 'draft' {
  const st = (c.status ?? '').toLowerCase()
  if (st === 'draft') return 'draft'
  // Prefer backend computed flag (handles timezone correctly)
  if (c.is_ended === true || c.computed_status === 'ended') return 'completed'
  if (st === 'archived' || st === 'inactive') return 'completed'
  // Fallback: string date comparison
  if (c.end_date && c.end_date < today) return 'completed'
  if (c.start_date && c.start_date > today) return 'upcoming'
  return 'active'
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function InstructorAssignedCoursesPage() {
  const { user } = useAuth()
  const [rows, setRows]       = useState<TeachingCourseLms[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [search, setSearch]   = useState('')
  const [tab, setTab]         = useState<TabKey>('all')

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const list = await fetchInstructorCourses()
      setRows(Array.isArray(list) ? list : [])
    } catch {
      setError(true)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const grouped = useMemo(() => {
    const active: TeachingCourseLms[] = []
    const upcoming: TeachingCourseLms[] = []
    const completed: TeachingCourseLms[] = []
    const draft: TeachingCourseLms[] = []
    for (const c of rows) {
      const g = groupCourse(c, today)
      if (g === 'active')    active.push(c)
      else if (g === 'upcoming')  upcoming.push(c)
      else if (g === 'completed') completed.push(c)
      else                        draft.push(c)
    }
    return { active, upcoming, completed, draft }
  }, [rows, today])

  const kpi = useMemo(() => ({
    total:     rows.length,
    active:    grouped.active.length,
    upcoming:  grouped.upcoming.length,
    completed: grouped.completed.length,
    students:  rows.reduce((s, c) => s + (c.enrolled_students_count ?? c.students_count ?? c.student_count ?? 0), 0),
  }), [rows, grouped])

  const hasPlacementCourses = useMemo(() => rows.some((c) => c.requires_placement_test), [rows])

  // Tabs → visible subset, then filter by search
  const visible = useMemo(() => {
    let pool: TeachingCourseLms[]
    if (tab === 'all')       pool = rows
    else if (tab === 'active')    pool = grouped.active
    else if (tab === 'upcoming')  pool = grouped.upcoming
    else if (tab === 'completed') pool = grouped.completed
    else                          pool = grouped.draft

    if (!search.trim()) return pool
    const q = search.trim().toLowerCase()
    return pool.filter((c) => c.title.toLowerCase().includes(q))
  }, [tab, rows, grouped, search])

  // For "all" tab, render grouped sections; otherwise flat
  const showGrouped = tab === 'all' && !search.trim()

  return (
    <div className="space-y-5 pb-16 text-right" dir="rtl">

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
                تابع دوراتك، الطلاب، الجلسات، الواجبات، والحضور من مكان واحد.
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
            <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {([
                { label: 'إجمالي الدورات', value: kpi.total    },
                { label: 'دورات نشطة',     value: kpi.active   },
                { label: 'دورات قادمة',    value: kpi.upcoming },
                { label: 'دورات مكتملة',   value: kpi.completed},
                { label: 'طالب مسجّل',     value: kpi.students },
              ] as const).map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
                  <p className="font-mono text-[20px] font-black tabular-nums text-white">{value}</p>
                  <p className="mt-0.5 text-[9px] font-semibold text-white/45">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <section>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-deepBlue/30">وصول سريع</p>
        <div className={`grid gap-2 ${hasPlacementCourses ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-4 sm:grid-cols-5'}`}>
          {[
            ...(hasPlacementCourses ? [
              { label: 'اختبارات التحديد', href: '/dashboard/instructor/placement-tests',  icon: ClipboardCheck },
              { label: 'المقابلات',         href: '/dashboard/instructor/oral-assessments', icon: MessageSquare  },
              { label: 'الصفوف',            href: '/dashboard/instructor/classes',          icon: GraduationCap  },
            ] : []),
            { label: 'طلابي',            href: '/dashboard/instructor/students',     icon: Users         },
            { label: 'المواعيد',          href: '/dashboard/instructor/availability', icon: CalendarDays  },
            { label: 'الجلسات',           href: '/dashboard/instructor/sessions',     icon: CalendarCheck },
            { label: 'التسليمات',         href: '/dashboard/instructor/submissions',  icon: ClipboardList },
            { label: 'الحضور',            href: '/dashboard/instructor/attendance',   icon: UserCheck     },
          ].map(({ label, href, icon: Icon }, i) => (
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

      {/* ── Search + Tabs ─────────────────────────────────────────────────── */}
      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بعنوان الدورة..."
              dir="rtl"
              className="h-9 w-full rounded-2xl border border-slate-200 bg-white pr-9 pl-3 text-[12px] font-semibold text-deepBlue outline-none placeholder:text-slate-400 focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5">
            {TABS.map(({ key, label }) => {
              const count = key === 'all' ? rows.length : grouped[key]?.length ?? 0
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
                    tab === key
                      ? 'bg-[#2691C2] text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-deepBlue/60 hover:bg-slate-50'
                  }`}
                >
                  {label}
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${tab === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Course list ───────────────────────────────────────────────────── */}
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
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-black text-deepBlue">لا توجد نتائج</p>
          <p className="mt-1 text-[12px] font-semibold text-deepBlue/40">جرّب تغيير الفلتر أو مصطلح البحث</p>
        </div>
      ) : showGrouped ? (
        <div className="space-y-10">
          <AnimatePresence>
            {([
              { label: 'دورات نشطة',   courses: grouped.active,    color: 'text-emerald-600',  dot: 'bg-emerald-500' },
              { label: 'دورات قادمة',  courses: grouped.upcoming,  color: 'text-sky-600',       dot: 'bg-sky-500'     },
              { label: 'دورات مكتملة', courses: grouped.completed, color: 'text-slate-500',     dot: 'bg-slate-400'   },
              { label: 'مسودات',       courses: grouped.draft,     color: 'text-slate-400',     dot: 'bg-slate-300'   },
            ] as const).map(({ label, courses, color, dot }) =>
              courses.length === 0 ? null : (
                <motion.section
                  key={label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    <h2 className={`text-[13px] font-black tracking-wide ${color}`}>
                      {label}
                      <span className="mr-2 text-[11px] font-semibold opacity-60">({courses.length})</span>
                    </h2>
                  </div>
                  <div className={`grid gap-4 ${courses.length === 1 ? 'mx-auto max-w-sm' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
                    {courses.map((c, i) => <CourseCard key={c.id} course={c} index={i} />)}
                  </div>
                </motion.section>
              )
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className={`grid gap-4 ${visible.length === 1 ? 'mx-auto max-w-sm' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
          {visible.map((c, i) => <CourseCard key={c.id} course={c} index={i} />)}
        </div>
      )}
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function fmtDateAr(d: string | null | undefined): string | null {
  if (!d) return null
  try {
    return new Intl.DateTimeFormat('ar', {
      day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Europe/Amsterdam',
    }).format(new Date(d + 'T00:00:00'))
  } catch { return d }
}

function stripSec(t: string | null | undefined): string | null {
  if (!t) return null
  return String(t).slice(0, 5)
}

/* ── CourseCard ───────────────────────────────────────────────────────────── */

function CourseCard({ course: c, index }: { course: TeachingCourseLms; index: number }) {
  const enrolled       = c.enrolled_students_count ?? c.students_count ?? c.student_count ?? 0
  const written        = c.written_tests_count ?? c.written_completed_count ?? c.placement_completed_count ?? null
  const oralPend       = c.oral_pending_count ?? c.waiting_oral_count ?? null
  const finalLvl       = c.final_level_count ?? c.oral_completed_count ?? null
  const needsPlacement = !!c.requires_placement_test

  // Status badge — prefer backend Arabic label, fallback to STATUS_AR map
  const statusKey  = (c.status ?? '').toLowerCase()
  const computedSt = c.computed_status ?? statusKey
  const statusAr   = c.status_label_ar ?? STATUS_AR[statusKey] ?? c.status ?? ''
  const badgeCls =
    computedSt === 'ended'    ? 'bg-slate-100 text-slate-500'
    : computedSt === 'archived' ? 'bg-slate-200 text-slate-500'
    : statusKey === 'upcoming'  ? 'bg-sky-100 text-sky-700'
    : statusKey === 'draft'     ? 'bg-slate-100 text-slate-500'
    : 'bg-emerald-100 text-emerald-700'

  // Date / time
  const dateStart = fmtDateAr(c.start_date)
  const dateEnd   = fmtDateAr(c.end_date)
  const timeStart = stripSec(c.start_time)
  const timeEnd   = stripSec(c.end_time)

  let dateLabel: string | null = null
  if (dateStart && dateEnd)  dateLabel = `${dateStart} – ${dateEnd}`
  else if (dateStart)        dateLabel = dateStart

  let timeLabel: string | null = null
  if (timeStart && timeEnd)  timeLabel = `${timeStart} - ${timeEnd}`
  else if (timeStart)        timeLabel = timeStart

  const imageUrl = c.thumbnail ?? (c as Record<string, unknown>).image as string | null | undefined ?? null

  const actions = [
    {
      label: 'الطلاب',
      icon:  Users,
      href:  `/dashboard/instructor/courses/${c.id}/students`,
      cls:   'text-[#2691C2] hover:bg-[#2691C2]/[0.08]',
    },
    {
      label: 'الحضور',
      icon:  UserCheck,
      href:  `/dashboard/instructor/attendance?course_id=${c.id}`,
      cls:   'text-emerald-600 hover:bg-emerald-50',
    },
    {
      label: 'التسليمات',
      icon:  ClipboardList,
      href:  `/dashboard/instructor/submissions?course_id=${c.id}`,
      cls:   'text-[#EC943C] hover:bg-orange-50',
    },
    {
      label: 'المحتوى',
      icon:  Layers,
      href:  `/dashboard/instructor/courses/${c.id}/content`,
      cls:   'text-deepBlue/55 hover:bg-slate-100',
    },
    ...(needsPlacement ? [
      {
        label: 'تحديد المستوى',
        icon:  ClipboardCheck,
        href:  `/dashboard/instructor/courses/${c.id}/placement-students`,
        cls:   'text-violet-600 hover:bg-violet-50',
      },
    ] : []),
  ]

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* ── Banner ──────────────────────────────────────────────────────── */}
      <div className="relative h-40 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={c.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-bl from-[#22334A] via-[#1e3350] to-[#2691C2]">
            <div aria-hidden className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#EC943C]/15 blur-3xl" />
            <div aria-hidden className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-deepBlue/80 via-deepBlue/20 to-transparent" />

        {/* Status badge */}
        {statusAr && (
          <span className={`absolute right-3 top-3 rounded-xl px-2.5 py-1 text-[9px] font-black shadow-sm ${badgeCls}`}>
            {statusAr}
          </span>
        )}

        {/* Title overlaid at bottom */}
        <div className="absolute bottom-0 right-0 left-0 px-4 pb-3.5 pt-6">
          <h2 className="line-clamp-2 text-right text-[14px] font-black leading-snug text-white drop-shadow-sm">
            {c.title}
          </h2>
          {c.track?.title && (
            <p className="mt-0.5 text-right text-[10px] font-semibold text-white/55">{c.track.title}</p>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 p-4 text-right" dir="rtl">

        {/* Date + time row */}
        {(dateLabel || timeLabel) && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-deepBlue/55">
            {dateLabel && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-[#2691C2]/70 shrink-0" />
                {dateLabel}
              </span>
            )}
            {timeLabel && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[#2691C2]/70 shrink-0" />
                {timeLabel}
              </span>
            )}
          </div>
        )}

        {/* Student + placement stats */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-2.5 py-1 text-[10px] font-black text-[#2691C2]">
            <Users className="h-3 w-3 shrink-0" />
            <span className="font-mono tabular-nums">{enrolled}</span>
            <span className="font-semibold opacity-70">طالب</span>
          </span>
          {needsPlacement && written != null && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-2.5 py-1 text-[10px] font-black text-[#EC943C]">
              <span className="font-mono tabular-nums">{written}</span>
              <span className="font-semibold opacity-70">اختبار مكتمل</span>
            </span>
          )}
          {needsPlacement && oralPend != null && oralPend > 0 && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-600">
              <span className="font-mono tabular-nums">{oralPend}</span>
              <span className="font-semibold opacity-70">ينتظر مقابلة</span>
            </span>
          )}
          {needsPlacement && finalLvl != null && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-600">
              <span className="font-mono tabular-nums">{finalLvl}</span>
              <span className="font-semibold opacity-70">نتيجة معتمدة</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Footer actions ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        {actions.map(({ label, icon: Icon, href, cls }) => (
          <Link
            key={label}
            to={href}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-black transition ${cls}`}
          >
            <Icon className="h-3 w-3 shrink-0" />
            {label}
          </Link>
        ))}
      </div>
    </motion.article>
  )
}

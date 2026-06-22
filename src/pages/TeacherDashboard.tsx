import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  MessageSquare,
  UserCheck,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchInstructorDashboardStats } from '@/api/instructorApi'
import {
  DashboardSection,
  DashboardHero,
  DashboardKpiCard,
  DashboardKpiSkeleton,
  DashboardListSkeleton,
  DashboardCardGridSkeleton,
  EmptyState,
  UpcomingSessionCard,
} from '../components/dashboard'
import { useAuth } from '../contexts/AuthContext'
import type { TeachingCourse } from '../types'
import { formatSessionSchedule } from '@/utils/lmsSession'
import type { LmsSession, TeachingCourseLms } from '@/types/lms'

function hourGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'مساء الخير'
  return 'مساء النور'
}

function mapLmsCourseToTeaching(c: TeachingCourseLms): TeachingCourse {
  const st = String(c.status ?? '').toLowerCase()
  const status: TeachingCourse['status'] =
    st.includes('complete') ? 'completed'
    : st.includes('upcoming') || st.includes('قادم') ? 'upcoming'
    : 'active'
  return {
    id: c.id,
    title: c.title,
    slug: c.slug ?? `course-${c.id}`,
    student_count: c.student_count ?? 0,
    upcoming_sessions: 0,
    status,
  }
}

function sessionPlatform(p: string | undefined): 'zoom' | 'meet' | 'teams' | undefined {
  const s = String(p ?? '').toLowerCase()
  if (s.includes('teams')) return 'teams'
  if (s.includes('meet') || s.includes('google')) return 'meet'
  if (s.includes('zoom')) return 'zoom'
  return undefined
}

const statusConfig = {
  active:    { label: 'جارية',  cls: 'bg-customBlue/10 text-customBlue ring-customBlue/20'     },
  upcoming:  { label: 'قادمة',  cls: 'bg-customOrange/10 text-accent-700 ring-customOrange/20' },
  completed: { label: 'مكتملة', cls: 'bg-slate-100 text-slate-500 ring-slate-200'               },
}

function TeachingCourseCard({ course }: { course: TeachingCourse }) {
  const cfg = statusConfig[course.status] ?? statusConfig.active
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-deepBlue/[0.07] bg-white p-5 shadow-emc transition-shadow duration-300 ease-emc-out hover:shadow-emc-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-sm font-black leading-6 tracking-tight text-deepBlue">{course.title}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>
      <div className="flex items-center gap-5 text-xs font-bold text-deepBlue/60">
        <span className="flex items-center gap-1.5">
          <Users size={13} className="text-customBlue" />
          <span className="tabular-nums">{course.student_count}</span> طالب
        </span>
      </div>
      <Link
        to={course.slug ? `/courses/${course.slug}` : '/dashboard/instructor/courses'}
        className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl border border-deepBlue/10 bg-deepBlue/[0.02] py-2 text-xs font-black text-deepBlue transition hover:border-customBlue/40 hover:bg-customBlue/[0.05] hover:text-customBlue"
      >
        <BookOpen size={12} aria-hidden />
        عرض الدورة
      </Link>
    </div>
  )
}

function HeroChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]"
    >
      {label}
    </Link>
  )
}

const QUICK_ACTIONS = [
  { icon: BookOpen,       label: 'دوراتي',               description: 'الدورات المسندة إليك',     href: '/dashboard/instructor/courses',        color: 'blue'   as const },
  { icon: Users,          label: 'طلابي',                description: 'جميع الطلاب عبر دوراتك',   href: '/dashboard/instructor/students',       color: 'blue'   as const },
  { icon: Calendar,       label: 'الجلسات',               description: 'الجدول والروابط',          href: '/dashboard/instructor/sessions',       color: 'blue'   as const },
  { icon: UserCheck,      label: 'الحضور',                description: 'تسجيل الحضور بالجلسة',     href: '/dashboard/instructor/attendance',     color: 'accent' as const },
  { icon: ClipboardList,  label: 'التسليمات',             description: 'درجات وملاحظات',           href: '/dashboard/instructor/submissions',    color: 'accent' as const },
  { icon: MessageSquare,  label: 'المقابلات الشفوية',     description: 'جدولة ومتابعة المقابلات',  href: '/dashboard/instructor/oral-assessments', color: 'muted' as const },
  { icon: ClipboardCheck, label: 'اختبارات تحديد المستوى', description: 'نتائج واختبارات الطلاب', href: '/dashboard/instructor/placement-tests', color: 'muted' as const },
  { icon: FileText,       label: 'ملفي الشخصي',           description: 'الملف والإعدادات',         href: '/dashboard/profile',                   color: 'muted' as const },
]

type LoadState = 'loading' | 'ok' | 'error'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const greeting = hourGreeting()

  const [dashStats, setDashStats] = useState<Awaited<ReturnType<typeof fetchInstructorDashboardStats>> | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')

  useEffect(() => {
    let alive = true
    setLoadState('loading')
    void fetchInstructorDashboardStats()
      .then((stats) => {
        if (!alive) return
        setDashStats(stats)
        setLoadState('ok')
      })
      .catch(() => {
        if (!alive) return
        setLoadState('error')
      })
    return () => { alive = false }
  }, [])

  const insLms = dashStats?.dashboard ?? null

  const effective = useMemo(() => {
    const stats = dashStats
    const courses = (stats?.courses ?? insLms?.assigned_courses ?? []).map(mapLmsCourseToTeaching)
    const sessions = (stats?.sessions ?? insLms?.upcoming_sessions ?? []).map((s: LmsSession) => ({
      id: s.id,
      course_name: s.course_name,
      date: formatSessionSchedule(s),
      time: undefined as string | undefined,
      type: (s.type === 'offline' ? 'offline' : 'online') as 'online' | 'offline',
      location: s.location ?? undefined,
      meeting_link: s.meeting_link ?? undefined,
      platform: (s.platform as string | undefined) ?? undefined,
    }))
    return {
      stats: {
        total_students:   stats?.studentsCount ?? insLms?.student_count ?? 0,
        upcoming_sessions: sessions.length,
        active_courses:   courses.filter((c) => c.status !== 'completed').length,
        completion_rate:  0,
      },
      courses,
      sessions,
    }
  }, [dashStats, insLms])

  const displayName = user?.name?.trim() || 'مدرّب EMC'
  const isLoading = loadState === 'loading'

  const heroStats = isLoading
    ? []
    : [
        { label: 'الطلاب',         value: effective.stats.total_students   },
        { label: 'الجلسات القادمة', value: effective.stats.upcoming_sessions },
        { label: 'الدورات النشطة',  value: effective.stats.active_courses   },
      ]

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* ── Hero — always visible, no skeleton ── */}
      <DashboardHero
        greeting={greeting}
        name={displayName}
        role="بوابة التدريس"
        subtitle="الجلسات، الحضور، وتقييم التسليمات ضمن منظومة EMC."
        quickStats={heroStats}
        actions={
          <>
            <HeroChip href="/dashboard/instructor/courses"   label="دوراتي"    />
            <HeroChip href="/dashboard/instructor/sessions"  label="الجلسات"   />
            <HeroChip href="/dashboard/instructor/students"  label="طلابي"     />
            <HeroChip href="/dashboard/instructor/attendance" label="الحضور"   />
          </>
        }
      />

      {/* ── LMS KPI row — skeleton until loaded ── */}
      {isLoading ? (
        <DashboardKpiSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard
            label="إجمالي الطلاب"
            value={effective.stats.total_students}
            icon={Users}
            variant="brand"
            hint="على مستوى الدورات المسندة"
          />
          <DashboardKpiCard
            label="الصفوف / المجموعات"
            value={dashStats?.classes.length ?? insLms?.class_groups_count ?? insLms?.class_groups?.length ?? 0}
            icon={GraduationCap}
            variant="brand"
          />
          <DashboardKpiCard
            label="الجلسات القادمة"
            value={effective.stats.upcoming_sessions}
            icon={Calendar}
            variant="accent"
          />
          <DashboardKpiCard
            label="تسليمات بانتظار المراجعة"
            value={dashStats?.submissionsPending ?? insLms?.submissions_pending_count ?? 0}
            icon={ClipboardList}
            variant="accent"
          />
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardKpiCard
            label="الدورات النشطة"
            value={effective.stats.active_courses}
            icon={BookOpen}
            variant="brand"
          />
          <DashboardKpiCard
            label="حضور بانتظار التأكيد"
            value={dashStats?.attendancePending ?? insLms?.attendance_pending_count ?? 0}
            icon={UserCheck}
            variant="accent"
            hint="جلسات بانتظار الإغلاق"
          />
          {(dashStats?.oralPending ?? insLms?.oral_pending_count ?? 0) > 0 && (
            <DashboardKpiCard
              label="مقابلات شفوية معلّقة"
              value={dashStats?.oralPending ?? insLms?.oral_pending_count ?? 0}
              icon={MessageSquare}
              variant="muted"
            />
          )}
        </div>
      )}

      {/* ── Pending submissions alert ── */}
      {!isLoading && (dashStats?.submissionsPending ?? insLms?.submissions_pending_count ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-customOrange/25 bg-customOrange/[0.06] px-5 py-3.5 shadow-emc-sm">
          <ClipboardList size={18} className="shrink-0 text-customOrange" aria-hidden />
          <p className="flex-1 text-sm font-black text-deepBlue">
            لديك{' '}
            <span className="tabular-nums text-accent-700">{dashStats?.submissionsPending ?? insLms?.submissions_pending_count}</span>{' '}
            تسليمات بانتظار المراجعة
          </p>
          <Link
            to="/dashboard/instructor/submissions"
            className="shrink-0 rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white shadow-emc-sm transition hover:shadow-emc hover:brightness-105"
          >
            مراجعة الآن
          </Link>
        </div>
      )}

      {/* ── Courses + Sessions row ── */}
      <div className="grid gap-8 xl:grid-cols-[1fr_minmax(0,380px)]">
        <DashboardSection
          title="دوراتي"
          action={
            !isLoading && effective.courses.length > 0
              ? { label: 'عرض الكل', href: '/dashboard/instructor/courses' }
              : undefined
          }
        >
          {isLoading ? (
            <DashboardCardGridSkeleton count={3} cols={3} />
          ) : effective.courses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {effective.courses.map((c) => (
                <TeachingCourseCard key={c.id} course={c} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="لا توجد دورات مسندة إليك"
              description="ستظهر هنا الدورات التي تقوم بتدريسها بمجرد إسنادها."
            />
          )}
        </DashboardSection>

        <DashboardSection
          title="جلساتي القادمة"
          action={
            !isLoading && effective.sessions.length > 0
              ? { label: 'كل الجلسات', href: '/dashboard/instructor/sessions' }
              : undefined
          }
        >
          {isLoading ? (
            <DashboardListSkeleton count={3} />
          ) : effective.sessions.length > 0 ? (
            <div className="space-y-3">
              {effective.sessions.slice(0, 5).map((s) => (
                <UpcomingSessionCard
                  key={s.id}
                  courseName={s.course_name}
                  date={s.date}
                  time={s.time ?? undefined}
                  type={s.type}
                  location={s.location ?? undefined}
                  meetingLink={s.meeting_link ?? undefined}
                  platform={sessionPlatform(s.platform ?? undefined)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="لا توجد جلسات قادمة"
              description="ستظهر هنا جلساتك المجدولة بمجرد إضافتها."
            />
          )}
        </DashboardSection>
      </div>

      {/* ── Quick Actions ── */}
      <DashboardSection title="الإجراءات السريعة">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon
            const iconColorCls =
              a.color === 'accent' ? 'text-customOrange'
              : a.color === 'muted'  ? 'text-deepBlue/70'
              : 'text-customBlue'
            const iconBgCls =
              a.color === 'accent' ? 'bg-customOrange/[0.10] ring-customOrange/20'
              : a.color === 'muted'  ? 'bg-deepBlue/[0.05] ring-deepBlue/10'
              : 'bg-customBlue/[0.10] ring-customBlue/20'
            return (
              <Link
                key={a.href}
                to={a.href}
                className="flex items-center gap-4 rounded-2xl border border-deepBlue/[0.06] bg-white p-4 shadow-emc transition-all duration-300 ease-emc-out hover:border-customBlue/25 hover:shadow-emc-md"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${iconBgCls}`}>
                  <Icon size={19} className={iconColorCls} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-deepBlue">{a.label}</p>
                  {a.description && (
                    <p className="mt-0.5 truncate text-xs text-deepBlue/45">{a.description}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </DashboardSection>

      {/* ── Admin notes (if available) ── */}
      {!isLoading && insLms?.admin_notes_placeholder && (
        <div className="rounded-2xl border border-deepBlue/[0.08] bg-deepBlue/[0.03] px-5 py-4 shadow-emc-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-deepBlue/50 font-latin">ملاحظات الإدارة</p>
          <p className="mt-2 text-sm font-semibold text-deepBlue">{insLms.admin_notes_placeholder}</p>
        </div>
      )}
    </div>
  )
}

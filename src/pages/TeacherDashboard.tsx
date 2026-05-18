import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  UserCheck,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/axios'
import { fetchInstructorLmsDashboard } from '@/api/instructorApi'
import {
  DashboardSection,
  EmptyState,
  QuickActionCard,
  StatCard,
  UpcomingSessionCard,
} from '../components/dashboard'
import { LearningDashboardCard } from '@/components/lms'
import { useAuth } from '../contexts/AuthContext'
import type { TeacherDashboardData, TeachingCourse } from '../types'
import type { InstructorLmsDashboard, TeachingCourseLms } from '@/types/lms'

function normalise(raw: unknown): TeacherDashboardData {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: TeacherDashboardData }).data
  }
  return raw as TeacherDashboardData
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

// ---------------------------------------------------------------------------
// Teaching course card (local — specific to this page)
// ---------------------------------------------------------------------------

const statusConfig = {
  active:    { label: 'جارية',  cls: 'bg-emerald-50 text-emerald-600'  },
  upcoming:  { label: 'قادمة',  cls: 'bg-sky-50    text-customBlue'    },
  completed: { label: 'مكتملة', cls: 'bg-slate-50  text-slate-500'     },
}

function TeachingCourseCard({ course }: { course: TeachingCourse }) {
  const cfg = statusConfig[course.status] ?? statusConfig.active
  const { label, cls } = cfg

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-sm font-black leading-6 text-deepBlue">{course.title}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${cls}`}>{label}</span>
      </div>

      <div className="flex items-center gap-5 text-xs font-bold text-slate-500">
        <span className="flex items-center gap-1.5">
          <Users size={13} className="text-customBlue" />
          {course.student_count} طالب
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar size={13} className="text-customOrange" />
          {course.upcoming_sessions} جلسة قادمة
        </span>
      </div>

      <Link
        to={course.slug ? `/courses/${course.slug}` : '/dashboard/instructor/courses'}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-black text-deepBlue transition hover:border-customBlue hover:text-customBlue"
      >
        <BookOpen size={12} />
        عرض الدورة
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [legacyDash, setLegacyDash] = useState<TeacherDashboardData | null>(null)
  const [insLms, setInsLms] = useState<InstructorLmsDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور'

  useEffect(() => {
    let alive = true
    setIsLoading(true)
    void Promise.all([
      apiClient
        .get('/dashboard/teacher', { skipErrorToast: true })
        .then((res) => normalise(res.data))
        .catch(() => null),
      fetchInstructorLmsDashboard().catch(() => null),
    ])
      .then(([legacy, lms]) => {
        if (!alive) return
        setLegacyDash(legacy)
        setInsLms(lms)
      })
      .finally(() => {
        if (alive) setIsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const effective = useMemo(() => {
    const legacy = legacyDash
    const lms = insLms
    if (legacy?.stats || (legacy?.courses && legacy.courses.length > 0)) {
      return {
        stats: legacy.stats,
        courses: legacy.courses ?? [],
        sessions: legacy.upcoming_sessions ?? [],
      }
    }
    const courses = (lms?.assigned_courses ?? []).map(mapLmsCourseToTeaching)
    const sessions = (lms?.upcoming_sessions ?? []).map((s) => ({
      id: s.id,
      course_name: s.course_name,
      date: s.date ?? s.starts_at ?? '—',
      time: s.time,
      type: (s.type === 'offline' ? 'offline' : 'online') as 'online' | 'offline',
      location: s.location,
      meeting_link: s.meeting_link,
      platform: (s.platform as string | undefined) ?? undefined,
    }))
    return {
      stats: {
        total_students: lms?.student_count ?? 0,
        upcoming_sessions: sessions.length,
        active_courses: courses.filter((c) => c.status !== 'completed').length,
        completion_rate: 0,
      },
      courses,
      sessions,
    }
  }, [legacyDash, insLms])

  if (isLoading) return <TeacherSkeleton />

  const { stats, courses, sessions } = effective

  const statCards = [
    { title: 'إجمالي الطلاب', value: stats.total_students, icon: Users, color: 'blue' as const },
    { title: 'الجلسات القادمة', value: stats.upcoming_sessions, icon: Calendar, color: 'orange' as const },
    { title: 'الدورات النشطة', value: stats.active_courses, icon: BookOpen, color: 'green' as const },
    {
      title: 'نسبة الإتمام',
      value: stats.completion_rate > 0 ? `${stats.completion_rate}%` : '—',
      icon: GraduationCap,
      color: 'purple' as const,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-deepBlue px-7 py-6 text-right text-white shadow-sm">
        <p className="text-sm font-bold text-white/60">{greeting}،</p>
        <h1 className="mt-1 text-2xl font-black">{user?.name ?? 'مرحباً'} 👋</h1>
        <p className="mt-2 text-sm leading-7 text-white/65">
          بوابة التدريس — الجلسات، الحضور، وتقييم التسليمات ضمن منظومة EMC.
        </p>
      </div>

      {insLms && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LearningDashboardCard
            title="طلابي"
            value={insLms.student_count}
            hint="على مستوى الدورات المسندة"
            icon={Users}
            accent="blue"
          />
          <LearningDashboardCard
            title="حضور يحتاج تأكيداً"
            value={insLms.attendance_pending_count}
            hint="جلسات بانتظار الإغلاق"
            icon={UserCheck}
            accent="orange"
          />
          <LearningDashboardCard
            title="تسليمات بانتظار المراجعة"
            value={insLms.submissions_pending_count}
            hint="من قائمة الانتظار"
            icon={ClipboardList}
            accent="orange"
          />
          <LearningDashboardCard
            title="ملاحظات الإدارة"
            value="—"
            hint={insLms.admin_notes_placeholder ?? 'لا توجد ملاحظات بعد'}
            icon={FileText}
            accent="blue"
          />
        </div>
      )}

      {/* ── Stats grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* ── My courses ── */}
      <DashboardSection
        title="دوراتي"
        action={courses.length > 0 ? { label: 'عرض الكل', href: '/dashboard/instructor/courses' } : undefined}
      >
        {courses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((c) => (
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

      {/* ── Upcoming sessions ── */}
      <DashboardSection
        title="جلساتي القادمة"
        action={sessions.length > 0 ? { label: 'كل الجلسات', href: '/dashboard/instructor/sessions' } : undefined}
      >
        {sessions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {sessions.slice(0, 4).map((s) => (
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

      {/* ── Quick actions ── */}
      <DashboardSection title="إجراءات سريعة">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            icon={Calendar}
            label="جلساتي"
            description="الجدول والروابط"
            href="/dashboard/instructor/sessions"
            color="blue"
          />
          <QuickActionCard
            icon={UserCheck}
            label="الحضور"
            description="تسجيل الحضور بالجلسة"
            href="/dashboard/instructor/attendance"
            color="orange"
          />
          <QuickActionCard
            icon={ClipboardList}
            label="مراجعة التسليمات"
            description="درجات وملاحظات"
            href="/dashboard/instructor/submissions"
            color="green"
          />
          <QuickActionCard
            icon={FolderOpen}
            label="الموارد"
            description="مواد تعليمية"
            href="/dashboard/resources"
            color="purple"
          />
        </div>
      </DashboardSection>

    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TeacherSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-5 h-6 w-24 rounded-lg bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  )
}

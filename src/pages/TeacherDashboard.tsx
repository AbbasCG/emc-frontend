import axios from 'axios'
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
import { useEffect, useState } from 'react'
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
import type { InstructorLmsDashboard } from '@/types/lms'

// ---------------------------------------------------------------------------
// MOCK FALLBACK — remove when GET /api/dashboard/teacher is live
// ---------------------------------------------------------------------------
const MOCK: TeacherDashboardData = {
  stats: {
    total_students: 48,
    upcoming_sessions: 5,
    active_courses: 3,
    completion_rate: 72,
  },
  courses: [
    {
      id: 1,
      title: 'أساسيات اللغة الهولندية — المستوى الأول',
      slug: 'dutch-basics-1',
      student_count: 22,
      upcoming_sessions: 3,
      status: 'active',
    },
    {
      id: 2,
      title: 'مهارات التواصل المهني',
      slug: 'professional-communication',
      student_count: 15,
      upcoming_sessions: 2,
      status: 'active',
    },
    {
      id: 3,
      title: 'التدريب المهني التقني',
      slug: 'technical-vocational-training',
      student_count: 11,
      upcoming_sessions: 0,
      status: 'completed',
    },
  ],
  upcoming_sessions: [
    {
      id: 1,
      course_name: 'أساسيات اللغة الهولندية — المستوى الأول',
      date: '١٥ مايو ٢٠٢٦',
      time: '٤:٠٠ م — ٦:٠٠ م',
      type: 'online',
      meeting_link: '#',
      platform: 'zoom',
    },
    {
      id: 2,
      course_name: 'مهارات التواصل المهني',
      date: '١٨ مايو ٢٠٢٦',
      time: '٢:٠٠ م — ٤:٠٠ م',
      type: 'offline',
      location: 'مركز EMC، أمستردام',
    },
  ],
}

function normalise(raw: unknown): TeacherDashboardData {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: TeacherDashboardData }).data
  }
  return raw as TeacherDashboardData
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
  const { label, cls } = statusConfig[course.status]

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
        to={`/courses/${course.slug}`}
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
  const [data, setData] = useState<TeacherDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [insLms, setInsLms] = useState<InstructorLmsDashboard | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور'

  useEffect(() => {
    let isMounted = true

    async function fetchDashboard() {
      try {
        setIsLoading(true)
        const response = await apiClient.get('/dashboard/teacher')
        if (!isMounted) return
        setData(normalise(response.data))
      } catch (err) {
        if (!isMounted || axios.isCancel(err)) return
        // MOCK FALLBACK — remove when /api/dashboard/teacher is live
        setData(MOCK)
        setUsingMock(true)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchDashboard()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    let alive = true
    fetchInstructorLmsDashboard()
      .then((row) => {
        if (alive) setInsLms(row)
      })
      .catch(() => {
        if (alive) setInsLms(null)
      })
    return () => {
      alive = false
    }
  }, [])

  if (isLoading) return <TeacherSkeleton />

  const { stats, courses, upcoming_sessions: sessions } = data ?? MOCK

  const statCards = [
    { title: 'إجمالي الطلاب',    value: stats.total_students,    icon: Users,         color: 'blue'   as const },
    { title: 'الجلسات القادمة',  value: stats.upcoming_sessions, icon: Calendar,      color: 'orange' as const },
    { title: 'الدورات النشطة',   value: stats.active_courses,    icon: BookOpen,      color: 'green'  as const },
    { title: 'نسبة الإتمام',     value: `${stats.completion_rate}%`, icon: GraduationCap, color: 'purple' as const },
  ]

  return (
    <div className="space-y-8">

      {/* DEV-only mock notice */}
      {usingMock && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-700 ring-1 ring-amber-100">
          ⚠️ يتم عرض بيانات تجريبية — نقطة نهاية /api/dashboard/teacher غير متاحة بعد.
        </div>
      )}

      {/* ── Welcome header ── */}
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
        action={courses.length > 0 ? { label: 'عرض الكل', href: '/dashboard/courses' } : undefined}
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
        action={sessions.length > 0 ? { label: 'كل الجلسات', href: '/dashboard/teacher/sessions' } : undefined}
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
                platform={s.platform ?? undefined}
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
            href="/dashboard/teacher/sessions"
            color="blue"
          />
          <QuickActionCard
            icon={UserCheck}
            label="الحضور"
            description="تسجيل الحضور بالجلسة"
            href="/dashboard/teacher/attendance"
            color="orange"
          />
          <QuickActionCard
            icon={ClipboardList}
            label="مراجعة التسليمات"
            description="درجات وملاحظات"
            href="/dashboard/teacher/submissions"
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

import axios from 'axios'
import {
  Bell,
  BookOpen,
  Calendar,
  ClipboardList,
  CreditCard,
  FolderOpen,
  GraduationCap,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/axios'
import { fetchStudentLmsDashboard } from '@/api/studentApi'
import {
  DashboardSection,
  EmptyState,
  EnrolledCourseCard,
  NotificationItem,
  QuickActionCard,
  StatCard,
  UpcomingSessionCard,
} from '../components/dashboard'
import { AssignmentCard, LearningDashboardCard, ProgressRing, SessionCard } from '@/components/lms'
import { useAuth } from '../contexts/AuthContext'
import type { DashboardStats, StudentDashboard, UpcomingSession } from '../types'
import type { LmsSession, StudentLmsDashboard } from '@/types/lms'

// ---------------------------------------------------------------------------
// MOCK FALLBACK — shown when GET /api/dashboard is not yet available.
// Remove MOCK constant + setUsingMock once the endpoint is live.
// ---------------------------------------------------------------------------
const MOCK: StudentDashboard = {
  stats: {
    enrolled_courses: 4,
    upcoming_sessions: 3,
    completed_certificates: 1,
    training_hours: 24,
  },
  enrollments: [
    {
      id: 1,
      course: {
        id: 1,
        title: 'أساسيات اللغة الهولندية — المستوى الأول',
        slug: 'dutch-basics-1',
        instructor_name: 'أستاذة سارة فان دايك',
        type: 'paid',
        price: 350,
        is_online: true,
      },
      enrolled_at: '2026-05-01',
      completed_sessions: 6,
      total_sessions: 12,
      status: 'active',
    },
    {
      id: 2,
      course: {
        id: 2,
        title: 'مهارات التواصل المهني',
        slug: 'professional-communication',
        instructor_name: 'أستاذ أحمد الرشيد',
        type: 'paid',
        price: 250,
        is_online: false,
      },
      enrolled_at: '2026-05-01',
      completed_sessions: 2,
      total_sessions: 8,
      status: 'active',
    },
    {
      id: 3,
      course: {
        id: 3,
        title: 'التدريب المهني التقني',
        slug: 'technical-vocational-training',
        instructor_name: 'أستاذ محمد الحسن',
        type: 'free',
        price: 0,
        is_online: true,
      },
      enrolled_at: '2026-04-01',
      completed_sessions: 10,
      total_sessions: 10,
      status: 'completed',
    },
    {
      id: 4,
      course: {
        id: 4,
        title: 'تطوير المهارات القيادية',
        slug: 'leadership-skills',
        instructor_name: 'أستاذة نور الهدى',
        type: 'paid',
        price: 400,
        is_online: false,
      },
      enrolled_at: '2026-05-05',
      completed_sessions: 0,
      total_sessions: 6,
      status: 'pending',
    },
  ],
  upcoming_sessions: [
    {
      id: 1,
      course_name: 'أساسيات اللغة الهولندية — المستوى الأول',
      date: '١٥ مايو ٢٠٢٦',
      time: '٤:٠٠ م — ٦:٠٠ م',
      type: 'online',
      instructor_name: 'أستاذة سارة فان دايك',
      meeting_link: '#',
      platform: 'zoom',
    },
    {
      id: 2,
      course_name: 'مهارات التواصل المهني',
      date: '١٨ مايو ٢٠٢٦',
      time: '٢:٠٠ م — ٤:٠٠ م',
      type: 'offline',
      instructor_name: 'أستاذ أحمد الرشيد',
      location: 'مركز EMC، أمستردام',
    },
  ],
  notifications: [
    {
      id: 1,
      title: 'تذكير بالجلسة القادمة',
      message: 'لديك جلسة غداً في دورة أساسيات اللغة الهولندية الساعة ٤:٠٠ م.',
      type: 'info',
      is_read: false,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      title: 'تم التسجيل بنجاح',
      message: 'تم تسجيلك في دورة مهارات التواصل المهني بنجاح.',
      type: 'success',
      is_read: true,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      title: 'تذكير بالدفع',
      message: 'يرجى إتمام دفع رسوم دورة تطوير المهارات القيادية قبل انتهاء المهلة.',
      type: 'warning',
      is_read: false,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
}

// ---------------------------------------------------------------------------
// Normalise /dashboard API — Laravel `{ data: ... }`, partial shapes, missing arrays.
// ---------------------------------------------------------------------------
const EMPTY_STATS: DashboardStats = {
  enrolled_courses: 0,
  upcoming_sessions: 0,
  completed_certificates: 0,
  training_hours: 0,
}

function toFiniteStat(n: unknown, fallback = 0): number {
  if (typeof n === 'number' && Number.isFinite(n)) return n
  const x = Number(n)
  return Number.isFinite(x) ? x : fallback
}

function unwrapDashboardPayload(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: unknown }).data
  return raw
}

function normalizeStudentDashboard(raw: unknown): StudentDashboard {
  const inner = unwrapDashboardPayload(raw)
  if (!inner || typeof inner !== 'object') {
    return {
      stats: { ...EMPTY_STATS },
      enrollments: [],
      upcoming_sessions: [],
      notifications: [],
    }
  }

  const o = inner as Partial<StudentDashboard>
  const statsIn = o.stats && typeof o.stats === 'object' ? o.stats : {}
  const s = statsIn as Partial<DashboardStats>

  return {
    stats: {
      enrolled_courses: toFiniteStat(s.enrolled_courses, EMPTY_STATS.enrolled_courses),
      upcoming_sessions: toFiniteStat(s.upcoming_sessions, EMPTY_STATS.upcoming_sessions),
      completed_certificates: toFiniteStat(s.completed_certificates, EMPTY_STATS.completed_certificates),
      training_hours: toFiniteStat(s.training_hours, EMPTY_STATS.training_hours),
    },
    enrollments: Array.isArray(o.enrollments) ? o.enrollments : [],
    upcoming_sessions: Array.isArray(o.upcoming_sessions) ? o.upcoming_sessions : [],
    notifications: Array.isArray(o.notifications) ? o.notifications : [],
  }
}

function mapLmsSessionToUpcoming(s: LmsSession): UpcomingSession {
  return {
    id: s.id,
    course_name: s.course_name,
    date: s.date ?? s.starts_at ?? '—',
    time: s.time,
    type: s.type === 'offline' ? 'offline' : 'online',
    instructor_name: s.instructor_name,
    location: s.location,
    meeting_link: s.meeting_link,
    platform: (s.platform as UpcomingSession['platform']) ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<StudentDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [lmsDash, setLmsDash] = useState<StudentLmsDashboard | null>(null)
  const [lmsLoading, setLmsLoading] = useState(true)
  const [lmsError, setLmsError] = useState<string | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور'

  useEffect(() => {
    let isMounted = true

    async function fetchDashboard() {
      try {
        setIsLoading(true)
        const response = await apiClient.get('/dashboard')
        if (!isMounted) return
        setData(normalizeStudentDashboard(response.data))
      } catch (err) {
        if (!isMounted || axios.isCancel(err)) return
        // MOCK FALLBACK — remove when /api/dashboard is live
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
    setLmsLoading(true)
    setLmsError(null)
    fetchStudentLmsDashboard()
      .then((row) => {
        if (alive) {
          setLmsDash(row)
          setLmsError(null)
        }
      })
      .catch((err: unknown) => {
        if (!alive) return
        setLmsDash(null)
        const msg =
          axios.isAxiosError(err) ?
            (typeof err.response?.data === 'object' &&
            err.response?.data &&
            'message' in err.response.data &&
            typeof (err.response.data as { message: unknown }).message === 'string' ?
              (err.response.data as { message: string }).message
            : err.response?.status === 404 ?
              'لا توجد بيانات لوحة الطالب'
            : `تعذّر الاتصال بالخادم (${err.response?.status ?? '—'})`)
          : 'تعذّر تحميل لوحة التعلّم'
        setLmsError(msg)
      })
      .finally(() => {
        if (alive) setLmsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (isLoading) return <DashboardSkeleton />

  if (!data) return <DashboardSkeleton />

  const { stats, enrollments, upcoming_sessions: legacySessions, notifications: legacyNotifications } =
    normalizeStudentDashboard(data)

  const upcomingLms = lmsDash?.upcoming_sessions
  const sessions =
    Array.isArray(upcomingLms) && upcomingLms.length > 0 ?
      upcomingLms.map(mapLmsSessionToUpcoming)
    : legacySessions

  const lmsNotify = lmsDash?.notifications
  const notifications =
    Array.isArray(lmsNotify) && lmsNotify.length > 0 ? lmsNotify : legacyNotifications

  const pendingAssignments = Array.isArray(lmsDash?.pending_assignments) ? lmsDash.pending_assignments : []
  const pendingDueCount = pendingAssignments.filter((a) => a.status === 'pending' || a.status === 'late').length

  const statCards = [
    { title: 'الدورات المسجلة',    value: String(stats.enrolled_courses),     icon: BookOpen,      color: 'blue'   as const },
    { title: 'الجلسات القادمة',    value: String(stats.upcoming_sessions),    icon: Calendar,      color: 'orange' as const },
    { title: 'الشهادات المكتملة',  value: String(stats.completed_certificates), icon: GraduationCap, color: 'green'  as const },
    { title: 'ساعات التدريب',      value: String(stats.training_hours),       icon: Users,         color: 'purple' as const },
  ]

  return (
    <div className="space-y-8">

      {/* ── DEV-only mock data notice ── */}
      {usingMock && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-700 ring-1 ring-amber-100">
          ⚠️ يتم عرض بيانات تجريبية — نقطة نهاية /api/dashboard غير متاحة بعد.
        </div>
      )}

      {/* ── Welcome header ── */}
      <div className="rounded-2xl bg-deepBlue px-7 py-6 text-right text-white shadow-sm">
        <p className="text-sm font-bold text-white/60">{greeting}،</p>
        <h1 className="mt-1 text-2xl font-black">مرحبًا بك، {user?.name ?? 'متعلّم EMC'} 👋</h1>
        <p className="mt-2 text-sm leading-7 text-white/65">
          إليك ملخص نشاطك التعليمي اليوم على منصة EMC — لوحة التعلم والجدول والواجبات في مكان واحد.
        </p>
      </div>

      {lmsLoading && (
        <div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 ring-1 ring-slate-200/70" />
          ))}
        </div>
      )}

      {lmsError && !lmsLoading && (
        <div className="rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-right text-sm font-bold leading-relaxed text-red-800 ring-1 ring-red-100">
          لم يتم تحميل لوحة التعلّم (LMS). {lmsError}
        </div>
      )}

      {!lmsLoading && lmsDash && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LearningDashboardCard
            title="نسبة التقدم"
            value={`${Math.round(lmsDash.progress_percent)}%`}
            hint="إنجاز المحتوى والجلسات"
            icon={TrendingUp}
            accent="blue"
          />
          <LearningDashboardCard
            title="نسبة الحضور"
            value={`${Math.round(lmsDash.attendance_percent)}%`}
            hint="حسب الجلسات المسجلة"
            icon={Calendar}
            accent="orange"
          />
          <LearningDashboardCard
            title="واجبات مطلوبة"
            value={pendingDueCount}
            hint="بانتظار التسليم"
            icon={ClipboardList}
            accent="orange"
          />
          <LearningDashboardCard
            title="شهادات قادمة"
            value={Array.isArray(lmsDash.certificates_placeholder) ? lmsDash.certificates_placeholder.length : 0}
            hint="Placeholder حتى يكتمل المسار"
            icon={GraduationCap}
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

      {/* ── Enrolled courses ── */}
      <DashboardSection
        title="دوراتي المسجلة"
        action={enrollments.length > 0 ? { label: 'عرض الكل', href: '/dashboard/courses' } : undefined}
      >
        {enrollments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {enrollments.slice(0, 4).map((e) => (
              <EnrolledCourseCard key={e.id} enrollment={e} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="لم تسجل في أي دورة بعد"
            description="تصفح دوراتنا واختر ما يناسبك لبدء رحلتك التعليمية."
            action={{ label: 'تصفح الدورات', href: '/courses' }}
          />
        )}
      </DashboardSection>

      {lmsDash && Array.isArray(lmsDash.current_courses) && lmsDash.current_courses.length > 0 && (
        <DashboardSection
          title="الدورات الحالية"
          subtitle="متابعة مباشرة من لوحة التعلم."
          action={{ label: 'التقدم التفصيلي', href: '/dashboard/student/progress' }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lmsDash.current_courses.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-sm ring-1 ring-white"
              >
                <p className="text-sm font-black text-deepBlue">{c.title}</p>
                {c.instructor_name && (
                  <p className="mt-1 text-xs font-bold text-slate-500">مدرب: {c.instructor_name}</p>
                )}
                {c.progress_percent != null && (
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <ProgressRing percent={c.progress_percent} size={72} stroke={6} />
                    {c.slug && (
                      <Link
                        to={`/courses/${c.slug}`}
                        className="text-xs font-black text-customBlue hover:underline"
                      >
                        صفحة الدورة
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DashboardSection>
      )}

      {lmsDash && pendingAssignments.length > 0 && (
        <DashboardSection
          title="واجبات تحتاج تسليماً"
          action={{ label: 'كل الواجبات', href: '/dashboard/student/assignments' }}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {pendingAssignments.slice(0, 4).map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        </DashboardSection>
      )}

      {lmsDash &&
        Array.isArray(lmsDash.certificates_placeholder) &&
        lmsDash.certificates_placeholder.length > 0 && (
        <DashboardSection title="الشهادات القادمة" subtitle="Placeholder إلى حين تفعيل إصدار الشهادات.">
          <div className="grid gap-3 sm:grid-cols-2">
            {lmsDash.certificates_placeholder.map((c, i) => (
              <div
                key={i}
                className="rounded-xl border border-dashed border-customOrange/35 bg-orange-50/50 px-4 py-3 text-right"
              >
                <p className="font-black text-deepBlue">{c.label}</p>
                {c.note && <p className="mt-1 text-xs font-semibold text-slate-600">{c.note}</p>}
              </div>
            ))}
          </div>
        </DashboardSection>
      )}

      {/* ── Sessions + Notifications (two-column) ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">

        {/* Upcoming sessions */}
        <DashboardSection
          title="الجلسات القادمة"
          action={
            sessions.length > 0 ? { label: 'عرض الكل', href: '/dashboard/student/sessions' } : undefined
          }
        >
          {sessions.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.isArray(upcomingLms) && upcomingLms.length > 0 ?
                upcomingLms.slice(0, 4).map((s) => <SessionCard key={s.id} session={s} />)
              : sessions.slice(0, 4).map((s) => (
                  <UpcomingSessionCard
                    key={s.id}
                    courseName={s.course_name}
                    date={s.date}
                    time={s.time ?? undefined}
                    type={s.type}
                    instructor={s.instructor_name ?? undefined}
                    location={s.location ?? undefined}
                    meetingLink={s.meeting_link ?? undefined}
                    platform={s.platform ?? undefined}
                  />
                ))
              }
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="لا توجد جلسات قادمة"
              description="عند تسجيلك في دورة، ستظهر جلساتها هنا."
              action={{ label: 'تصفح الدورات', href: '/courses' }}
            />
          )}
        </DashboardSection>

        {/* Notifications / آخر التنبيهات */}
        <DashboardSection
          title="آخر التنبيهات"
          action={notifications.length > 0 ? { label: 'عرض الكل', href: '/dashboard/notifications' } : undefined}
        >
          {notifications.length > 0 ? (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              {notifications.slice(0, 5).map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title="لا توجد إشعارات"
              description="ستظهر هنا التحديثات المتعلقة بدوراتك وجلساتك."
            />
          )}
        </DashboardSection>

      </div>

      {/* ── Quick actions ── */}
      <DashboardSection title="إجراءات سريعة">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            icon={BookOpen}
            label="تصفح الدورات"
            description="كتالوج EMC العام"
            href="/courses"
            color="blue"
          />
          <QuickActionCard
            icon={Calendar}
            label="جلساتي"
            description="الجلسات القادمة والسجل"
            href="/dashboard/student/sessions"
            color="orange"
          />
          <QuickActionCard
            icon={FolderOpen}
            label="المواد التعليمية"
            description="ملفات وروابط الدورة"
            href="/dashboard/student/materials"
            color="green"
          />
          <QuickActionCard
            icon={ClipboardList}
            label="الواجبات"
            description="التسليم والدرجات"
            href="/dashboard/student/assignments"
            color="purple"
          />
          <QuickActionCard
            icon={TrendingUp}
            label="التقدم"
            description="لوحة الإنجاز والحضور"
            href="/dashboard/student/progress"
            color="blue"
          />
          <QuickActionCard
            icon={GraduationCap}
            label="تقييم تجربة التعلم"
            description="ساعدنا على التحسين"
            href="/dashboard/student/evaluation"
            color="orange"
          />
          <QuickActionCard
            icon={Users}
            label="تواصل معنا"
            description="الدعم والمساعدة"
            href="/contact"
            color="purple"
          />
        </div>
      </DashboardSection>

      {/* ── Phase 1 placeholders + LMS summary ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardSection title="حالة المدفوعات">
          <EmptyState
            icon={CreditCard}
            title="لا توجد مدفوعات لعرضها"
            description="عند التسجيل في دورة مدفوعة ستظهر حالة الدفع والفواتير هنا بعد ربط واجهة البرمجة."
          />
        </DashboardSection>
        <DashboardSection title="التقدم في التعلم">
          {!lmsLoading && lmsDash ?
            <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-deepBlue/[0.06] sm:flex-row-reverse sm:justify-between">
              <div className="flex gap-8">
                <ProgressRing percent={lmsDash.progress_percent} label="إنجاز" size={100} stroke={9} />
                <ProgressRing percent={lmsDash.attendance_percent} label="حضور" size={100} stroke={9} />
              </div>
              <Link
                to="/dashboard/student/progress"
                className="rounded-xl bg-deepBlue px-5 py-2.5 text-xs font-black text-white shadow-md"
              >
                فتح لوحة التقدم
              </Link>
            </div>
          : <EmptyState
              icon={TrendingUp}
              title="لوحة التقدم قيد الإعداد"
              description="يتصل هذا القسم بـ GET /api/student/progress عند تفعيل الخادم."
            />
          }
        </DashboardSection>
      </div>

    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-5 h-6 w-36 rounded-lg bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="h-64 rounded-2xl bg-slate-200" />
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
    </div>
  )
}

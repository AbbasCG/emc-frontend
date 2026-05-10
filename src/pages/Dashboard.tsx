import axios from 'axios'
import { Bell, BookOpen, Calendar, GraduationCap, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import apiClient from '../api/axios'
import {
  DashboardSection,
  EmptyState,
  EnrolledCourseCard,
  NotificationItem,
  QuickActionCard,
  StatCard,
  UpcomingSessionCard,
} from '../components/dashboard'
import { useAuth } from '../contexts/AuthContext'
import type { StudentDashboard } from '../types'

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
// Normalise API response — handles both `{ ...data }` and `{ data: {...} }`
// ---------------------------------------------------------------------------
function normalise(raw: unknown): StudentDashboard {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: StudentDashboard }).data
  }
  return raw as StudentDashboard
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<StudentDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور'

  useEffect(() => {
    let isMounted = true

    async function fetchDashboard() {
      try {
        setIsLoading(true)
        const response = await apiClient.get('/dashboard')
        if (!isMounted) return
        setData(normalise(response.data))
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

  if (isLoading) return <DashboardSkeleton />

  const { stats, enrollments, upcoming_sessions: sessions, notifications } = data ?? MOCK

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
        <h1 className="mt-1 text-2xl font-black">{user?.name ?? 'مرحباً بك'} 👋</h1>
        <p className="mt-2 text-sm leading-7 text-white/65">
          إليك ملخص نشاطك التعليمي اليوم على منصة EMC.
        </p>
      </div>

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

      {/* ── Sessions + Notifications (two-column) ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">

        {/* Upcoming sessions */}
        <DashboardSection
          title="الجلسات القادمة"
          action={sessions.length > 0 ? { label: 'عرض الكل', href: '/dashboard/schedule' } : undefined}
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
                  instructor={s.instructor_name ?? undefined}
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
              description="عند تسجيلك في دورة، ستظهر جلساتها هنا."
              action={{ label: 'تصفح الدورات', href: '/courses' }}
            />
          )}
        </DashboardSection>

        {/* Notifications */}
        <DashboardSection
          title="الإشعارات"
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            icon={BookOpen}
            label="تصفح الدورات"
            description="اكتشف برامجنا التدريبية"
            href="/courses"
            color="blue"
          />
          <QuickActionCard
            icon={Calendar}
            label="الجدول الزمني"
            description="جلساتك المجدولة"
            href="/dashboard/schedule"
            color="orange"
          />
          <QuickActionCard
            icon={GraduationCap}
            label="شهاداتي"
            description="الشهادات المكتملة"
            href="/dashboard/certificates"
            color="green"
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

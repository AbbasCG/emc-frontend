import axios from 'axios'
import { BarChart3, BookOpen, GraduationCap, Settings, UserCog, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import apiClient from '../api/axios'
import {
  DashboardSection,
  DataTable,
  type DataTableColumn,
  QuickActionCard,
  StatCard,
} from '../components/dashboard'
import { useAuth } from '../contexts/AuthContext'
import type { AdminDashboardData, RecentRegistration } from '../types'

// ---------------------------------------------------------------------------
// MOCK FALLBACK — remove when GET /api/dashboard/admin is live
// ---------------------------------------------------------------------------
const MOCK: AdminDashboardData = {
  stats: {
    total_users: 312,
    active_courses: 9,
    total_enrollments: 184,
    total_programs: 5,
  },
  recent_registrations: [
    { id: 1, student_name: 'محمد عبد الله',  course_name: 'أساسيات اللغة الهولندية',  enrolled_at: '2026-05-08', status: 'active'    },
    { id: 2, student_name: 'فاطمة الزهراء',  course_name: 'مهارات التواصل المهني',     enrolled_at: '2026-05-07', status: 'pending'   },
    { id: 3, student_name: 'أحمد علي',        course_name: 'التدريب المهني التقني',     enrolled_at: '2026-05-06', status: 'active'    },
    { id: 4, student_name: 'نور محمد',        course_name: 'تطوير المهارات القيادية',   enrolled_at: '2026-05-05', status: 'active'    },
    { id: 5, student_name: 'عمر خالد',        course_name: 'أساسيات اللغة الهولندية',  enrolled_at: '2026-05-04', status: 'completed' },
  ],
}

function normalise(raw: unknown): AdminDashboardData {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: AdminDashboardData }).data
  }
  return raw as AdminDashboardData
}

// ---------------------------------------------------------------------------
// DataTable column definitions for recent registrations
// ---------------------------------------------------------------------------

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    active:    { label: 'نشط',    cls: 'bg-emerald-50 text-emerald-600' },
    pending:   { label: 'معلق',   cls: 'bg-amber-50   text-amber-600'  },
    completed: { label: 'مكتمل', cls: 'bg-slate-50   text-slate-500'  },
  }
  const entry = map[status] ?? { label: status, cls: 'bg-slate-50 text-slate-500' }
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${entry.cls}`}>
      {entry.label}
    </span>
  )
}

const registrationColumns: DataTableColumn<RecentRegistration>[] = [
  { key: 'student_name', header: 'الطالب'      },
  { key: 'course_name',  header: 'الدورة'       },
  {
    key: 'enrolled_at',
    header: 'تاريخ التسجيل',
    render: (row) => formatDate(row.enrolled_at),
  },
  {
    key: 'status',
    header: 'الحالة',
    width: '120px',
    render: (row) => statusBadge(row.status),
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور'

  useEffect(() => {
    let isMounted = true

    async function fetchDashboard() {
      try {
        setIsLoading(true)
        const response = await apiClient.get('/dashboard/admin')
        if (!isMounted) return
        setData(normalise(response.data))
      } catch (err) {
        if (!isMounted || axios.isCancel(err)) return
        // MOCK FALLBACK — remove when /api/dashboard/admin is live
        setData(MOCK)
        setUsingMock(true)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchDashboard()
    return () => { isMounted = false }
  }, [])

  if (isLoading) return <AdminSkeleton />

  const { stats, recent_registrations } = data ?? MOCK

  const statCards = [
    { title: 'إجمالي المستخدمين',  value: stats.total_users,       icon: Users,         color: 'blue'   as const },
    { title: 'الدورات النشطة',     value: stats.active_courses,    icon: BookOpen,      color: 'orange' as const },
    { title: 'إجمالي التسجيلات',   value: stats.total_enrollments, icon: GraduationCap, color: 'green'  as const },
    { title: 'البرامج التدريبية',  value: stats.total_programs,    icon: BarChart3,     color: 'purple' as const },
  ]

  return (
    <div className="space-y-8">

      {/* DEV-only mock notice */}
      {usingMock && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-700 ring-1 ring-amber-100">
          ⚠️ يتم عرض بيانات تجريبية — نقطة نهاية /api/dashboard/admin غير متاحة بعد.
        </div>
      )}

      {/* ── Welcome header ── */}
      <div className="rounded-2xl bg-deepBlue px-7 py-6 text-right text-white shadow-sm">
        <p className="text-sm font-bold text-white/60">{greeting}،</p>
        <h1 className="mt-1 text-2xl font-black">{user?.name ?? 'مرحباً'} 👋</h1>
        <p className="mt-2 text-sm leading-7 text-white/65">
          إليك نظرة عامة على منصة EMC اليوم.
        </p>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* ── Recent registrations ── */}
      <DashboardSection
        title="التسجيلات الأخيرة"
        action={{ label: 'عرض الكل', href: '/dashboard/registrations' }}
      >
        <DataTable<RecentRegistration>
          columns={registrationColumns}
          data={recent_registrations}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد تسجيلات حديثة"
        />
      </DashboardSection>

      {/* ── Quick actions ── */}
      <DashboardSection title="إجراءات سريعة">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            icon={UserCog}
            label="المستخدمون"
            description="إدارة حسابات المستخدمين"
            href="/dashboard/users"
            color="blue"
          />
          <QuickActionCard
            icon={BookOpen}
            label="الدورات"
            description="إدارة الدورات والبرامج"
            href="/dashboard/courses"
            color="orange"
          />
          <QuickActionCard
            icon={BarChart3}
            label="التقارير"
            description="تقارير الأداء والإحصاءات"
            href="/dashboard/reports"
            color="green"
          />
          <QuickActionCard
            icon={Settings}
            label="الإعدادات"
            description="إعدادات النظام والمنصة"
            href="/dashboard/settings"
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

function AdminSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-5 h-6 w-40 rounded-lg bg-slate-200" />
        <div className="h-64 rounded-xl bg-slate-100" />
      </div>
    </div>
  )
}

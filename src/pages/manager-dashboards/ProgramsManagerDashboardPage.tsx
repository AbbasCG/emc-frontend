import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  BookMarked,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileBarChart,
  FolderOpen,
  GraduationCap,
  Layers,
  Loader2,
  PieChart,
  RefreshCw,
  UserCheck,
  Users,
} from 'lucide-react'
import { DashboardHero } from '@/components/dashboard'
import {
  fetchProgramsManagerDashboard,
  type ProgramsManagerDashboard,
  type RecentCourse,
  type RecentLearningPath,
  type UpcomingSession,
  type DashboardWarning,
} from '@/api/programsManagerApi'

// ─── helpers ────────────────────────────────────────────────────────────────

function hourGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'مساء الخير'
  return 'مساء النور'
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, accent = false }: {
  label: string
  value: number | string
  icon: React.ElementType
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${accent ? 'border-amber-200 bg-amber-50' : 'border-deepBlue/[0.06] bg-white'}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-[11px] font-semibold ${accent ? 'text-amber-700' : 'text-deepBlue/50'}`}>{label}</span>
        <Icon size={16} className={accent ? 'text-amber-500' : 'text-customBlue/60'} />
      </div>
      <p className={`text-2xl font-black ${accent ? 'text-amber-800' : 'text-deepBlue'}`}>{value}</p>
    </div>
  )
}

// ─── Quick Action ────────────────────────────────────────────────────────────

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-xl border border-deepBlue/[0.07] bg-deepBlue/[0.02] px-4 py-3.5 text-[12px] font-black text-deepBlue shadow-sm transition hover:border-customBlue/35 hover:bg-customBlue/[0.05] hover:shadow-md"
    >
      <Icon size={16} className="shrink-0 text-customBlue" aria-hidden />
      {label}
    </Link>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-deepBlue/[0.06] ${className}`} />
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-sm">
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  )
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: 'bg-green-100 text-green-700',
    draft:     'bg-amber-100 text-amber-700',
    active:    'bg-blue-100 text-blue-700',
  }
  const labels: Record<string, string> = {
    published: 'منشور',
    draft:     'مسودة',
    active:    'نشط',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}

// ─── Warning item ─────────────────────────────────────────────────────────────

function WarningItem({ warning }: { warning: DashboardWarning }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
      <p className="text-[12px] font-semibold text-amber-800">{warning.message}</p>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ProgramsManagerDashboardPage() {
  const [data, setData] = useState<ProgramsManagerDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchProgramsManagerDashboard()
      setData(result)
    } catch {
      setError('تعذّر تحميل بيانات اللوحة. تأكد من الاتصال بالشبكة ثم أعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const counts = data?.counts

  return (
    <div dir="rtl" className="space-y-8 text-right">
      {/* Hero */}
      <DashboardHero
        greeting={hourGreeting()}
        name="إدارة البرامج والمسارات"
        role="مدير البرامج والمسارات — EMC"
        subtitle="إدارة الدورات، المسارات التعليمية، نظام LMS، ومتابعة التقدم والتسجيلات."
        actions={
          <>
            <Link to="/dashboard/admin/programs"                  className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">البرامج والدورات</Link>
            <Link to="/dashboard/programs-manager/learning-paths" className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">المسارات التعليمية</Link>
            <Link to="/dashboard/admin/registrations"             className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">التسجيلات</Link>
            <Link to="/dashboard/admin/reports"                   className="rounded-2xl border border-white/[0.14] bg-white/[0.10] px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]">التقارير</Link>
          </>
        }
      />

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
          <AlertTriangle size={32} className="text-red-400" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button onClick={load} className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-[12px] font-black text-white transition hover:bg-red-700">
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      )}

      {/* KPI Cards */}
      {loading ? <KpiSkeleton /> : !error && counts && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="إجمالي الدورات"         value={counts.courses}               icon={GraduationCap} />
          <KpiCard label="الدورات المنشورة"        value={counts.published_courses}      icon={CheckCircle2}  />
          <KpiCard label="المسارات التعليمية"      value={counts.learning_paths}         icon={Layers}        />
          <KpiCard label="المسارات النشطة"         value={counts.active_learning_paths}  icon={BookMarked}    />
          <KpiCard label="إجمالي التسجيلات"        value={counts.registrations}          icon={UserCheck}     />
          <KpiCard label="الطلاب المسجلون"         value={counts.students}               icon={Users}         />
          <KpiCard label="الجلسات القادمة"         value={counts.sessions}               icon={Calendar}      />
          <KpiCard label="الدورات بدون مدرب"       value={counts.draft_courses}          icon={AlertTriangle} accent={counts.draft_courses > 0} />
        </div>
      )}

      {/* Warnings */}
      {!loading && !error && data && data.warnings.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
            <AlertTriangle size={15} className="text-amber-500" />
            تنبيهات تحتاج مراجعة
          </h2>
          {data.warnings.map((w) => <WarningItem key={w.type} warning={w} />)}
        </section>
      )}

      {/* Quick actions */}
      <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-deepBlue">
          <BookOpen size={15} className="text-customBlue" /> إجراءات سريعة
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <QuickAction href="/dashboard/admin/programs"                  label="البرامج والدورات"      icon={GraduationCap} />
          <QuickAction href="/dashboard/programs-manager/learning-paths" label="المسارات التعليمية"   icon={Layers}        />
          <QuickAction href="/dashboard/admin/registrations"             label="التسجيلات"             icon={UserCheck}     />
          <QuickAction href="/dashboard/admin/lms/sessions"              label="الجلسات"               icon={Calendar}      />
          <QuickAction href="/dashboard/admin/lms/assignments"           label="الواجبات"              icon={ClipboardList} />
          <QuickAction href="/dashboard/admin/lms/materials"             label="المواد التعليمية"      icon={FolderOpen}    />
          <QuickAction href="/dashboard/admin/lms/progress"              label="متابعة التقدم"         icon={BarChart3}     />
          <QuickAction href="/dashboard/admin/reports"                   label="التقارير"              icon={FileBarChart}  />
          <QuickAction href="/dashboard/admin/kpi"                       label="مؤشرات الأداء"        icon={PieChart}      />
        </div>
      </section>

      {/* Recent Courses */}
      {!loading && !error && data && (
        <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
              <GraduationCap size={15} className="text-customBlue" /> أحدث الدورات
            </h2>
            <Link to="/dashboard/admin/programs" className="text-[11px] font-bold text-customBlue hover:underline">
              عرض الكل ←
            </Link>
          </div>
          {data.recent_courses.length === 0 ? (
            <p className="py-8 text-center text-sm text-deepBlue/40">لا توجد دورات بعد.</p>
          ) : (
            <div className="divide-y divide-deepBlue/[0.04]">
              {data.recent_courses.map((c: RecentCourse) => (
                <div key={c.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-deepBlue">{c.title}</p>
                    <p className="text-[11px] text-deepBlue/50">{c.instructor_name ?? 'لا يوجد مدرب'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-[11px] text-deepBlue/50">{c.registrations_count} تسجيل</span>
                    <StatusBadge status={c.status} />
                    <Link to="/dashboard/admin/programs" className="rounded-lg bg-customBlue/10 px-3 py-1 text-[11px] font-bold text-customBlue transition hover:bg-customBlue/20">
                      إدارة
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recent Learning Paths */}
      {!loading && !error && data && (
        <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
              <Layers size={15} className="text-customBlue" /> المسارات التعليمية
            </h2>
            <Link to="/dashboard/programs-manager/learning-paths" className="text-[11px] font-bold text-customBlue hover:underline">
              إدارة المسارات ←
            </Link>
          </div>
          {data.recent_learning_paths.length === 0 ? (
            <p className="py-8 text-center text-sm text-deepBlue/40">
              لا توجد مسارات تعليمية.{' '}
              <Link to="/dashboard/programs-manager/learning-paths" className="font-bold text-customBlue hover:underline">
                أنشئ مساراً
              </Link>
            </p>
          ) : (
            <div className="divide-y divide-deepBlue/[0.04]">
              {data.recent_learning_paths.map((p: RecentLearningPath) => (
                <div key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-deepBlue">{p.title}</p>
                    <p className="text-[11px] text-deepBlue/50">{p.courses_count} دورة</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={p.status} />
                    <Link to="/dashboard/programs-manager/learning-paths" className="rounded-lg bg-customBlue/10 px-3 py-1 text-[11px] font-bold text-customBlue transition hover:bg-customBlue/20">
                      إدارة المسار
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Upcoming Sessions */}
      {!loading && !error && data && data.upcoming_sessions.length > 0 && (
        <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
              <Calendar size={15} className="text-customBlue" /> الجلسات القادمة
            </h2>
            <Link to="/dashboard/admin/lms/sessions" className="text-[11px] font-bold text-customBlue hover:underline">
              عرض الكل ←
            </Link>
          </div>
          <div className="divide-y divide-deepBlue/[0.04]">
            {data.upcoming_sessions.map((s: UpcomingSession) => (
              <div key={s.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-deepBlue">{s.course_title ?? '—'}</p>
                  <p className="text-[11px] text-deepBlue/50">
                    {formatDate(s.session_date)}
                    {s.start_time ? ` · ${s.start_time}` : ''}
                    {s.location ? ` · ${s.location}` : ''}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Loading spinner overlay for initial load */}
      {loading && !error && (
        <div className="flex items-center justify-center py-4 text-deepBlue/40">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
    </div>
  )
}

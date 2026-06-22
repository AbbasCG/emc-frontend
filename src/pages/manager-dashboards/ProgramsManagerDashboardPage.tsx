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
  Info,
  Layers,
  Loader2,
  PieChart,
  RefreshCw,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'
import { DashboardHero } from '@/components/dashboard'
import {
  fetchProgramsManagerDashboard,
  type ProgramsManagerDashboard,
  type RecentCourse,
  type RecentLearningPath,
  type PendingRegistration,
  type UpcomingSession,
  type ProgramAlert,
} from '@/api/programsManagerApi'

// ─── helpers ────────────────────────────────────────────────────────────────

function hourGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'مساء الخير'
  return 'مساء النور'
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, accent = false, warn = false }: {
  label: string
  value: number | string
  icon: React.ElementType
  accent?: boolean
  warn?: boolean
}) {
  const base = warn
    ? 'border-amber-200 bg-amber-50'
    : accent
    ? 'border-customBlue/20 bg-customBlue/[0.04]'
    : 'border-deepBlue/[0.06] bg-white'

  const labelColor = warn ? 'text-amber-700' : accent ? 'text-customBlue/70' : 'text-deepBlue/50'
  const iconColor  = warn ? 'text-amber-500' : 'text-customBlue/60'
  const valueColor = warn ? 'text-amber-800' : 'text-deepBlue'

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${base}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-[11px] font-semibold ${labelColor}`}>{label}</span>
        <Icon size={16} className={iconColor} />
      </div>
      <p className={`text-2xl font-black ${valueColor}`}>{value}</p>
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
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
    pending:   'bg-orange-100 text-orange-700',
    approved:  'bg-green-100 text-green-700',
    rejected:  'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    published: 'منشور',
    draft:     'مسودة',
    active:    'نشط',
    pending:   'قيد الانتظار',
    approved:  'مقبول',
    rejected:  'مرفوض',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}

// ─── Alert item ─────────────────────────────────────────────────────────────

function AlertItem({ alert }: { alert: ProgramAlert }) {
  const isWarn = alert.severity === 'warning'
  const isAction = alert.severity === 'action'
  const bg   = isAction ? 'border-orange-200 bg-orange-50' : isWarn ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'
  const icon = isAction ? <Zap size={15} className="mt-0.5 shrink-0 text-orange-500" /> : isWarn ? <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" /> : <Info size={15} className="mt-0.5 shrink-0 text-blue-500" />
  const textColor = isAction ? 'text-orange-800' : isWarn ? 'text-amber-800' : 'text-blue-800'

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${bg}`}>
      {icon}
      <p className={`text-[12px] font-semibold ${textColor}`}>{alert.message}</p>
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ label }: { label?: string }) {
  return (
    <p className="py-8 text-center text-sm text-deepBlue/40">
      {label ?? 'لا توجد بيانات حالياً'}
    </p>
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
      setError('تعذّر تحميل بيانات مدير البرامج والمسارات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Safe defaults — no crash if any field is missing
  const summary          = data?.summary
  const courses          = data?.courses          ?? []
  const learningPaths    = data?.learning_paths   ?? []
  const pendingRegs      = data?.pending_registrations ?? []
  const upcomingSessions = data?.upcoming_sessions ?? []
  const alerts           = data?.program_alerts   ?? []

  return (
    <div dir="rtl" className="space-y-8 text-right">
      {/* Hero */}
      <DashboardHero
        greeting={hourGreeting()}
        name="لوحة مدير البرامج والمسارات"
        role="مدير البرامج والمسارات — EMC"
        subtitle="إدارة الدورات، المسارات التعليمية، التسجيلات، ومتابعة أداء المتعلمين."
        quickStats={summary ? [
          { label: 'إجمالي الدورات',      value: summary.courses           },
          { label: 'المسارات التعليمية',  value: summary.learning_paths    },
          { label: 'الطلاب النشطون',      value: summary.active_students   },
          { label: 'التسجيلات المعلقة',   value: summary.pending_registrations },
          { label: 'الجلسات القادمة',     value: summary.upcoming_sessions },
          { label: 'واجبات معلقة',        value: summary.pending_assignments },
        ] : undefined}
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
      {loading ? <KpiSkeleton /> : !error && summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="البرامج والدورات"       value={summary.courses}              icon={GraduationCap} />
          <KpiCard label="المسارات التعليمية"     value={summary.learning_paths}       icon={Layers}        />
          <KpiCard label="التسجيلات المعلقة"      value={summary.pending_registrations} icon={ClipboardList} warn={summary.pending_registrations > 0} />
          <KpiCard label="الجلسات القادمة"        value={summary.upcoming_sessions}    icon={Calendar}      />
          <KpiCard label="الطلاب النشطون"         value={summary.active_students}      icon={Users}         />
          <KpiCard label="واجبات بانتظار المتابعة" value={summary.pending_assignments}  icon={CheckCircle2}  accent />
        </div>
      )}

      {/* Program Alerts */}
      {!loading && !error && alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
            <AlertTriangle size={15} className="text-amber-500" />
            تنبيهات تحتاج مراجعة
          </h2>
          {alerts.map((a) => <AlertItem key={a.type} alert={a} />)}
        </section>
      )}

      {/* Quick actions */}
      <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-deepBlue">
          <BookOpen size={15} className="text-customBlue" /> إجراءات سريعة
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <QuickAction href="/dashboard/admin/programs"                  label="إدارة الدورات"            icon={GraduationCap} />
          <QuickAction href="/dashboard/programs-manager/learning-paths" label="إدارة المسارات التعليمية" icon={Layers}        />
          <QuickAction href="/dashboard/admin/registrations"             label="مراجعة التسجيلات"         icon={UserCheck}     />
          <QuickAction href="/dashboard/admin/lms/sessions"              label="إدارة الجلسات"            icon={Calendar}      />
          <QuickAction href="/dashboard/admin/lms/assignments"           label="الواجبات"                 icon={ClipboardList} />
          <QuickAction href="/dashboard/admin/lms/materials"             label="المواد التعليمية"         icon={FolderOpen}    />
          <QuickAction href="/dashboard/admin/kpi"                       label="مؤشرات الأداء"           icon={PieChart}      />
          <QuickAction href="/dashboard/admin/reports"                   label="التقارير"                 icon={FileBarChart}  />
          <QuickAction href="/dashboard/admin/lms/evaluations"           label="التقييمات"                icon={BookMarked}    />
          <QuickAction href="/dashboard/admin/lms/progress"              label="متابعة التقدم"            icon={BarChart3}     />
        </div>
      </section>

      {/* Recent Courses */}
      {!loading && !error && (
        <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
              <GraduationCap size={15} className="text-customBlue" /> أحدث الدورات
            </h2>
            <Link to="/dashboard/admin/programs" className="text-[11px] font-bold text-customBlue hover:underline">
              عرض الكل ←
            </Link>
          </div>
          {courses.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-deepBlue/[0.04]">
              {courses.map((c: RecentCourse) => (
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
      {!loading && !error && (
        <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
              <Layers size={15} className="text-customBlue" /> المسارات التعليمية
            </h2>
            <Link to="/dashboard/programs-manager/learning-paths" className="text-[11px] font-bold text-customBlue hover:underline">
              إدارة المسارات ←
            </Link>
          </div>
          {learningPaths.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-deepBlue/[0.04]">
              {learningPaths.map((p: RecentLearningPath) => (
                <div key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-deepBlue">{p.title}</p>
                    <p className="text-[11px] text-deepBlue/50">{p.courses_count} دورة</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={p.status} />
                    <Link to="/dashboard/programs-manager/learning-paths" className="rounded-lg bg-customBlue/10 px-3 py-1 text-[11px] font-bold text-customBlue transition hover:bg-customBlue/20">
                      إدارة
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pending Registrations */}
      {!loading && !error && pendingRegs.length > 0 && (
        <section className="rounded-2xl border border-orange-200 bg-orange-50/40 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
              <Zap size={15} className="text-orange-500" /> تسجيلات بانتظار المراجعة
            </h2>
            <Link to="/dashboard/admin/registrations" className="text-[11px] font-bold text-customBlue hover:underline">
              عرض الكل ←
            </Link>
          </div>
          <div className="divide-y divide-deepBlue/[0.04]">
            {pendingRegs.map((r: PendingRegistration) => (
              <div key={r.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-deepBlue">{r.student ?? r.email ?? '—'}</p>
                  <p className="text-[11px] text-deepBlue/50">{r.course ?? '—'} · {formatDate(r.submitted_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={r.status} />
                  <Link to="/dashboard/admin/registrations" className="rounded-lg bg-customBlue/10 px-3 py-1 text-[11px] font-bold text-customBlue transition hover:bg-customBlue/20">
                    مراجعة
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Sessions */}
      {!loading && !error && upcomingSessions.length > 0 && (
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
            {upcomingSessions.map((s: UpcomingSession) => (
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

      {/* Loading spinner */}
      {loading && !error && (
        <div className="flex items-center justify-center py-4 text-deepBlue/40">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
    </div>
  )
}

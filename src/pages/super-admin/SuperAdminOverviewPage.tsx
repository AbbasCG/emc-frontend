import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Users,
  GraduationCap,
  UserCog,
  HeartHandshake,
  FileSignature,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Building2,
  RefreshCw,
  Activity,
  Minus,
  BarChart2,
  ClipboardList,
  UserPlus,
  Settings2,
} from 'lucide-react'
import { fetchAdminUsers, type AdminManagedUser } from '@/api/adminUsersApi'
import { fetchVolunteers } from '@/api/volunteersApi'
import {
  fetchAdminRegistrations,
  type AdminRegistrationListRow,
} from '@/api/adminRegistrationsApi'
import { fetchCoursesStrict } from '@/api/superAdminCatalogApi'
import {
  fetchAdminInstructorsDirectory,
  type AdminInstructorDirectoryRow,
} from '@/api/adminInstructorsApi'
import { fetchWorkspaceDepartmentsForSuperAdmin } from '@/api/superAdminOpsApi'
import { fetchFinanceDashboard } from '@/api/financeApi'
import { normalizeRole } from '@/utils/dashboardAccess'
import type { OpsVolunteer, WorkspaceDepartment } from '@/types/operations'
import type { Course } from '@/types'
import type { FinanceDashboardData } from '@/types/intelligence'

/* ══════════════════════════════════════════════════════════════════
   NUMBER HELPERS
   All UI uses Arabic text. Numbers always rendered with Western digits.
══════════════════════════════════════════════════════════════════ */

/** Render an integer with Western (English) digits */
function formatNumberEn(n: number): string {
  return n.toLocaleString('en-US')
}

/** Render a percentage with Western digits */
function formatPercentEn(n: number): string {
  return `${n}%`
}

/* ══════════════════════════════════════════════════════════════════
   DATE / TIME HELPERS
══════════════════════════════════════════════════════════════════ */

function calcGrowth(items: { created_at?: string | null }[]): number | null {
  const now = new Date()
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
  const by: Record<string, number> = {}
  items.forEach((item) => {
    if (!item.created_at) return
    const d = new Date(item.created_at)
    if (isNaN(d.getTime())) return
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    by[k] = (by[k] ?? 0) + 1
  })
  const cur = by[thisKey] ?? 0
  const last = by[prevKey] ?? 0
  if (last === 0) return null
  return Math.round(((cur - last) / last) * 100)
}

function last6(): { keys: string[]; labels: string[] } {
  const now = new Date()
  const keys: string[] = []
  const labels: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    // Arabic short month name
    labels.push(d.toLocaleDateString('ar-SA', { month: 'short' }))
  }
  return { keys, labels }
}

function groupByMonth(items: { created_at?: string | null }[]): Record<string, number> {
  const r: Record<string, number> = {}
  items.forEach((item) => {
    if (!item.created_at) return
    const d = new Date(item.created_at)
    if (isNaN(d.getTime())) return
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    r[k] = (r[k] ?? 0) + 1
  })
  return r
}

/** Returns Arabic relative time string */
function timeAgoAr(s: string | null | undefined): string {
  if (!s) return ''
  const diff = Date.now() - Date.parse(s)
  if (!Number.isFinite(diff) || diff < 0) return ''
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'الآن'
  if (m < 60) return `${m}د`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}س`
  return `${Math.floor(h / 24)}ي`
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function healthScore(dept: WorkspaceDepartment): number {
  if (dept.health_score != null) return Math.min(100, Math.max(0, dept.health_score))
  const base = dept.status === 'healthy' ? 85 : dept.status === 'risk' ? 28 : 58
  const leaderPenalty = dept.leader_name ? 0 : -10
  const taskPenalty = (dept.open_tasks ?? dept.open_tasks_count ?? 0) > 5 ? -8 : 0
  return Math.max(0, base + leaderPenalty + taskPenalty)
}

/* ══════════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
══════════════════════════════════════════════════════════════════ */

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100/80 ${className}`} />
}

/** Premium card wrapper */
function Card({
  children,
  className = '',
  noPad,
  accent,
}: {
  children: React.ReactNode
  className?: string
  noPad?: boolean
  accent?: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_4px_0_rgba(15,23,42,0.06)] ${noPad ? '' : 'p-5'} ${className}`}
    >
      {accent && (
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: accent }}
        />
      )}
      {children}
    </div>
  )
}

/** Arabic section heading with optional action link */
function SectionHead({
  title,
  sub,
  action,
}: {
  title: string
  sub?: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-2">
      <div>
        <h3 className="text-[13px] font-bold text-[#22334A]">{title}</h3>
        {sub && <p className="mt-0.5 text-[11px] font-medium text-slate-400">{sub}</p>}
      </div>
      {action && (
        <Link
          to={action.href}
          className="shrink-0 text-[11px] font-semibold text-[#2691C2] transition hover:text-[#1e7aaa]"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}

/** Arabic empty state */
function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[12px] font-medium text-slate-400">{text}</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   KPI STRIP
══════════════════════════════════════════════════════════════════ */

type KpiItem = {
  labelAr: string
  value: number | null
  growth: number | null
  icon: React.ElementType
  accent: string
  href?: string
}

function KpiCell({ item, loading }: { item: KpiItem; loading: boolean }) {
  const Icon = item.icon
  const isPos = item.growth !== null && item.growth > 0
  const isNeg = item.growth !== null && item.growth < 0

  const inner = (
    <div className="group flex flex-col gap-2.5 px-5 py-4 transition hover:bg-slate-50/60">
      <div className="flex items-center justify-between">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg transition group-hover:scale-105"
          style={{ background: `${item.accent}14` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: item.accent }} />
        </div>
        {item.growth !== null && !loading && (
          <span
            className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
              isPos
                ? 'bg-emerald-50 text-emerald-600'
                : isNeg
                  ? 'bg-red-50 text-red-500'
                  : 'bg-slate-100 text-slate-400'
            }`}
          >
            {isPos ? (
              <TrendingUp className="h-2.5 w-2.5" />
            ) : isNeg ? (
              <TrendingDown className="h-2.5 w-2.5" />
            ) : (
              <Minus className="h-2.5 w-2.5" />
            )}
            {formatPercentEn(Math.abs(item.growth))}
          </span>
        )}
      </div>
      {loading ? (
        <Sk className="h-7 w-16" />
      ) : (
        <p
          className="font-mono text-[22px] font-bold tabular-nums leading-none tracking-tight"
          style={{ color: item.accent }}
        >
          {item.value === null ? '—' : formatNumberEn(item.value)}
        </p>
      )}
      <p className="text-[11px] font-semibold text-slate-500">{item.labelAr}</p>
    </div>
  )

  if (item.href)
    return (
      <Link to={item.href} className="block">
        {inner}
      </Link>
    )
  return inner
}

/* ══════════════════════════════════════════════════════════════════
   OPS CHIPS
══════════════════════════════════════════════════════════════════ */

type OpsStatus = 'ok' | 'warn' | 'crit'

type OpsChipItem = {
  key: string
  labelAr: string
  value: number | null
  status: OpsStatus
  href?: string
}

function OpsChip({ item }: { item: OpsChipItem }) {
  const baseClass =
    'flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition'
  const statusClass =
    item.status === 'ok'
      ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
      : item.status === 'crit'
        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100/80'
        : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/80'
  const dotClass =
    item.status === 'ok'
      ? 'bg-emerald-500'
      : item.status === 'crit'
        ? 'bg-red-500'
        : 'bg-amber-400'

  const inner = (
    <>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
      {item.value !== null && (
        <span className="font-mono font-bold tabular-nums">{formatNumberEn(item.value)}</span>
      )}
      <span className="text-[11px]">{item.labelAr}</span>
    </>
  )

  if (item.href)
    return (
      <Link to={item.href} className={`${baseClass} ${statusClass}`}>
        {inner}
      </Link>
    )
  return <div className={`${baseClass} ${statusClass}`}>{inner}</div>
}

/* ══════════════════════════════════════════════════════════════════
   CHART TOOLTIP (Arabic names)
══════════════════════════════════════════════════════════════════ */

const CHART_AR: Record<string, string> = {
  students: 'الطلاب',
  registrations: 'التسجيلات',
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg" dir="rtl">
      <p className="mb-1 font-mono text-[11px] font-semibold text-slate-400">{label}</p>
      {payload.map((p) => (
        <p
          key={p.name}
          className="font-mono text-[12px] font-bold"
          style={{ color: p.color }}
        >
          {CHART_AR[p.name] ?? p.name}: {formatNumberEn(p.value)}
        </p>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   HEALTH BAR
══════════════════════════════════════════════════════════════════ */

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#EC943C' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color }}>
        {formatPercentEn(score)}
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   PAGE COMPONENT
══════════════════════════════════════════════════════════════════ */

export default function SuperAdminOverviewPage() {
  // Split loading into phases: KPIs first, secondary data after
  const [kpiLoading, setKpiLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(true)
  const loading = kpiLoading // alias for backward compat in chart/activity sections

  const [users, setUsers] = useState<AdminManagedUser[]>([])
  const [volunteers, setVolunteers] = useState<OpsVolunteer[]>([])
  const [registrations, setRegistrations] = useState<AdminRegistrationListRow[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [instructors, setInstructors] = useState<AdminInstructorDirectoryRow[]>([])
  const [departments, setDepartments] = useState<WorkspaceDepartment[]>([])
  const [finance, setFinance] = useState<FinanceDashboardData | null>(null)
  const [refreshTs, setRefreshTs] = useState(new Date())

  const load = useCallback(async () => {
    setKpiLoading(true)
    setDetailLoading(true)

    // Phase 1 — critical KPIs: users, registrations, courses (show fast)
    const [uR, rR, cR] = await Promise.allSettled([
      fetchAdminUsers(),
      fetchAdminRegistrations(),
      fetchCoursesStrict(),
    ])
    if (uR.status === 'fulfilled') setUsers(uR.value)
    if (rR.status === 'fulfilled') setRegistrations(rR.value)
    if (cR.status === 'fulfilled' && cR.value.ok) setCourses(cR.value.rows)
    setKpiLoading(false)

    // Phase 2 — secondary: volunteers, instructors, departments, finance
    const [vR, iR, dR] = await Promise.allSettled([
      fetchVolunteers(),
      fetchAdminInstructorsDirectory(),
      fetchWorkspaceDepartmentsForSuperAdmin(),
    ])
    if (vR.status === 'fulfilled') setVolunteers(vR.value)
    if (iR.status === 'fulfilled') setInstructors(iR.value.rows)
    if (dR.status === 'fulfilled') setDepartments(dR.value)
    try {
      const fin = await fetchFinanceDashboard()
      if (fin && typeof fin.total_revenue === 'number') setFinance(fin)
    } catch {
      /* مالية اختيارية */
    }
    setRefreshTs(new Date())
    setDetailLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* ── مشتقات ──────────────────────────────────────────────────── */
  const students = users.filter((u) => normalizeRole(u.role) === 'student')
  const instrUsers = users.filter((u) => normalizeRole(u.role) === 'instructor')
  const pendingRegs = registrations.filter(
    (r) => r.status === 'pending' || r.status === 'processing' || r.status === null,
  )
  const pendingVols = volunteers.filter((v) => v.status === 'applied' || v.status === 'review')
  const approvedVols = volunteers.filter(
    (v) => v.status === 'accepted' || v.status === 'active' || v.status === 'partial',
  )
  const withdrawnVols = volunteers.filter(
    (v) => v.status === 'withdrawn' || v.status === 'inactive',
  )
  const coursesNoInstr = courses.filter((c) => !c.instructor_name).length
  const nowMs = Date.now()
  const soonCourses = courses.filter((c) => {
    const t = c.start_date ? Date.parse(c.start_date) : NaN
    return Number.isFinite(t) && t >= nowMs && t <= nowMs + 14 * 86_400_000
  }).length

  /* ── بيانات المخططات ──────────────────────────────────────────── */
  const { keys: mKeys, labels: mLabels } = last6()
  const uByM = groupByMonth(users)
  const rByM = groupByMonth(registrations.map((r) => ({ created_at: r.created_at })))
  const chartData = mKeys.map((k, i) => ({
    month: mLabels[i],
    students: uByM[k] ?? 0,
    registrations: rByM[k] ?? 0,
  }))

  /* ── ترتيب الدورات ───────────────────────────────────────────── */
  const regsByCourse = new Map<number, number>()
  registrations.forEach((r) => {
    if (r.course_id) regsByCourse.set(r.course_id, (regsByCourse.get(r.course_id) ?? 0) + 1)
  })
  const topCourses = [...courses]
    .map((c) => ({ ...c, enrolled: regsByCourse.get(c.id) ?? 0 }))
    .sort((a, b) => b.enrolled - a.enrolled)
    .slice(0, 5)

  /* ── المدربون ────────────────────────────────────────────────── */
  const topInstructors = [...instructors]
    .sort((a, b) => b.assigned_courses_count - a.assigned_courses_count)
    .slice(0, 5)

  /* ── سجل النشاط ──────────────────────────────────────────────── */
  type FeedItem = {
    key: string
    type: 'reg' | 'vol'
    name: string
    detail: string
    time: string | null
    status: string | null
  }
  const feed: FeedItem[] = [
    ...registrations
      .slice()
      .sort((a, b) => Date.parse(b.created_at ?? '0') - Date.parse(a.created_at ?? '0'))
      .slice(0, 12)
      .map((r) => ({
        key: `r-${r.id}`,
        type: 'reg' as const,
        name: r.student_name ?? 'طالب',
        detail: r.course_title,
        time: r.created_at,
        status: r.status,
      })),
    ...volunteers.slice(0, 8).map((v) => ({
      key: `v-${v.id}`,
      type: 'vol' as const,
      name: v.name,
      detail: v.department_name ? `تطوع · ${v.department_name}` : 'طلب تطوع',
      time: null,
      status: v.status,
    })),
  ]
    .sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return Date.parse(b.time) - Date.parse(a.time)
    })
    .slice(0, 10)

  /* ── عناصر KPI ───────────────────────────────────────────────── */
  const kpiItems: KpiItem[] = [
    {
      labelAr: 'المستخدمون',
      value: users.length,
      growth: calcGrowth(users),
      icon: Users,
      accent: '#22334A',
      href: '/dashboard/super-admin/crud/users',
    },
    {
      labelAr: 'الطلاب',
      value: students.length,
      growth: calcGrowth(students),
      icon: GraduationCap,
      accent: '#10b981',
      href: '/dashboard/super-admin/crud/students',
    },
    {
      labelAr: 'المدربون',
      value: instrUsers.length,
      growth: null,
      icon: UserCog,
      accent: '#7c3aed',
      href: '/dashboard/super-admin/crud/instructors',
    },
    {
      labelAr: 'الدورات',
      value: courses.length,
      growth: null,
      icon: BookOpen,
      accent: '#2691C2',
      href: '/dashboard/super-admin/crud/programs',
    },
    {
      labelAr: 'التسجيلات',
      value: registrations.length,
      growth: calcGrowth(registrations.map((r) => ({ created_at: r.created_at }))),
      icon: FileSignature,
      accent: '#EC943C',
      href: '/dashboard/super-admin/crud/registrations',
    },
    {
      labelAr: 'المتطوعون',
      value: volunteers.length,
      growth: null,
      icon: HeartHandshake,
      accent: '#e11d48',
      href: '/dashboard/super-admin/volunteer-requests',
    },
  ]

  /* ── شرائح العمليات ──────────────────────────────────────────── */
  const opsItems: OpsChipItem[] = [
    {
      key: 'regs',
      labelAr: 'تسجيلات معلقة',
      value: pendingRegs.length,
      status: pendingRegs.length === 0 ? 'ok' : pendingRegs.length < 5 ? 'warn' : 'crit',
      href: '/dashboard/super-admin/crud/registrations',
    },
    {
      key: 'vols',
      labelAr: 'طلبات التطوع',
      value: pendingVols.length,
      status: pendingVols.length === 0 ? 'ok' : pendingVols.length < 8 ? 'warn' : 'crit',
      href: '/dashboard/super-admin/volunteer-requests',
    },
    {
      key: 'no-instr',
      labelAr: 'دورات بدون مدرب',
      value: coursesNoInstr,
      status: coursesNoInstr === 0 ? 'ok' : 'warn',
      href: '/dashboard/super-admin/crud/programs',
    },
    {
      key: 'soon',
      labelAr: 'تبدأ قريباً',
      value: soonCourses,
      status: soonCourses > 0 ? 'warn' : 'ok',
    },
    {
      key: 'finance',
      labelAr: 'مدفوعات معلقة',
      value: finance?.failed_count ?? null,
      status: (finance?.failed_count ?? 0) > 0 ? 'crit' : 'ok',
      href: '/dashboard/finance',
    },
    {
      key: 'system',
      labelAr: 'حالة النظام',
      value: null,
      status: 'ok',
    },
  ]

  /* ── إجراءات سريعة ───────────────────────────────────────────── */
  const quickActions = [
    { labelAr: 'إنشاء مستخدم', href: '/dashboard/super-admin/crud/users', icon: UserPlus },
    { labelAr: 'إضافة دورة', href: '/dashboard/super-admin/crud/programs', icon: BookOpen },
    { labelAr: 'طلبات التطوع', href: '/dashboard/super-admin/volunteer-requests', icon: HeartHandshake },
    { labelAr: 'مراجعة التسجيلات', href: '/dashboard/super-admin/crud/registrations', icon: ClipboardList },
    { labelAr: 'التقارير', href: '/dashboard/admin/reports', icon: BarChart2 },
    { labelAr: 'الإعدادات', href: '/dashboard/settings/notifications', icon: Settings2 },
  ]

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div dir="rtl" className="space-y-4 pb-10 text-[#22334A]">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          رأس الصفحة
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex items-center justify-between py-1">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#22334A]">
            لوحة القيادة التنفيذية
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            مركز استخبارات EMC · آخر تحديث{' '}
            <span className="font-mono text-slate-500">
              {refreshTs.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            النظام يعمل
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${kpiLoading || detailLoading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          شريط المؤشرات الرئيسية (يظهر فور اكتمال بيانات الطلاب والتسجيلات)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card noPad className="overflow-hidden">
        {kpiLoading ? (
          <div className="flex divide-x divide-slate-100 rtl:divide-x-reverse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 p-5">
                <Sk className="mb-3 h-6 w-6" />
                <Sk className="mb-2 h-6 w-14" />
                <Sk className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex divide-x divide-slate-100 rtl:divide-x-reverse">
            {kpiItems.map((item) => (
              <div key={item.labelAr} className="flex-1 min-w-0">
                <KpiCell item={item} loading={false} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          الإجراءات السريعة (شريط أفقي داخل المحتوى)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card className="py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 me-1">
            إجراءات سريعة:
          </span>
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <Link
                key={a.href}
                to={a.href}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-[#22334A] transition hover:border-[#2691C2]/40 hover:bg-[#2691C2]/[0.05] hover:text-[#2691C2]"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {a.labelAr}
              </Link>
            )
          })}
        </div>
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          النبض التشغيلي
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card className="py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 me-1">
            النبض التشغيلي:
          </span>
          {opsItems.map((item) => (
            <OpsChip key={item.key} item={item} />
          ))}
        </div>
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          التحليلات — مخططات كبيرة (تظهر فور اكتمال جميع البيانات)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* مخطط نمو الطلاب */}
        <Card accent="#10b981">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-[13px] font-bold text-[#22334A]">نمو الطلاب</h3>
              <p className="text-[11px] font-medium text-slate-400">آخر 6 أشهر</p>
            </div>
            {!kpiLoading && students.length > 0 && (
              <div className="text-end">
                <p className="font-mono text-[22px] font-bold leading-none text-emerald-600">
                  {formatNumberEn(students.length)}
                </p>
                <p className="text-[10px] font-medium text-slate-400">إجمالي الطلاب</p>
              </div>
            )}
          </div>
          {kpiLoading ? (
            <Sk className="h-[260px]" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tickFormatter={(v: number) => formatNumberEn(v)}
                />
                <Tooltip content={<ChartTip />} />
                <Area
                  type="monotone"
                  dataKey="students"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#gStudents)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* مخطط التسجيلات */}
        <Card accent="#2691C2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-[13px] font-bold text-[#22334A]">اتجاه التسجيلات</h3>
              <p className="text-[11px] font-medium text-slate-400">آخر 6 أشهر</p>
            </div>
            {!loading && registrations.length > 0 && (
              <div className="text-end">
                <p className="font-mono text-[22px] font-bold leading-none text-[#2691C2]">
                  {formatNumberEn(registrations.length)}
                </p>
                <p className="text-[10px] font-medium text-slate-400">إجمالي التسجيلات</p>
              </div>
            )}
          </div>
          {kpiLoading ? (
            <Sk className="h-[260px]" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tickFormatter={(v: number) => formatNumberEn(v)}
                />
                <Tooltip content={<ChartTip />} />
                <Bar
                  dataKey="registrations"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                  fill="#2691C2"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          أداء الدورات + صحة الإدارات
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* أداء الدورات */}
        <Card className="lg:col-span-2" accent="#EC943C">
          <SectionHead
            title="أداء الدورات"
            sub="الأكثر تسجيلاً"
            action={{ label: 'عرض الكل', href: '/dashboard/super-admin/crud/programs' }}
          />
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-12" />)}
            </div>
          ) : topCourses.length === 0 ? (
            <EmptyState icon={BookOpen} text="لا توجد دورات كافية بعد" />
          ) : (
            <div className="divide-y divide-slate-50">
              {topCourses.map((course, idx) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 py-3 transition hover:bg-slate-50/60 rounded-lg px-1"
                >
                  <span className="font-mono text-[12px] font-bold text-slate-300 w-4 shrink-0 text-center">
                    {formatNumberEn(idx + 1)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[12px] font-semibold text-[#22334A]">
                      {course.title}
                    </p>
                    <p className="truncate text-[10px] font-medium text-slate-400">
                      {course.instructor_name ?? 'بدون مدرب'}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="font-mono text-[13px] font-bold text-[#22334A]">
                      {formatNumberEn(course.enrolled)}
                    </p>
                    <p className="text-[9px] font-medium text-slate-400">مسجّل</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-bold ${
                      course.status === 'published'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {course.status === 'published' ? 'نشط' : 'مسودة'}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* صحة الإدارات */}
        <Card noPad className="lg:col-span-3 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-[13px] font-bold text-[#22334A]">صحة الإدارات</h3>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                الحالة التشغيلية لكل إدارة
              </p>
            </div>
            <Link
              to="/dashboard/super-admin/crud/departments"
              className="text-[11px] font-semibold text-[#2691C2] transition hover:text-[#1e7aaa]"
            >
              إدارة
            </Link>
          </div>
          {detailLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-10" />)}
            </div>
          ) : departments.length === 0 ? (
            <EmptyState icon={Building2} text="لا توجد إدارات بعد" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {[
                    { label: 'الإدارة', align: 'text-start' },
                    { label: 'الأعضاء', align: 'text-center' },
                    { label: 'المهام', align: 'text-center' },
                    { label: 'التطوع', align: 'text-center' },
                    { label: 'مؤشر الصحة', align: 'text-start' },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={`px-4 py-2.5 ${h.align} text-[10px] font-semibold uppercase tracking-wide text-slate-400`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {departments.map((dept, idx) => {
                  const score = healthScore(dept)
                  const deptName =
                    dept.name_ar ??
                    dept.title ??
                    dept.name ??
                    dept.department_name ??
                    'إدارة'
                  return (
                    <motion.tr
                      key={dept.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="transition-colors hover:bg-[#2691C2]/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              dept.status === 'healthy'
                                ? 'bg-emerald-500'
                                : dept.status === 'risk'
                                  ? 'bg-red-500'
                                  : 'bg-amber-400'
                            }`}
                          />
                          <div>
                            <p className="text-[12px] font-semibold text-[#22334A]">{deptName}</p>
                            {dept.leader_name && (
                              <p className="text-[10px] font-medium text-slate-400">
                                {dept.leader_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-[12px] font-bold text-slate-700">
                          {formatNumberEn(dept.members_count)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-mono text-[12px] font-bold ${
                            (dept.open_tasks ?? dept.open_tasks_count ?? 0) > 3
                              ? 'text-amber-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {formatNumberEn(dept.open_tasks ?? dept.open_tasks_count ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-[12px] font-bold text-slate-700">
                          {formatNumberEn(dept.volunteer_requests_count ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <HealthBar score={score} />
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          أبرز المدربين + مركز التطوع + سجل النشاط
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* أبرز المدربين */}
        <Card accent="#7c3aed">
          <SectionHead
            title="أبرز المدربين"
            sub="مرتبون حسب الدورات"
            action={{ label: 'الكل', href: '/dashboard/super-admin/crud/instructors' }}
          />
          {detailLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-11" />)}
            </div>
          ) : topInstructors.length === 0 ? (
            <EmptyState icon={UserCog} text="لا يوجد مدربون بعد" />
          ) : (
            <div className="space-y-1">
              {topInstructors.map((instr, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                return (
                  <motion.div
                    key={instr.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-slate-50"
                  >
                    <span className="w-5 shrink-0 text-center">
                      {medal ?? (
                        <span className="font-mono text-[11px] font-bold text-slate-300">
                          {formatNumberEn(idx + 1)}
                        </span>
                      )}
                    </span>
                    {instr.avatar_url ? (
                      <img
                        src={instr.avatar_url}
                        alt={instr.name}
                        className="h-8 w-8 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-[10px] font-bold text-white">
                        {initials(instr.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[12px] font-semibold text-[#22334A]">
                        {instr.name}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">{instr.email}</p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="font-mono text-[13px] font-bold text-violet-600">
                        {formatNumberEn(instr.assigned_courses_count)}
                      </p>
                      <p className="text-[9px] font-medium text-slate-400">دورة</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Card>

        {/* مركز التطوع */}
        <Card accent="#e11d48">
          <SectionHead
            title="مركز التطوع"
            sub="توزيع الحالات"
            action={{ label: 'إدارة', href: '/dashboard/super-admin/volunteer-requests' }}
          />
          {detailLoading ? (
            <div className="space-y-3">
              <Sk className="h-16" />
              <Sk className="h-28" />
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-center gap-6 rounded-2xl bg-slate-50 py-4">
                <div className="text-center">
                  <p className="font-mono text-3xl font-bold text-[#22334A]">
                    {formatNumberEn(volunteers.length)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                    إجمالي المتطوعين
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  {
                    labelAr: 'معلق / مراجعة',
                    value: pendingVols.length,
                    color: '#EC943C',
                    bg: 'bg-amber-50 border-amber-100',
                  },
                  {
                    labelAr: 'مقبول / نشط',
                    value: approvedVols.length,
                    color: '#10b981',
                    bg: 'bg-emerald-50 border-emerald-100',
                  },
                  {
                    labelAr: 'منسحب / غير نشط',
                    value: withdrawnVols.length,
                    color: '#94a3b8',
                    bg: 'bg-slate-50 border-slate-100',
                  },
                ].map((s) => (
                  <div key={s.labelAr} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${s.bg}`}>
                    <p className="text-[11px] font-semibold text-slate-600">{s.labelAr}</p>
                    <span
                      className="font-mono text-[15px] font-bold tabular-nums"
                      style={{ color: s.color }}
                    >
                      {formatNumberEn(s.value)}
                    </span>
                  </div>
                ))}
              </div>
              {volunteers.length > 0 && (
                <div className="mt-4 flex h-2 overflow-hidden rounded-full">
                  {[
                    { value: pendingVols.length, color: '#EC943C' },
                    { value: approvedVols.length, color: '#10b981' },
                    { value: withdrawnVols.length, color: '#e2e8f0' },
                  ]
                    .filter((s) => s.value > 0)
                    .map((s, i) => (
                      <motion.div
                        key={i}
                        className="h-full"
                        style={{ background: s.color }}
                        initial={{ flex: 0 }}
                        animate={{ flex: s.value }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                      />
                    ))}
                </div>
              )}
            </>
          )}
        </Card>

        {/* سجل النشاط الأخير */}
        <Card accent="#2691C2">
          <SectionHead title="سجل النشاط الأخير" sub="آخر الأحداث" />
          {detailLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-10" />)}
            </div>
          ) : feed.length === 0 ? (
            <EmptyState icon={Activity} text="لا توجد أحداث بعد" />
          ) : (
            <div className="space-y-0.5">
              {feed.map((item, idx) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-slate-50"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg ${
                      item.type === 'reg'
                        ? 'bg-[#2691C2]/10 text-[#2691C2]'
                        : 'bg-[#EC943C]/10 text-[#EC943C]'
                    }`}
                  >
                    {item.type === 'reg' ? (
                      <FileSignature className="h-3 w-3" />
                    ) : (
                      <HeartHandshake className="h-3 w-3" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[12px] font-semibold text-[#22334A]">
                      {item.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">{item.detail}</p>
                  </div>
                  {item.time && (
                    <span className="shrink-0 font-mono text-[9px] font-medium text-slate-300">
                      {timeAgoAr(item.time)}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          النظرة المالية (إذا كانت متاحة)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {finance && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card noPad accent="#059669">
            <div className="flex items-stretch divide-x divide-slate-100 rtl:divide-x-reverse">
              {[
                { labelAr: 'إجمالي الإيرادات', value: finance.total_revenue, color: '#059669' },
                { labelAr: 'الإيرادات المؤكدة', value: finance.confirmed_revenue, color: '#2691C2' },
                { labelAr: 'الإيرادات المعلقة', value: finance.pending_revenue, color: '#EC943C' },
              ].map((s) => (
                <div key={s.labelAr} className="flex-1 px-5 py-4">
                  <p className="text-[11px] font-semibold text-slate-400">{s.labelAr}</p>
                  <p
                    className="mt-1 font-mono text-xl font-bold tabular-nums"
                    style={{ color: s.color }}
                  >
                    {formatNumberEn(s.value)}
                  </p>
                </div>
              ))}
              <div className="flex shrink-0 items-center px-5 py-4">
                <Link
                  to="/dashboard/finance"
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  التقرير المالي
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

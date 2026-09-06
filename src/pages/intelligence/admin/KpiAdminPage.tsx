import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Download,
  GraduationCap,
  Layers,
  LineChart,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react'
import { fetchKpiDashboard } from '@/api/kpiApi'
import { fetchProgramsManagerDashboard, type ProgramsManagerDashboardPayload } from '@/api/programsManagerApi'
import { IntelligencePageSkeleton } from '@/components/intelligence'
import { useAuth } from '@/contexts/AuthContext'
import type { KpiMetric, KpiTabSlug } from '@/types/intelligence'

const TAB_OPTIONS: { slug: KpiTabSlug; label: string; roles?: string[] }[] = [
  { slug: 'overview', label: 'نظرة عامة' },
  { slug: 'education', label: 'البرامج والدورات' },
  { slug: 'finance', label: 'المالية', roles: ['admin', 'super_admin', 'tech_admin', 'finance_manager'] },
  { slug: 'departments', label: 'الإدارات', roles: ['admin', 'super_admin', 'tech_admin', 'operations_manager', 'department_manager'] },
  { slug: 'marketing', label: 'التسويق', roles: ['admin', 'super_admin', 'tech_admin', 'operations_manager'] },
  { slug: 'partnerships', label: 'الشراكات', roles: ['admin', 'super_admin', 'tech_admin', 'partnerships_manager'] },
  { slug: 'hr', label: 'الموارد البشرية', roles: ['admin', 'super_admin', 'tech_admin', 'hr_manager'] },
]

const CHART_COLORS = ['#0077B6', '#F28C00', '#0C2A4B', '#10b981', '#6366f1', '#f43f5e']

function fmt(n: number | string): string {
  if (typeof n === 'string') return n
  return n.toLocaleString('en-US')
}

function tooltipCount(value: unknown): string {
  return fmt(Number(value ?? 0))
}

function ExecutiveMetricCard({ metric }: { metric: KpiMetric }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${
        metric.accent === 'orange'
          ? 'border-[#F28C00]/25 from-[#F28C00]/10 to-white'
          : 'border-[#0077B6]/20 from-[#0077B6]/8 to-white'
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-wider text-[#0C2A4B]/45">{metric.label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums text-[#0C2A4B]">{metric.value}</p>
      {metric.hint ? <p className="mt-1 text-[10px] font-medium text-[#0C2A4B]/55">{metric.hint}</p> : null}
    </motion.div>
  )
}

function EmptyAnalytics({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#0C2A4B]/15 bg-[#f8fafc] px-6 py-12 text-center">
      <LineChart size={28} className="mx-auto text-[#0C2A4B]/25" />
      <p className="mt-3 text-sm font-black text-[#0C2A4B]/65">{message}</p>
      <p className="mx-auto mt-2 max-w-md text-[12px] font-medium text-[#0C2A4B]/45">
        جميع الأرقام المعروضة تأتي من قاعدة البيانات مباشرة لا توجد قيم تجريبية.
      </p>
    </div>
  )
}

export default function KpiAdminPage() {
  const { user } = useAuth()
  const userRole = (user as Record<string, unknown>)?.role as string | undefined
  const isProgramsManager = userRole === 'programs_manager'
  const tabs = TAB_OPTIONS.filter((t) => !t.roles || !userRole || t.roles.includes(userRole))

  const [tab, setTab] = useState<KpiTabSlug>(isProgramsManager ? 'education' : 'overview')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<KpiMetric[]>([])
  const [highlights, setHighlights] = useState<string[]>([])
  const [dashboard, setDashboard] = useState<ProgramsManagerDashboardPayload | null>(null)

  // Fall back to the always-visible "overview" tab when the current role cannot see the
  // selected one. Done during render (react.dev "adjusting state when a prop changes")
  // so the forbidden tab never paints for a frame.
  if (!tabs.some((t) => t.slug === tab)) setTab('overview')

  // Re-arm the loading state during render when the tab changes, so the new tab never
  // shows the previous tab's metrics as if they were settled. The initial state already
  // carries `loading: true`, so the first run needs no adjustment.
  const [seenTab, setSeenTab] = useState(tab)
  if (seenTab !== tab) {
    setSeenTab(tab)
    setLoading(true)
    setLoadError(null)
  }

  /** Imperative refresh/retry from a button — outside the effect, so it may flip to the
   *  loading state synchronously. */
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [kpi, dash] = await Promise.all([
        fetchKpiDashboard(tab),
        fetchProgramsManagerDashboard().catch(() => null),
      ])
      setMetrics(Array.isArray(kpi.metrics) ? kpi.metrics : [])
      setHighlights(Array.isArray(kpi.highlights) ? kpi.highlights : [])
      setDashboard(dash)
    } catch {
      setMetrics([])
      setHighlights([])
      setLoadError('تعذّر تحميل مؤشرات الأداء. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [kpi, dash] = await Promise.all([
          fetchKpiDashboard(tab),
          fetchProgramsManagerDashboard().catch(() => null),
        ])
        if (!alive) return
        setMetrics(Array.isArray(kpi.metrics) ? kpi.metrics : [])
        setHighlights(Array.isArray(kpi.highlights) ? kpi.highlights : [])
        setDashboard(dash)
      } catch {
        if (!alive) return
        setMetrics([])
        setHighlights([])
        setLoadError('تعذّر تحميل مؤشرات الأداء. تحقق من الاتصال وأعد المحاولة.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tab])

  const summaryCards = useMemo(() => {
    if (!dashboard?.summary) return []
    const s = dashboard.summary
    return [
      { label: 'البرامج', value: s.programs, icon: Layers },
      { label: 'الدورات النشطة', value: s.published_courses, icon: GraduationCap },
      { label: 'المسارات', value: s.learning_paths, icon: BookOpen },
      { label: 'الطلاب النشطون', value: s.active_students, icon: Users },
      { label: 'التسجيلات', value: s.registrations, icon: TrendingUp },
      { label: 'متوسط الحضور %', value: `${s.attendance_average}%`, icon: BarChart3 },
    ]
  }, [dashboard])

  const registrationChart = dashboard?.analytics.registrations_monthly ?? []
  const coursesChart = dashboard?.analytics.courses_monthly ?? []
  const pipelineChart = dashboard?.registration_pipeline ?? []
  const assignmentPie = dashboard
    ? [
        { name: 'مراجعة', value: dashboard.assignment_stats.pending_review },
        { name: 'إعادة تسليم', value: dashboard.assignment_stats.needs_resubmission },
        { name: 'مكتمل', value: dashboard.assignment_stats.completed },
      ].filter((x) => x.value > 0)
    : []

  const hasTrendData = registrationChart.some((p) => p.count > 0) || coursesChart.some((p) => p.count > 0)

  return (
    <div dir="rtl" className="space-y-6 text-right">
      {/* KPI Hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-[#0C2A4B]/10 bg-gradient-to-bl from-[#0C2A4B] via-[#1a3550] to-[#0077B6] p-8 shadow-xl">
        <div aria-hidden className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-white/10 blur-[90px]" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 right-[15%] h-40 w-40 rounded-full bg-[#F28C00]/25 blur-[70px]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">مركز التحليلات التنفيذي</p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              {isProgramsManager ? 'مؤشرات أداء البرامج والتعلم' : 'مؤشرات الأداء المؤسسية'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-white/75">
              تحليلات مبنية على بيانات حية من الدورات والمسارات والتسجيلات والجلسات بدون أرقام وهمية.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm hover:bg-white/20 disabled:opacity-60">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> تحديث
            </button>
            <Link to="/dashboard/admin/reports" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-black text-white backdrop-blur-sm hover:bg-white/20">
              <Download size={14} /> التقارير
            </Link>
          </div>
        </div>
      </section>

      {/* Tab filter */}
      <nav className="flex flex-wrap justify-end gap-2 rounded-2xl border border-[#0C2A4B]/8 bg-white/90 p-2 shadow-sm backdrop-blur-sm">
        {tabs.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => setTab(t.slug)}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              tab === t.slug ? 'bg-[#0C2A4B] text-white shadow-md' : 'bg-[#f8fafc] text-[#0C2A4B] ring-1 ring-[#0C2A4B]/8 hover:bg-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loading ?
        <IntelligencePageSkeleton />
      : loadError ?
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
          <AlertTriangle size={32} className="mx-auto text-rose-400" />
          <p className="mt-3 font-black text-rose-800">{loadError}</p>
          <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-[#0C2A4B] px-6 py-2.5 text-sm font-black text-white">
            إعادة المحاولة
          </button>
        </div>
      : (
        <>
          {/* Executive summary from live dashboard when available */}
          {summaryCards.length > 0 ?
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {summaryCards.map((c) => (
                <div key={c.label} className="rounded-2xl border border-[#0C2A4B]/8 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-[#0C2A4B]/45">{c.label}</p>
                    <c.icon size={16} className="text-[#0077B6]" />
                  </div>
                  <p className="mt-2 text-xl font-black tabular-nums text-[#0C2A4B]">{typeof c.value === 'number' ? fmt(c.value) : c.value}</p>
                </div>
              ))}
            </div>
          : null}

          {highlights.length > 0 ?
            <ul className="rounded-2xl border border-[#0077B6]/15 bg-gradient-to-bl from-[#0077B6]/8 to-white p-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#0C2A4B]/45">ملخص تنفيذي</p>
              <ul className="mt-3 space-y-2">
                {highlights.map((h, i) => (
                  <li key={i} className="text-sm font-semibold text-[#0C2A4B]/80">· {h}</li>
                ))}
              </ul>
            </ul>
          : null}

          {/* KPI metrics from /kpi API */}
          {metrics.length > 0 ?
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map((m) => (
                <ExecutiveMetricCard key={m.id} metric={m} />
              ))}
            </div>
          : (
            <EmptyAnalytics message="لا توجد مؤشرات متاحة لهذا القسم حالياً" />
          )}

          {/* Performance charts from programs manager dashboard analytics */}
          <section className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-[#0C2A4B]">
              <LineChart size={16} className="text-[#0077B6]" /> تحليلات الأداء (بيانات حية)
            </h2>
            {!dashboard || !hasTrendData ?
              <EmptyAnalytics message="لا توجد بيانات زمنية كافية لعرض الرسوم البيانية بعد" />
            : (
              <div className="grid gap-4 lg:grid-cols-2">
                {registrationChart.some((p) => p.count > 0) ?
                  <div className="rounded-xl border border-[#0C2A4B]/8 bg-[#f8fafc] p-4">
                    <p className="mb-2 text-[11px] font-black text-[#0C2A4B]/55">اتجاه التسجيلات</p>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={registrationChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#0C2A4B14" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={40} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                          <Tooltip formatter={(v) => tooltipCount(v)} />
                          <Area type="monotone" dataKey="count" stroke="#0077B6" fill="#0077B6" fillOpacity={0.15} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                : null}
                {coursesChart.some((p) => p.count > 0) ?
                  <div className="rounded-xl border border-[#0C2A4B]/8 bg-[#f8fafc] p-4">
                    <p className="mb-2 text-[11px] font-black text-[#0C2A4B]/55">نمو الدورات</p>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={coursesChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#0C2A4B14" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={40} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                          <Tooltip formatter={(v) => tooltipCount(v)} />
                          <Bar dataKey="count" fill="#F28C00" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                : null}
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Registration pipeline donut */}
            <section className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-black text-[#0C2A4B]">تحليل التسجيلات</h2>
              {pipelineChart.length === 0 || pipelineChart.every((p) => p.count === 0) ?
                <EmptyAnalytics message="لا توجد تسجيلات لتحليلها" />
              : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pipelineChart}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        label={(props) => {
                          const row = props.payload as { label?: string; count?: number }
                          return `${row.label ?? ''}: ${fmt(row.count ?? 0)}`
                        }}
                      >
                        {pipelineChart.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => tooltipCount(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* Assignments */}
            <section className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-black text-[#0C2A4B]">تحليل الواجبات</h2>
              {assignmentPie.length === 0 ?
                <EmptyAnalytics message="لا توجد تسليمات واجبات بعد" />
              : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={assignmentPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                        {assignmentPie.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => tooltipCount(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          {/* Export center */}
          <section className="rounded-2xl border border-[#0C2A4B]/8 bg-gradient-to-br from-[#f8fafc] to-white p-6">
            <h2 className="text-sm font-black text-[#0C2A4B]">مركز التصدير</h2>
            <p className="mt-2 text-[12px] font-medium text-[#0C2A4B]/55">
              يمكنك إنشاء تقارير PDF/Excel مفصّلة من لوحة التقارير البيانات تُسحب من نفس مصادر المؤشرات أعلاه.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/dashboard/admin/reports" className="rounded-xl bg-[#0C2A4B] px-4 py-2.5 text-[11px] font-black text-white hover:bg-[#1a2a3d]">
                فتح مركز التقارير
              </Link>
              {isProgramsManager ?
                <Link to="/dashboard/programs-manager" className="rounded-xl border border-[#0C2A4B]/15 bg-white px-4 py-2.5 text-[11px] font-black text-[#0C2A4B] hover:bg-[#f8fafc]">
                  لوحة مدير البرامج
                </Link>
              : null}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

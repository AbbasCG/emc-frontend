import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AlertCircle, AlertTriangle, Award, BarChart3, CheckCircle2,
  Clock, Download, FileCheck, FileDown, FileX, Layers, Loader2,
  RefreshCw, Shield, TrendingUp, Users, XCircle,
} from 'lucide-react'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { fmtDate, fmtNum } from '@/components/lms/lmsFormatters'
import {
  exportCertificateAnalytics,
  fetchCertificateAnalyticsOverview,
  fetchCertificateAnalyticsTrends,
  fetchCertificateApprovalMetrics,
  fetchCertificateBatchAnalytics,
  fetchCertificateDownloadMetrics,
  fetchCertificateFailureInsights,
  fetchCertificatePdfMetrics,
  fetchCertificateSourceAnalytics,
  fetchCertificateStatusDistribution,
  fetchCertificateTemplateUsage,
  type CertificateAnalyticsFilters,
  type CertificateAnalyticsOverview,
  type CertificateApprovalMetrics,
  type CertificateBatchAnalytics,
  type CertificateDownloadMetrics,
  type CertificateFailureInsight,
  type CertificatePdfMetrics,
  type CertificateSourceAnalytics,
  type CertificateStatusDistribution,
  type CertificateTemplateUsage,
  type CertificateTrendPoint,
} from '@/api/certificatesApi'
import { useNavigate } from 'react-router-dom'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C_BLUE   = '#2691C2'
const C_ORANGE = '#EC943C'
const C_GREEN  = '#10b981'
const C_ROSE   = '#f43f5e'
const C_VIOLET = '#8b5cf6'
const PALETTE  = [C_BLUE, C_ORANGE, C_GREEN, C_ROSE, C_VIOLET, '#64748b']

// ── Presets ───────────────────────────────────────────────────────────────────
type Preset = CertificateAnalyticsFilters['preset']
const PRESETS: { value: Preset; label: string }[] = [
  { value: 'today',        label: 'اليوم' },
  { value: 'last_7_days',  label: 'آخر 7 أيام' },
  { value: 'last_30_days', label: 'آخر 30 يوم' },
  { value: 'this_month',   label: 'هذا الشهر' },
  { value: 'last_month',   label: 'الشهر الماضي' },
  { value: 'this_year',    label: 'هذا العام' },
  { value: 'all_time',     label: 'الكل' },
]

// ── Small helpers ─────────────────────────────────────────────────────────────
function fmt(n?: number | null, fallback = '—') {
  if (n == null) return fallback
  return n.toLocaleString('en-US')
}

function fmtBytes(bytes?: number | null) {
  if (!bytes) return '0 B'
  const k = 1024
  if (bytes < k)     return `${bytes} B`
  if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`
  return `${(bytes / k / k).toFixed(1)} MB`
}

function fmtHours(h?: number | null) {
  if (h == null) return '—'
  if (h < 1) return `${Math.round(h * 60)} دقيقة`
  if (h < 24) return `${h.toFixed(1)} ساعة`
  return `${(h / 24).toFixed(1)} يوم`
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, error, loading, action }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  error?: string | null
  loading?: boolean
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#22334A]/10 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#22334A]/8 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2691C2]/10">
            <Icon size={16} className="text-[#2691C2]" />
          </div>
          <h2 className="text-[13px] font-black text-[#22334A]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={22} className="animate-spin text-[#2691C2]/60" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <AlertCircle size={15} className="shrink-0 text-rose-500" />
            <p className="text-[12px] font-semibold text-rose-700">{error}</p>
          </div>
        ) : children}
      </div>
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = C_BLUE, icon: Icon }: {
  label: string; value: string | number; sub?: string
  color?: string; icon?: React.ElementType
}) {
  return (
    <div className="rounded-2xl border border-[#22334A]/10 bg-white p-4 shadow-sm">
      {Icon && (
        <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: color + '15' }}>
          <Icon size={15} style={{ color }} />
        </div>
      )}
      <p className="text-[10px] font-black uppercase tracking-wider text-[#22334A]/45">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-[#22334A]">{fmt(typeof value === 'number' ? value : undefined) !== '—' ? value : value}</p>
      {sub && <p className="mt-0.5 text-[10px] font-medium text-[#22334A]/50">{sub}</p>}
    </div>
  )
}

// ── STATUS labels/colors ──────────────────────────────────────────────────────
const STATUS_AR: Record<string, string> = {
  pending:              'قيد المراجعة',
  pending_generation:   'قيد الإنشاء',
  generation_failed:    'فشل الإنشاء',
  approved:             'معتمدة',
  issued:               'صادرة',
  rejected:             'مرفوضة',
  revoked:              'ملغاة',
  pending_approval:     'انتظار الاعتماد',
  admin_approved:       'اعتماد إداري',
  program_manager_approved: 'اعتماد البرامج',
  both_approved:        'اعتماد كامل',
  ready:                'جاهز',
  failed:               'فاشل',
  generating:           'قيد الإنشاء',
  pending_pdf:          'انتظار',
}

// ── Batch status classes ───────────────────────────────────────────────────────
const BATCH_STATUS_CLS: Record<string, string> = {
  completed:             'bg-emerald-50 text-emerald-700 ring-emerald-200',
  failed:                'bg-rose-50 text-rose-700 ring-rose-200',
  completed_with_errors: 'bg-amber-50 text-amber-700 ring-amber-200',
  processing:            'bg-sky-50 text-sky-700 ring-sky-200',
  pending:               'bg-slate-50 text-slate-600 ring-slate-200',
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminCertificateAnalyticsPage() {
  const navigate = useNavigate()

  const [filters, setFilters] = useState<CertificateAnalyticsFilters>({ preset: 'last_30_days' })
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  // Data state per section
  const [overview,      setOverview]      = useState<CertificateAnalyticsOverview | null>(null)
  const [trends,        setTrends]        = useState<CertificateTrendPoint[]>([])
  const [distribution,  setDistribution]  = useState<CertificateStatusDistribution | null>(null)
  const [approval,      setApproval]      = useState<CertificateApprovalMetrics | null>(null)
  const [pdfMetrics,    setPdfMetrics]    = useState<CertificatePdfMetrics | null>(null)
  const [downloads,     setDownloads]     = useState<CertificateDownloadMetrics | null>(null)
  const [templateUsage, setTemplateUsage] = useState<CertificateTemplateUsage[]>([])
  const [courses,       setCourses]       = useState<CertificateSourceAnalytics[]>([])
  const [batches,       setBatches]       = useState<CertificateBatchAnalytics | null>(null)
  const [failures,      setFailures]      = useState<CertificateFailureInsight[]>([])

  // Loading/error per section
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors,  setErrors]  = useState<Record<string, string>>({})

  const [exporting, setExporting] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'approval' | 'pdf' | 'downloads' | 'templates' | 'sources' | 'batches' | 'failures'>('overview')

  // Tracks which sections have been fetched for the current filter state.
  // Reset on every filter change so tabs reload fresh data.
  const loadedRef = useRef(new Set<string>())

  const sec = (key: string, on: boolean) => {
    setLoading(p => ({ ...p, [key]: on }))
    if (on) setErrors(p => ({ ...p, [key]: '' }))
  }
  const err = (key: string, msg: string) => setErrors(p => ({ ...p, [key]: msg }))

  const buildFilters = useCallback((): CertificateAnalyticsFilters => {
    const f: CertificateAnalyticsFilters = { ...filters, granularity }
    if (dateFrom) { f.date_from = dateFrom; delete f.preset }
    if (dateTo)   { f.date_to = dateTo }
    return f
  }, [filters, granularity, dateFrom, dateTo])

  // load() resets the section cache and fetches overview (always visible KPI cards).
  const load = useCallback(() => {
    const f = buildFilters()
    loadedRef.current = new Set()
    loadedRef.current.add('overview')
    sec('overview', true)
    fetchCertificateAnalyticsOverview(f)
      .then(setOverview)
      .catch(() => err('overview', 'تعذّر تحميل نظرة عامة'))
      .finally(() => sec('overview', false))
  }, [buildFilters])

  // loadTab() fetches sections for the given tab on first visit.
  // Subsequent calls for the same tab (same filter state) are no-ops.
  const loadTab = useCallback((tab: typeof activeTab) => {
    const f = buildFilters()

    function once<T>(key: string, fetcher: () => Promise<T>, setter: (v: T) => void, errMsg: string) {
      if (loadedRef.current.has(key)) return
      loadedRef.current.add(key)
      sec(key, true)
      fetcher().then(setter).catch(() => err(key, errMsg)).finally(() => sec(key, false))
    }

    if (tab === 'overview') {
      once('distribution', () => fetchCertificateStatusDistribution(f), setDistribution, 'تعذّر تحميل توزيع الحالة')
    } else if (tab === 'trends') {
      once('trends', () => fetchCertificateAnalyticsTrends(f), setTrends, 'تعذّر تحميل اتجاهات')
    } else if (tab === 'approval') {
      once('approval', () => fetchCertificateApprovalMetrics(f), setApproval, 'تعذّر تحميل مقاييس الاعتماد')
    } else if (tab === 'pdf') {
      once('pdf', () => fetchCertificatePdfMetrics(f), setPdfMetrics, 'تعذّر تحميل مقاييس PDF')
    } else if (tab === 'downloads') {
      once('downloads', () => fetchCertificateDownloadMetrics(f), setDownloads, 'تعذّر تحميل تحليلات التنزيل')
    } else if (tab === 'templates') {
      once('templates', () => fetchCertificateTemplateUsage(f), setTemplateUsage, 'تعذّر تحميل استخدام القوالب')
    } else if (tab === 'sources') {
      once('courses', () => fetchCertificateSourceAnalytics('courses', f), setCourses, 'تعذّر تحميل تحليلات المصدر')
    } else if (tab === 'batches') {
      once('batches', () => fetchCertificateBatchAnalytics(f), setBatches, 'تعذّر تحميل تحليلات الدُفعات')
    } else if (tab === 'failures') {
      once('failures', () => fetchCertificateFailureInsights(f), setFailures, 'تعذّر تحميل تقرير الأعطال')
    }
  }, [buildFilters])

  // On filter change: reset cache, reload overview, reload current tab.
  useEffect(() => { load() }, [load])
  // On tab change (or after filter reset): lazy-load current tab's sections.
  useEffect(() => { loadTab(activeTab) }, [activeTab, loadTab])

  async function handleExport(type: string) {
    setExporting(type)
    setExportError(null)
    try { await exportCertificateAnalytics(type, buildFilters()) }
    catch { setExportError('تعذّر تصدير البيانات. يرجى المحاولة مرة أخرى.') }
    finally { setExporting(null) }
  }

  const pieDistData = distribution
    ? Object.entries(distribution.by_status).map(([key, count], i) => ({
        name: STATUS_AR[key] ?? key,
        value: Number(count),
        fill: PALETTE[i % PALETTE.length],
      }))
    : []

  const pdfPieData = distribution
    ? Object.entries(distribution.by_pdf_status).map(([key, count], i) => ({
        name: STATUS_AR[key] ?? key,
        value: Number(count),
        fill: [C_GREEN, C_ORANGE, C_ROSE, '#64748b'][i % 4],
      }))
    : []

  const TABS = [
    { key: 'overview',   label: 'نظرة عامة' },
    { key: 'trends',     label: 'الاتجاهات' },
    { key: 'approval',   label: 'الاعتماد' },
    { key: 'pdf',        label: 'ملفات PDF' },
    { key: 'downloads',  label: 'التنزيلات' },
    { key: 'templates',  label: 'القوالب' },
    { key: 'sources',    label: 'المصادر' },
    { key: 'batches',    label: 'الدُفعات' },
    { key: 'failures',   label: 'الأعطال' },
  ] as const

  return (
    <AdminLmsShell title="تحليلات الشهادات" description="مؤشرات الأداء التشغيلي لنظام الشهادات" breadcrumb="الشهادات / التحليلات">
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6" dir="rtl">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-[#22334A]">تحليلات الشهادات</h1>
            <p className="mt-0.5 text-[12px] font-medium text-[#22334A]/55">
              جميع الأرقام من قاعدة البيانات مباشرة — لا بيانات تجريبية
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => { load(); loadTab(activeTab) }}
              className="flex items-center gap-1.5 rounded-xl border border-[#22334A]/15 bg-white px-3.5 py-2 text-[12px] font-black text-[#22334A] shadow-sm transition hover:bg-[#f8fafc]"
            >
              <RefreshCw size={13} />
              تحديث
            </button>
            {exportError && (
              <p className="text-[11px] font-bold text-rose-600">{exportError}</p>
            )}
          </div>
        </div>

        {/* ── Filter bar ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#22334A]/10 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setFilters(f => ({ ...f, preset: p.value })); setDateFrom(''); setDateTo('') }}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition ${
                    filters.preset === p.value && !dateFrom
                      ? 'bg-[#2691C2] text-white shadow-sm'
                      : 'border border-[#22334A]/15 bg-[#f8fafc] text-[#22334A]/70 hover:bg-[#2691C2]/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="rounded-lg border border-[#22334A]/15 px-2.5 py-1.5 text-[11px] font-semibold text-[#22334A] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/30"
              />
              <span className="text-[11px] text-[#22334A]/40">إلى</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="rounded-lg border border-[#22334A]/15 px-2.5 py-1.5 text-[11px] font-semibold text-[#22334A] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/30"
              />
            </div>

            {/* Granularity */}
            <select
              value={granularity}
              onChange={e => setGranularity(e.target.value as typeof granularity)}
              className="rounded-lg border border-[#22334A]/15 px-2.5 py-1.5 text-[11px] font-semibold text-[#22334A] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/30"
            >
              <option value="daily">يومي</option>
              <option value="weekly">أسبوعي</option>
              <option value="monthly">شهري</option>
            </select>
          </div>
        </div>

        {/* ── Overview KPI cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {loading['overview'] ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#22334A]/5" />
            ))
          ) : overview ? (
            <>
              <KpiCard label="إجمالي الشهادات" value={fmt(overview.total)} icon={Award} color={C_BLUE} />
              <KpiCard label="صادرة" value={fmt(overview.issued)} icon={CheckCircle2} color={C_GREEN} />
              <KpiCard label="قيد المراجعة" value={fmt(overview.pending)} icon={Clock} color={C_ORANGE} />
              <KpiCard label="مرفوضة" value={fmt(overview.rejected)} icon={XCircle} color={C_ROSE} />
              <KpiCard label="ملغاة" value={fmt(overview.revoked)} icon={Shield} color="#64748b" />
              <KpiCard label="فشل الإنشاء" value={fmt(overview.generation_failed)} icon={FileX} color={C_ROSE} />
              <KpiCard label="PDF جاهز" value={fmt(overview.pdf_ready)} icon={FileCheck} color={C_GREEN} />
              <KpiCard label="PDF فاشل" value={fmt(overview.pdf_failed)} icon={FileX} color={C_ROSE} />
              <KpiCard label="هذا الشهر" value={fmt(overview.this_month)} icon={TrendingUp} color={C_BLUE} sub={`${fmt(overview.last_month)} الشهر الماضي`} />
              <KpiCard label="تنزيلات الفترة" value={fmt(overview.downloads_period)} icon={Download} color={C_VIOLET} />
              <KpiCard label="متوسط وقت الاعتماد" value={fmtHours(overview.avg_approval_hours)} icon={Clock} color={C_ORANGE} />
              <KpiCard label="معدل نجاح الدُفعات" value={overview.batch_success_rate != null ? `${overview.batch_success_rate}%` : '—'} icon={BarChart3} color={C_GREEN} />
            </>
          ) : errors['overview'] ? (
            <div className="col-span-full">
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <AlertCircle size={14} className="text-rose-500" />
                <p className="text-[12px] font-semibold text-rose-700">{errors['overview']}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto border-b border-[#22334A]/10 pb-px">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`shrink-0 rounded-t-lg px-4 py-2.5 text-[11px] font-black transition ${
                activeTab === t.key
                  ? 'border-b-2 border-[#2691C2] bg-[#2691C2]/8 text-[#2691C2]'
                  : 'text-[#22334A]/55 hover:text-[#22334A]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: TRENDS ════════════════════════════════════════════════════ */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <Section title="الشهادات الصادرة والمُنشأة بمرور الوقت" icon={TrendingUp}
              loading={loading['trends']} error={errors['trends']}
              action={
                <button onClick={() => handleExport('trends')} disabled={!!exporting}
                  className="flex items-center gap-1.5 rounded-lg bg-[#2691C2]/10 px-3 py-1.5 text-[11px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/20 disabled:opacity-50">
                  {exporting === 'trends' ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                  تصدير
                </button>
              }>
              {trends.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-[#22334A]/40">لا توجد بيانات لهذه الفترة</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={trends} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIssued" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C_BLUE}   stopOpacity={0.15} />
                        <stop offset="95%" stopColor={C_BLUE}   stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C_ORANGE} stopOpacity={0.12} />
                        <stop offset="95%" stopColor={C_ORANGE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#22334A08" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#22334A60' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#22334A60' }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #22334A10' }}
                      formatter={(v: unknown, name: unknown): [string | number, string] => [v as string | number, name === 'issued' ? 'صادرة' : name === 'created' ? 'منشأة' : name === 'downloads' ? 'تنزيلات' : String(name)]}
                    />
                    <Area type="monotone" dataKey="issued"    stroke={C_BLUE}   fill="url(#gIssued)"   strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="created"   stroke={C_ORANGE} fill="url(#gCreated)"  strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="downloads" stroke={C_GREEN}  fill="none"            strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Section>

            <Section title="فشل PDF بمرور الوقت" icon={FileX} loading={loading['trends']} error={errors['trends']}>
              {trends.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-[#22334A]/40">لا توجد بيانات</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trends} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#22334A08" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#22334A60' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#22334A60' }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: unknown): [string, string] => [String(v), 'فشل PDF']} />
                    <Bar dataKey="pdf_failed" fill={C_ROSE} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>
          </div>
        )}

        {/* ══ TAB: OVERVIEW (distribution) ══════════════════════════════════ */}
        {activeTab === 'overview' && distribution && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="توزيع حالة الشهادة" icon={Layers} loading={loading['distribution']} error={errors['distribution']}>
              {pieDistData.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-[#22334A]/40">لا توجد بيانات</p>
              ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={pieDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                        {pieDistData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: unknown, name: unknown): [string, string] => [String(v), String(name)]} contentStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5">
                    {pieDistData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.fill }} />
                        <span className="font-medium text-[#22334A]/70">{d.name}</span>
                        <span className="mr-auto font-black tabular-nums text-[#22334A]">{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            <Section title="توزيع حالة PDF" icon={FileCheck} loading={loading['distribution']} error={errors['distribution']}>
              {pdfPieData.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-[#22334A]/40">لا توجد بيانات</p>
              ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={pdfPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                        {pdfPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: unknown, name: unknown): [string, string] => [String(v), String(name)]} contentStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5">
                    {pdfPieData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.fill }} />
                        <span className="font-medium text-[#22334A]/70">{d.name}</span>
                        <span className="mr-auto font-black tabular-nums text-[#22334A]">{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ══ TAB: APPROVAL ═════════════════════════════════════════════════ */}
        {activeTab === 'approval' && (
          <div className="space-y-6">
            {approval && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="انتظار الاعتماد" value={fmt(approval.pending_approvals)} icon={Clock} color={C_ORANGE} />
                <KpiCard label="متوسط الاعتماد الأول" value={fmtHours(approval.avg_first_approval_hours)} icon={Clock} color={C_BLUE} />
                <KpiCard label="مكتمل هذا الشهر" value={fmt(approval.completed_this_month)} icon={CheckCircle2} color={C_GREEN} />
                <KpiCard label="مرفوض هذا الشهر" value={fmt(approval.rejected_this_month)} icon={XCircle} color={C_ROSE} />
              </div>
            )}

            <Section title="أكثر معتمِدين نشاطاً" icon={Users} loading={loading['approval']} error={errors['approval']}>
              {!approval?.top_approvers.length ? (
                <p className="py-4 text-center text-[12px] text-[#22334A]/40">لا توجد بيانات اعتماد</p>
              ) : (
                <div className="divide-y divide-[#22334A]/6">
                  {approval.top_approvers.map((a, i) => (
                    <div key={a.user_id} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2691C2]/10 text-[10px] font-black text-[#2691C2]">{i + 1}</span>
                      <span className="flex-1 text-[12px] font-bold text-[#22334A]">{a.name}</span>
                      <span className="text-[12px] font-black tabular-nums text-[#22334A]">{a.count} اعتماد</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="اعتمادات متأخرة (أكثر من 7 أيام)" icon={AlertTriangle} loading={loading['approval']} error={errors['approval']}>
              {!approval?.stuck_approvals.length ? (
                <p className="py-4 text-center text-[12px] text-[#22334A]/40">لا توجد اعتمادات متأخرة ✓</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="border-b border-[#22334A]/8 text-[10px] font-black uppercase text-[#22334A]/40">
                        <th className="pb-2 pr-2">رمز الشهادة</th>
                        <th className="pb-2 pr-2">العنوان</th>
                        <th className="pb-2 pr-2">الطالب</th>
                        <th className="pb-2 pr-2">حالة الاعتماد</th>
                        <th className="pb-2 pr-2">تاريخ الإنشاء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approval.stuck_approvals.map(c => (
                        <tr key={c.id} className="border-b border-[#22334A]/5 hover:bg-[#f8fafc]">
                          <td className="py-2 pr-2 font-mono font-bold text-[#2691C2]">{c.certificate_code}</td>
                          <td className="py-2 pr-2 text-[#22334A]">{c.title}</td>
                          <td className="py-2 pr-2 text-[#22334A]/70">{c.user?.name}</td>
                          <td className="py-2 pr-2">
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 ring-1 ring-amber-200">
                              {STATUS_AR[c.approval_status] ?? c.approval_status}
                            </span>
                          </td>
                          <td className="py-2 pr-2 text-[#22334A]/60">{fmtDate(c.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ══ TAB: PDF ══════════════════════════════════════════════════════ */}
        {activeTab === 'pdf' && (
          <div className="space-y-6">
            {pdfMetrics && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="PDF ناجح" value={fmt(pdfMetrics.successful)} icon={FileCheck} color={C_GREEN} />
                <KpiCard label="فشل PDF" value={fmt(pdfMetrics.failed)} icon={FileX} color={C_ROSE} />
                <KpiCard label="صادر بدون PDF" value={fmt(pdfMetrics.issued_missing_pdf)} icon={AlertTriangle} color={C_ORANGE} />
                <KpiCard label="متوسط وقت الإنشاء" value={pdfMetrics.avg_generation_secs != null ? `${pdfMetrics.avg_generation_secs}ث` : '—'} icon={Clock} color={C_BLUE} />
                <KpiCard label="حجم التخزين التقديري" value={fmtBytes(pdfMetrics.total_size_bytes)} icon={Layers} color={C_VIOLET} />
                <KpiCard label="فشل متكرر" value={fmt(pdfMetrics.repeated_failures)} icon={RefreshCw} color={C_ROSE} />
              </div>
            )}

            <Section title="أحدث حالات فشل PDF" icon={FileX} loading={loading['pdf']} error={errors['pdf']}>
              {!pdfMetrics?.latest_failed.length ? (
                <p className="py-4 text-center text-[12px] text-[#22334A]/40">لا توجد حالات فشل ✓</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="border-b border-[#22334A]/8 text-[10px] font-black uppercase text-[#22334A]/40">
                        <th className="pb-2 pr-2">رمز</th>
                        <th className="pb-2 pr-2">الطالب</th>
                        <th className="pb-2 pr-2">آخر خطأ</th>
                        <th className="pb-2 pr-2">التحديث</th>
                        <th className="pb-2 pr-2">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pdfMetrics.latest_failed.map(c => (
                        <tr key={c.id} className="border-b border-[#22334A]/5 hover:bg-[#f8fafc]">
                          <td className="py-2 pr-2 font-mono text-[10px] font-bold text-[#2691C2]">{c.certificate_code}</td>
                          <td className="py-2 pr-2 text-[#22334A]/70">{c.user?.name ?? '—'}</td>
                          <td className="max-w-[200px] py-2 pr-2">
                            <p className="truncate font-mono text-[10px] text-rose-600">{c.pdf_last_error ?? '—'}</p>
                          </td>
                          <td className="py-2 pr-2 text-[#22334A]/60">{fmtDate(c.updated_at)}</td>
                          <td className="py-2 pr-2">
                            <button
                              onClick={() => navigate(`/dashboard/admin/certificates/${c.id}`)}
                              className="rounded-lg bg-[#2691C2]/10 px-2.5 py-1 text-[10px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/20"
                            >
                              عرض
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ══ TAB: DOWNLOADS ════════════════════════════════════════════════ */}
        {activeTab === 'downloads' && (
          <div className="space-y-6">
            {downloads && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <KpiCard label="إجمالي التنزيلات" value={fmt(downloads.total_downloads)} icon={Download} color={C_BLUE} />
                <KpiCard label="شهادات مُحمَّلة" value={fmt(downloads.unique_certificates)} icon={FileCheck} color={C_GREEN} />
                <KpiCard label="طلاب حمّلوا" value={fmt(downloads.unique_students)} icon={Users} color={C_VIOLET} />
              </div>
            )}

            <Section title="أكثر الشهادات تنزيلاً" icon={Download} loading={loading['downloads']} error={errors['downloads']}>
              {!downloads?.most_downloaded.length ? (
                <p className="py-4 text-center text-[12px] text-[#22334A]/40">لا توجد تنزيلات</p>
              ) : (
                <div className="divide-y divide-[#22334A]/6">
                  {downloads.most_downloaded.map((d, i) => (
                    <div key={d.certificate_id} className="flex items-center gap-3 py-2.5">
                      <span className="shrink-0 text-[11px] font-black tabular-nums text-[#22334A]/40">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[12px] font-bold text-[#22334A]">{d.title ?? '—'}</p>
                        <p className="font-mono text-[10px] text-[#2691C2]">{d.certificate_code}</p>
                      </div>
                      <span className="shrink-0 text-[12px] font-black tabular-nums text-[#22334A]">{d.download_count} تنزيل</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="شهادات صادرة لم تُحمَّل بعد" icon={AlertTriangle} loading={loading['downloads']} error={errors['downloads']}>
              {!downloads?.not_downloaded.length ? (
                <p className="py-4 text-center text-[12px] text-[#22334A]/40">كل الشهادات الصادرة تم تحميلها ✓</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="border-b border-[#22334A]/8 text-[10px] font-black uppercase text-[#22334A]/40">
                        <th className="pb-2 pr-2">رمز</th>
                        <th className="pb-2 pr-2">العنوان</th>
                        <th className="pb-2 pr-2">تاريخ الإصدار</th>
                      </tr>
                    </thead>
                    <tbody>
                      {downloads.not_downloaded.map(c => (
                        <tr key={c.id} className="border-b border-[#22334A]/5 hover:bg-[#f8fafc] cursor-pointer"
                          onClick={() => navigate(`/dashboard/admin/certificates/${c.id}`)}>
                          <td className="py-2 pr-2 font-mono text-[10px] font-bold text-[#2691C2]">{c.certificate_code}</td>
                          <td className="py-2 pr-2 text-[#22334A]">{c.title}</td>
                          <td className="py-2 pr-2 text-[#22334A]/60">{fmtDate(c.issued_at ?? '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ══ TAB: TEMPLATES ════════════════════════════════════════════════ */}
        {activeTab === 'templates' && (
          <Section title="استخدام القوالب" icon={Layers}
            loading={loading['templates']} error={errors['templates']}
            action={
              <button onClick={() => handleExport('templates')} disabled={!!exporting}
                className="flex items-center gap-1.5 rounded-lg bg-[#2691C2]/10 px-3 py-1.5 text-[11px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/20 disabled:opacity-50">
                {exporting === 'templates' ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                تصدير
              </button>
            }>
            {!templateUsage.length ? (
              <p className="py-4 text-center text-[12px] text-[#22334A]/40">لا توجد قوالب</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-[11px]">
                  <thead>
                    <tr className="border-b border-[#22334A]/8 text-[10px] font-black uppercase text-[#22334A]/40">
                      <th className="pb-2 pr-2">القالب</th>
                      <th className="pb-2 pr-2">الحالة</th>
                      <th className="pb-2 pr-2">إجمالي</th>
                      <th className="pb-2 pr-2">صادرة</th>
                      <th className="pb-2 pr-2">فشل PDF</th>
                      <th className="pb-2 pr-2">متوسط وقت PDF</th>
                      <th className="pb-2 pr-2">آخر استخدام</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templateUsage.map(t => (
                      <tr key={t.id} className="border-b border-[#22334A]/5 hover:bg-[#f8fafc]">
                        <td className="py-2.5 pr-2">
                          <div>
                            <p className="font-bold text-[#22334A]">{t.name}</p>
                            {t.is_default && <span className="text-[9px] font-black text-[#2691C2]">افتراضي</span>}
                          </div>
                        </td>
                        <td className="py-2.5 pr-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${t.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
                            {t.is_active ? 'نشط' : 'غير نشط'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-2 font-black tabular-nums text-[#22334A]">{fmtNum(t.total_certificates)}</td>
                        <td className="py-2.5 pr-2 font-black tabular-nums text-emerald-700">{fmtNum(t.issued_certificates)}</td>
                        <td className="py-2.5 pr-2 font-black tabular-nums text-rose-600">{fmtNum(t.pdf_failures)}</td>
                        <td className="py-2.5 pr-2 text-[#22334A]/70">{t.avg_pdf_seconds != null ? `${t.avg_pdf_seconds}ث` : '—'}</td>
                        <td className="py-2.5 pr-2 text-[#22334A]/60">{t.last_used_at ? fmtDate(t.last_used_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}

        {/* ══ TAB: SOURCES ══════════════════════════════════════════════════ */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            <Section title="شهادات الدورات" icon={Award}
              loading={loading['courses']} error={errors['courses']}
              action={
                <button onClick={() => handleExport('courses')} disabled={!!exporting}
                  className="flex items-center gap-1.5 rounded-lg bg-[#2691C2]/10 px-3 py-1.5 text-[11px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/20 disabled:opacity-50">
                  {exporting === 'courses' ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                  تصدير
                </button>
              }>
              {!courses.length ? (
                <p className="py-4 text-center text-[12px] text-[#22334A]/40">لا توجد دورات بشهادات</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="border-b border-[#22334A]/8 text-[10px] font-black uppercase text-[#22334A]/40">
                        <th className="pb-2 pr-2">الدورة</th>
                        <th className="pb-2 pr-2">إجمالي</th>
                        <th className="pb-2 pr-2">صادرة</th>
                        <th className="pb-2 pr-2">قيد المراجعة</th>
                        <th className="pb-2 pr-2">مرفوضة</th>
                        <th className="pb-2 pr-2">فشل PDF</th>
                        <th className="pb-2 pr-2">معدل التنزيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.slice(0, 30).map((c, i) => (
                        <tr key={i} className="border-b border-[#22334A]/5 hover:bg-[#f8fafc]">
                          <td className="max-w-[200px] truncate py-2.5 pr-2 font-bold text-[#22334A]">{c.course_title ?? c.path_title ?? '—'}</td>
                          <td className="py-2.5 pr-2 font-black tabular-nums text-[#22334A]">{fmtNum(c.total)}</td>
                          <td className="py-2.5 pr-2 font-black tabular-nums text-emerald-700">{fmtNum(c.issued)}</td>
                          <td className="py-2.5 pr-2 tabular-nums text-amber-700">{fmtNum(c.pending)}</td>
                          <td className="py-2.5 pr-2 tabular-nums text-rose-600">{fmtNum(c.rejected)}</td>
                          <td className="py-2.5 pr-2 tabular-nums text-rose-500">{fmtNum(c.pdf_failed)}</td>
                          <td className="py-2.5 pr-2">
                            <span className={`font-black ${(c.download_rate ?? 0) >= 75 ? 'text-emerald-600' : (c.download_rate ?? 0) >= 40 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {c.download_rate != null ? `${c.download_rate}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ══ TAB: BATCHES ══════════════════════════════════════════════════ */}
        {activeTab === 'batches' && (
          <div className="space-y-6">
            {batches && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="إجمالي الدُفعات" value={fmt(batches.total)} icon={Layers} color={C_BLUE} />
                <KpiCard label="مكتملة" value={fmt(batches.completed)} icon={CheckCircle2} color={C_GREEN} />
                <KpiCard label="فاشلة" value={fmt(batches.failed)} icon={XCircle} color={C_ROSE} />
                <KpiCard label="مكتملة بأخطاء" value={fmt(batches.completed_with_errors)} icon={AlertTriangle} color={C_ORANGE} />
                <KpiCard label="إجمالي المستفيدين" value={fmt(batches.total_recipients)} icon={Users} color={C_BLUE} />
                <KpiCard label="أكبر دُفعة" value={fmt(batches.largest_batch)} icon={Layers} color={C_VIOLET} />
                <KpiCard label="متوسط وقت الإكمال" value={batches.avg_completion_minutes != null ? `${batches.avg_completion_minutes} د` : '—'} icon={Clock} color={C_ORANGE} />
                <KpiCard label="فشل إجمالي" value={fmt(batches.total_failed)} icon={FileX} color={C_ROSE} />
              </div>
            )}

            <Section title="الدُفعات الأخيرة" icon={Layers}
              loading={loading['batches']} error={errors['batches']}
              action={
                <button onClick={() => handleExport('batches')} disabled={!!exporting}
                  className="flex items-center gap-1.5 rounded-lg bg-[#2691C2]/10 px-3 py-1.5 text-[11px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/20 disabled:opacity-50">
                  {exporting === 'batches' ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                  تصدير
                </button>
              }>
              {!batches?.batches.length ? (
                <p className="py-4 text-center text-[12px] text-[#22334A]/40">لا توجد دُفعات</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="border-b border-[#22334A]/8 text-[10px] font-black uppercase text-[#22334A]/40">
                        <th className="pb-2 pr-2">رمز الدُفعة</th>
                        <th className="pb-2 pr-2">المُنشئ</th>
                        <th className="pb-2 pr-2">الحالة</th>
                        <th className="pb-2 pr-2">إجمالي</th>
                        <th className="pb-2 pr-2">منشأ</th>
                        <th className="pb-2 pr-2">فاشل</th>
                        <th className="pb-2 pr-2">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.batches.map(b => (
                        <tr key={b.id} className="border-b border-[#22334A]/5 hover:bg-[#f8fafc]">
                          <td className="py-2.5 pr-2 font-mono text-[10px] font-bold text-[#2691C2]">{b.batch_code}</td>
                          <td className="py-2.5 pr-2 text-[#22334A]/70">{b.createdBy?.name ?? b.created_by_user?.name ?? '—'}</td>
                          <td className="py-2.5 pr-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${BATCH_STATUS_CLS[b.status] ?? 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-2.5 pr-2 font-black tabular-nums text-[#22334A]">{b.total_recipients}</td>
                          <td className="py-2.5 pr-2 font-black tabular-nums text-emerald-700">{b.generated_count}</td>
                          <td className="py-2.5 pr-2 font-black tabular-nums text-rose-600">{b.failed_count}</td>
                          <td className="py-2.5 pr-2 text-[#22334A]/60">{fmtDate(b.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ══ TAB: FAILURES ══════════════════════════════════════════════════ */}
        {activeTab === 'failures' && (
          <Section title="تقرير صحة العمليات" icon={AlertTriangle}
            loading={loading['failures']} error={errors['failures']}
            action={
              <button onClick={() => handleExport('failures')} disabled={!!exporting}
                className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50">
                {exporting === 'failures' ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                تصدير
              </button>
            }>
            {failures.length === 0 ? (
              <div className="flex flex-col items-center py-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                </div>
                <p className="mt-3 text-[13px] font-black text-[#22334A]">لا توجد أعطال ✓</p>
                <p className="mt-1 text-[11px] text-[#22334A]/50">جميع العمليات تعمل بشكل طبيعي في هذه الفترة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {failures.map((f, i) => (
                  <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                          <AlertTriangle size={14} className="text-amber-600" />
                        </div>
                        <div>
                          <p className="text-[12px] font-black text-[#22334A]">{f.label}</p>
                          <p className="text-[10px] font-medium text-[#22334A]/55">{f.recommended_action}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xl font-black tabular-nums text-[#22334A]">{f.count.toLocaleString()}</p>
                        {f.latest_occurrence && (
                          <p className="text-[10px] text-[#22334A]/50">{fmtDate(f.latest_occurrence)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>
    </AdminLmsShell>
  )
}

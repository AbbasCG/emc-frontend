import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Mail, CheckCircle, XCircle, Clock, RefreshCw, ChevronLeft, ChevronRight,
  Search, Filter, X, AlertTriangle, Send, Eye, Copy,
  TrendingUp, Activity, Inbox, ZapOff, Server, BarChart2,
} from 'lucide-react'
import {
  fetchEmailLogs,
  fetchEmailLogStats,
  fetchEmailLog,
  fetchEmailLogChart,
  fetchEmailQueueStats,
  retryEmailLog,
  type EmailLog,
  type EmailLogStats,
  type EmailLogMeta,
  type EmailChartPoint,
  type EmailQueueStats,
} from '@/api/emailAdminApi'

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  welcome:                    'ترحيب',
  account_created:            'إنشاء حساب',
  password_reset:             'إعادة تعيين كلمة المرور',
  course_enrollment:          'تسجيل في دورة',
  course_approved:            'موافقة على دورة',
  course_rejected:            'رفض دورة',
  learning_path_enrollment:   'تسجيل في مسار',
  course_completion:          'إتمام دورة',
  learning_path_completion:   'إتمام مسار',
  assignment_submitted:       'تسليم واجب',
  assignment_graded:          'تقييم واجب',
  assignment_reminder:        'تذكير واجب',
  session_reminder:           'تذكير جلسة',
  attendance:                 'تسجيل حضور',
  certificate_issued:         'إصدار شهادة',
  contact_form:               'نموذج تواصل',
  support_ticket:             'تذكرة دعم',
  announcement:               'إعلان',
  marketing:                  'تسويقي',
  newsletter:                 'نشرة إخبارية',
  system_notification:        'إشعار نظام',
  manual:                     'يدوي',
  admin_new_registration:     'تسجيل جديد (إدارة)',
}

const STATUS: Record<string, { label: string; dot: string; badge: string; text: string; ring: string }> = {
  sent:     { label: 'مُرسَل',        dot: 'bg-emerald-500', badge: 'bg-emerald-50 border-emerald-200',  text: 'text-emerald-700', ring: 'ring-emerald-200' },
  pending:  { label: 'في الانتظار',   dot: 'bg-blue-500',   badge: 'bg-blue-50 border-blue-200',        text: 'text-blue-700',    ring: 'ring-blue-200' },
  queued:   { label: 'مُجدوَل',       dot: 'bg-sky-500',    badge: 'bg-sky-50 border-sky-200',           text: 'text-sky-700',     ring: 'ring-sky-200' },
  sending:  { label: 'جارٍ الإرسال', dot: 'bg-amber-500',  badge: 'bg-amber-50 border-amber-200',      text: 'text-amber-700',   ring: 'ring-amber-200' },
  failed:   { label: 'فاشل',          dot: 'bg-red-500',    badge: 'bg-red-50 border-red-200',          text: 'text-red-700',     ring: 'ring-red-200' },
  bounced:  { label: 'مُرتجَع',       dot: 'bg-purple-500', badge: 'bg-purple-50 border-purple-200',    text: 'text-purple-700',  ring: 'ring-purple-200' },
  skipped_disabled: { label: 'تم التخطي (معطّل من الإعدادات)', dot: 'bg-slate-400', badge: 'bg-slate-50 border-slate-200', text: 'text-slate-500', ring: 'ring-slate-200' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function n(v: number): string { return v.toLocaleString('en-US') }

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('ar-SA', {
      numberingSystem: 'latn', year: 'numeric', month: 'short',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return d }
}

function fmtShort(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  } catch { return d }
}

function timeAgo(d: string | null | undefined): string {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `${m}د`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}س`
  return `${Math.floor(h / 24)}ي`
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function copyText(text: string) { void navigator.clipboard.writeText(text) }

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const cfg = STATUS[status] ?? { label: status, dot: 'bg-slate-400', badge: 'bg-slate-50 border-slate-200', text: 'text-slate-600', ring: '' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-bold ${cfg.badge} ${cfg.text} ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}`}>
      <span className={`rounded-full ${cfg.dot} ${size === 'sm' ? 'h-1.5 w-1.5' : 'h-1.5 w-1.5'}`} />
      {cfg.label}
    </span>
  )
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
        {sub && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{sub}</span>}
      </div>
      <p className="text-2xl font-black text-slate-800 tabular-nums leading-none">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  )
}

// ── Bar Chart (CSS-only) ──────────────────────────────────────────────────────

function MiniBarChart({ data, days }: { data: EmailChartPoint[]; days: number }) {
  const slice = data.slice(-days)
  const maxTotal = Math.max(...slice.map(d => d.total), 1)

  return (
    <div className="flex items-end gap-1 h-20">
      {slice.map((d, i) => {
        const sentH = Math.round((d.sent / maxTotal) * 80)
        const failedH = Math.round((d.failed / maxTotal) * 80)
        const pendH = Math.round((d.pending / maxTotal) * 80)
        const dateLabel = new Date(d.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', numberingSystem: 'latn' })
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <p className="font-bold mb-0.5">{dateLabel}</p>
              <p className="text-emerald-300">مُرسَل: {d.sent}</p>
              {d.failed > 0 && <p className="text-red-300">فاشل: {d.failed}</p>}
              {d.pending > 0 && <p className="text-blue-300">انتظار: {d.pending}</p>}
            </div>
            {/* Stacked bar */}
            <div className="w-full flex flex-col-reverse gap-px">
              {pendH > 0 && <div className="w-full rounded-t-sm bg-blue-200" style={{ height: pendH }} />}
              {failedH > 0 && <div className="w-full bg-red-400" style={{ height: failedH }} />}
              {sentH > 0 && <div className="w-full rounded-t-sm bg-emerald-400" style={{ height: sentH }} />}
              {d.total === 0 && <div className="w-full rounded-sm bg-slate-100" style={{ height: 3 }} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SuccessRateLine({ data }: { data: EmailChartPoint[] }) {
  if (data.length < 2) return null
  const w = 100 / (data.length - 1)
  const points = data.map((d, i) => `${i * w},${100 - (d.success_rate ?? 0)}`).join(' ')
  const areaPoints = `0,100 ${points} ${(data.length - 1) * w},100`
  return (
    <svg viewBox={`0 0 100 100`} preserveAspectRatio="none" className="w-full h-16">
      <defs>
        <linearGradient id="srGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#srGrad)" />
      <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ log, onClose, onRetry, retrying }: {
  log: EmailLog; onClose: () => void; onRetry: (id: number) => void; retrying: boolean
}) {
  const [detail, setDetail] = useState<EmailLog>(log)
  const [loadingDetail, setLoadingDetail] = useState(true)

  // Re-arm the loading bar during render when the drawer switches log (react.dev
  // "adjusting state when a prop changes"); the initial `true` covers the first pass.
  const [seenLogId, setSeenLogId] = useState(log.id)
  if (seenLogId !== log.id) {
    setSeenLogId(log.id)
    setLoadingDetail(true)
  }

  useEffect(() => {
    fetchEmailLog(log.id)
      .then(d => setDetail(d))
      .catch(() => {/* use log as fallback */})
      .finally(() => setLoadingDetail(false))
  }, [log.id])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const cfg = STATUS[detail.status] ?? STATUS.sent

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#1E3A5F] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="font-black text-sm">تفاصيل الرسالة</p>
              <p className="text-[10px] text-white/40 font-mono">{detail.uuid ?? `#${detail.id}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loadingDetail && <div className="h-1 bg-slate-100 rounded overflow-hidden"><div className="h-full w-1/2 bg-[#1E3A5F] animate-pulse rounded" /></div>}

          {/* Status */}
          <div className={`rounded-xl p-4 border ${cfg.badge}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                <span className={`font-black text-sm ${cfg.text}`}>{cfg.label}</span>
                {detail.retry_count > 0 && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {detail.retry_count} محاولة
                  </span>
                )}
              </div>
              {detail.execution_time_ms != null && (
                <span className="text-[11px] font-mono text-slate-400">{fmtMs(detail.execution_time_ms)}</span>
              )}
            </div>
            {detail.status === 'failed' && detail.error_message && (
              <p className="text-xs text-red-600 mt-2 font-mono break-all leading-relaxed">{detail.error_message}</p>
            )}
          </div>

          {/* Recipient */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">المستلم</p>
            {detail.recipient_name && <p className="text-sm font-bold text-slate-800">{detail.recipient_name}</p>}
            {detail.user?.name && detail.user.name !== detail.recipient_name && (
              <p className="text-xs text-slate-500">{detail.user.name}</p>
            )}
            <p className="text-xs font-mono text-slate-500 mt-0.5">{detail.recipient}</p>
          </div>

          {/* Email info */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">معلومات الرسالة</p>
            <DR label="الموضوع" value={detail.subject ?? '—'} />
            <DR label="النوع" value={TYPE_LABELS[detail.type] ?? detail.type} />
            <DR label="الدورة المرتبطة" value={detail.related_course?.title ?? '—'} />
            <DR label="مُنشأة بواسطة" value={detail.triggered_by?.name ?? 'النظام تلقائياً'} />
            <DR label="برنامج الإرسال" value={detail.mail_driver ?? '—'} />
          </div>

          {/* Timeline */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">التوقيتات</p>
            <DR label="الإنشاء" value={fmtDate(detail.created_at)} />
            <DR label="الجدولة" value={fmtShort(detail.queued_at)} />
            <DR label="الإرسال" value={fmtShort(detail.sent_at)} />
            <DR label="زمن التسليم" value={fmtMs(detail.delivery_time_ms)} />
            {detail.failed_at && <DR label="وقت الفشل" value={fmtShort(detail.failed_at)} />}
          </div>

          {/* Technical */}
          {(detail.job_id || detail.uuid) && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">بيانات تقنية</p>
              {detail.uuid && <DR label="UUID" value={detail.uuid} mono copyable />}
              {detail.job_id && <DR label="Job ID" value={detail.job_id} mono copyable />}
            </div>
          )}

          {/* SMTP Response */}
          {detail.smtp_response && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">استجابة SMTP</p>
              <div className="bg-slate-900 rounded-xl p-3 relative group">
                <pre className="text-[11px] text-amber-300 font-mono break-all whitespace-pre-wrap leading-relaxed">{detail.smtp_response}</pre>
                <button
                  onClick={() => copyText(detail.smtp_response ?? '')}
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 h-6 w-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                >
                  <Copy className="h-3 w-3 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Payload */}
          {detail.payload && Object.keys(detail.payload).length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">البيانات المرفقة</p>
              <div className="bg-slate-900 rounded-xl p-3 overflow-x-auto">
                <pre className="text-[11px] text-emerald-300 font-mono">{JSON.stringify(detail.payload, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {detail.status === 'failed' && (
              <button
                onClick={() => onRetry(detail.id)}
                disabled={retrying}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50 transition"
              >
                <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
                إعادة الإرسال
              </button>
            )}
            <button
              onClick={() => copyText(detail.recipient)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition"
            >
              <Copy className="h-4 w-4" />
              نسخ البريد
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DR({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-slate-400 shrink-0 pt-0.5">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-[11px] font-bold text-slate-700 text-left truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
        {copyable && value !== '—' && (
          <button onClick={() => copyText(value)} className="shrink-0 h-4 w-4 rounded flex items-center justify-center hover:bg-slate-200 transition">
            <Copy className="h-2.5 w-2.5 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Table Skeleton ────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse divide-y divide-slate-50">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <div className="h-5 bg-slate-100 rounded-full w-16" />
          <div className="flex flex-col gap-1 flex-1">
            <div className="h-3 bg-slate-100 rounded w-28" />
            <div className="h-2.5 bg-slate-50 rounded w-40" />
          </div>
          <div className="h-3 bg-slate-100 rounded w-32" />
          <div className="h-5 bg-slate-100 rounded-lg w-20" />
          <div className="h-3 bg-slate-100 rounded w-16" />
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type EmailDashboardQuery = {
  status?: string
  type?: string
  search?: string
  date_from?: string
  date_to?: string
  page: number
  chartDays: number
}

/** Pure I/O — no state — shared by the dashboard effect and the imperative `loadAll`,
 *  so neither has to call a state-mutating helper. */
async function fetchEmailDashboard(q: EmailDashboardQuery) {
  const [logsRes, statsRes, chartRes, queueRes] = await Promise.all([
    fetchEmailLogs({
      status: q.status || undefined,
      type: q.type || undefined,
      search: q.search || undefined,
      date_from: q.date_from || undefined,
      date_to: q.date_to || undefined,
      page: q.page,
    }),
    fetchEmailLogStats(),
    fetchEmailLogChart(q.chartDays),
    fetchEmailQueueStats(),
  ])
  return { logsRes, statsRes, chartRes, queueRes }
}

export default function EmailLogsPage() {
  const [logs, setLogs]             = useState<EmailLog[]>([])
  const [stats, setStats]           = useState<EmailLogStats | null>(null)
  const [chart, setChart]           = useState<EmailChartPoint[]>([])
  const [queue, setQueue]           = useState<EmailQueueStats | null>(null)
  const [meta, setMeta]             = useState<EmailLogMeta>({ total: 0, current_page: 1, last_page: 1, per_page: 25 })
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected]     = useState<EmailLog | null>(null)
  const [retryingId, setRetryingId] = useState<number | null>(null)
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [chartDays, setChartDays]   = useState(14)
  const searchRef                   = useRef<HTMLInputElement>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  /** Imperative (re)load from an event handler — outside any effect, so flipping to
   *  the loading state synchronously is both allowed and required here. */
  const loadAll = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const { logsRes, statsRes, chartRes, queueRes } = await fetchEmailDashboard({
        status: statusFilter,
        type: typeFilter,
        search,
        date_from: dateFrom,
        date_to: dateTo,
        page,
        chartDays,
      })
      setLogs(logsRes.data)
      setMeta(logsRes.meta)
      setStats(statsRes)
      setChart(chartRes)
      setQueue(queueRes)
    } catch {
      showToast('error', 'فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, search, dateFrom, dateTo, chartDays])

  // Re-arm the loading state during render when the query changes (react.dev
  // "adjusting state when a prop changes"); `loading` already starts as `true`.
  const query = { statusFilter, typeFilter, search, dateFrom, dateTo, chartDays }
  const [seenQuery, setSeenQuery] = useState(query)
  if (
    seenQuery.statusFilter !== statusFilter ||
    seenQuery.typeFilter !== typeFilter ||
    seenQuery.search !== search ||
    seenQuery.dateFrom !== dateFrom ||
    seenQuery.dateTo !== dateTo ||
    seenQuery.chartDays !== chartDays
  ) {
    setSeenQuery(query)
    setLoading(true)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { logsRes, statsRes, chartRes, queueRes } = await fetchEmailDashboard({
          status: statusFilter,
          type: typeFilter,
          search,
          date_from: dateFrom,
          date_to: dateTo,
          page: 1,
          chartDays,
        })
        if (!alive) return
        setLogs(logsRes.data)
        setMeta(logsRes.meta)
        setStats(statsRes)
        setChart(chartRes)
        setQueue(queueRes)
      } catch {
        if (alive) showToast('error', 'فشل تحميل البيانات')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [statusFilter, typeFilter, search, dateFrom, dateTo, chartDays])

  const handleRetry = async (id: number) => {
    setRetryingId(id)
    try {
      await retryEmailLog(id)
      showToast('success', 'تمت إعادة جدولة الرسالة بنجاح')
      void loadAll(meta.current_page)
    } catch {
      showToast('error', 'فشلت إعادة الإرسال. هذا النوع لا يدعم إعادة الإرسال التلقائي.')
    } finally {
      setRetryingId(null)
    }
  }

  const activeFilters = [statusFilter, typeFilter, dateFrom, dateTo].filter(Boolean).length
  const clearFilters  = () => { setStatusFilter(''); setTypeFilter(''); setDateFrom(''); setDateTo('') }

  // Pagination numbers (max 7 shown)
  const pages = (() => {
    const total = meta.last_page
    const cur   = meta.current_page
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (cur <= 4) return [1, 2, 3, 4, 5, -1, total]
    if (cur >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total]
    return [1, -1, cur - 1, cur, cur + 1, -1, total]
  })()

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-1/2 translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold text-white ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <DetailDrawer
          log={selected}
          onClose={() => setSelected(null)}
          onRetry={handleRetry}
          retrying={retryingId === selected.id}
        />
      )}

      <div className="max-w-[1400px] mx-auto p-6 space-y-5">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="bg-[#1E3A5F] rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black">مركز مراقبة البريد الإلكتروني</h1>
              <p className="text-white/50 text-sm mt-0.5">تتبع الإرسال، الفشل، أداء قائمة الانتظار في الوقت الفعلي</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stats && (
              <>
                <Chip color="bg-emerald-500/20 text-emerald-300" label={`${n(stats.sent_today)} أُرسلت اليوم`} />
                {stats.failed_today > 0 && <Chip color="bg-red-500/20 text-red-300" label={`${n(stats.failed_today)} فاشل`} />}
                {stats.pending > 0 && <Chip color="bg-blue-500/20 text-blue-300" label={`${n(stats.pending)} انتظار`} />}
              </>
            )}
            <button
              onClick={() => void loadAll(meta.current_page)}
              disabled={loading}
              className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition ml-1"
              title="تحديث"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── KPI Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <div className="xl:col-span-1 col-span-2 lg:col-span-4 xl:col-auto grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-1 gap-3 xl:contents">
            {null}
          </div>
          <KpiCard
            icon={<Inbox className="h-4 w-4 text-white" />}
            label="إجمالي الرسائل"
            value={stats ? n(stats.total) : '—'}
            accent="bg-[#1E3A5F]"
          />
          <KpiCard
            icon={<Send className="h-4 w-4 text-white" />}
            label="مُرسلة اليوم"
            value={stats ? n(stats.sent_today) : '—'}
            accent="bg-emerald-500"
          />
          <KpiCard
            icon={<Activity className="h-4 w-4 text-white" />}
            label="معدل النجاح"
            value={stats ? `${stats.success_rate}%` : '—'}
            accent={stats && stats.success_rate >= 90 ? 'bg-emerald-500' : stats && stats.success_rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}
            sub={stats?.avg_delivery_ms ? fmtMs(stats.avg_delivery_ms) : undefined}
          />
          <KpiCard
            icon={<Clock className="h-4 w-4 text-white" />}
            label="في الانتظار"
            value={stats ? n(stats.pending) : '—'}
            accent="bg-blue-500"
          />
          <KpiCard
            icon={<ZapOff className="h-4 w-4 text-white" />}
            label="فاشلة"
            value={stats ? n(stats.failed) : '—'}
            accent={stats?.failed ? 'bg-red-500' : 'bg-slate-400'}
          />
          <KpiCard
            icon={<AlertTriangle className="h-4 w-4 text-white" />}
            label="فاشلة اليوم"
            value={stats ? n(stats.failed_today) : '—'}
            accent={stats?.failed_today ? 'bg-orange-500' : 'bg-slate-400'}
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4 text-white" />}
            label="مُرسلة (كل الوقت)"
            value={stats ? n(stats.total_sent) : '—'}
            accent="bg-teal-500"
          />
        </div>

        {/* ── Charts + Queue ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Volume chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-black text-slate-700">حجم الإرسال</p>
              </div>
              <div className="flex gap-1">
                {([7, 14, 30] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setChartDays(d)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${chartDays === d ? 'bg-[#1E3A5F] text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                  >
                    {d}ي
                  </button>
                ))}
              </div>
            </div>
            {chart.length > 0 ? (
              <>
                <MiniBarChart data={chart} days={chartDays} />
                <div className="flex items-center gap-4 mt-3">
                  <Legend dot="bg-emerald-400" label="مُرسَل" />
                  <Legend dot="bg-red-400" label="فاشل" />
                  <Legend dot="bg-blue-200" label="انتظار" />
                </div>
              </>
            ) : (
              <div className="h-20 flex items-center justify-center text-slate-300 text-sm">لا بيانات</div>
            )}
          </div>

          {/* Success rate + Queue */}
          <div className="flex flex-col gap-4">
            {/* Success rate mini chart */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex-1">
              <p className="text-sm font-black text-slate-700 mb-1">معدل النجاح</p>
              <p className="text-3xl font-black text-emerald-600 tabular-nums">{stats ? `${stats.success_rate}%` : '—'}</p>
              <div className="mt-2">
                {chart.length > 0 ? <SuccessRateLine data={chart} /> : <div className="h-16 bg-slate-50 rounded-xl" />}
              </div>
            </div>

            {/* Queue monitor */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-black text-slate-700">مراقبة قائمة الانتظار</p>
              </div>
              {queue ? (
                <div className="space-y-2">
                  <QRow label="انتظار" value={queue.pending_logs} color="text-blue-600" />
                  <QRow label="فاشل" value={queue.failed_logs} color="text-red-600" />
                  <QRow label="إعادة محاولة" value={queue.retrying} color="text-amber-600" />
                  {queue.queue_jobs > 0 && <QRow label="وظائف في الصف" value={queue.queue_jobs} color="text-slate-600" />}
                  {queue.failed_jobs > 0 && <QRow label="وظائف فاشلة" value={queue.failed_jobs} color="text-red-600" />}
                </div>
              ) : (
                <div className="space-y-2 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-5 bg-slate-100 rounded" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="p-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void loadAll(1) }}
                placeholder="ابحث بالبريد، الاسم، الموضوع، الدورة..."
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${showFilters || activeFilters > 0 ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              <Filter className="h-4 w-4" />
              فلاتر
              {activeFilters > 0 && (
                <span className="h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{activeFilters}</span>
              )}
            </button>
            <button
              onClick={() => void loadAll(1)}
              className="px-5 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-bold transition"
            >
              بحث
            </button>
          </div>

          {showFilters && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3 flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">الحالة</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 bg-slate-50"
                >
                  <option value="">الكل</option>
                  {Object.entries(STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">النوع</label>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 bg-slate-50"
                >
                  <option value="">الكل</option>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">من تاريخ</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 bg-slate-50" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">إلى تاريخ</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 bg-slate-50" />
              </div>
              {activeFilters > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-red-500 font-bold hover:bg-red-50 transition"
                >
                  <X className="h-3.5 w-3.5" />
                  مسح الفلاتر
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Table meta bar */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 shrink-0">
              <strong className="text-slate-700">{n(meta.total)}</strong> رسالة
              {activeFilters > 0 && <span className="text-slate-400"> · فلتر نشط</span>}
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {Object.entries(STATUS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => { setStatusFilter(statusFilter === k ? '' : k) }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${statusFilter === k ? `${v.badge} ${v.text} border` : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <Skeleton />
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Inbox className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">لا توجد رسائل تطابق البحث</p>
              <p className="text-xs">جرّب تغيير الفلاتر أو نطاق التاريخ</p>
              {activeFilters > 0 && (
                <button onClick={clearFilters} className="mt-1 text-xs text-[#1E3A5F] font-bold hover:underline">مسح الفلاتر</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/70">
                    <Th>الحالة</Th>
                    <Th>المستلم</Th>
                    <Th>الموضوع</Th>
                    <Th>النوع</Th>
                    <Th>الدورة</Th>
                    <Th>الإنشاء</Th>
                    <Th>زمن الإرسال</Th>
                    <Th>محاولات</Th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map(log => (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-xs font-bold text-slate-700 leading-snug">{log.recipient_name ?? log.user?.name ?? '—'}</p>
                          <p className="font-mono text-[10px] text-slate-400 mt-0.5">{log.recipient}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <p className="text-xs text-slate-600 truncate" title={log.subject ?? undefined}>{log.subject ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {TYPE_LABELS[log.type] ?? log.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[140px]">
                        <p className="text-[11px] text-slate-400 truncate">{log.related_course?.title ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-[11px] text-slate-500">{timeAgo(log.created_at)}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-mono text-[11px] text-slate-400">{fmtMs(log.execution_time_ms)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {log.retry_count > 0 ? (
                          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{log.retry_count}×</span>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-left">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <ActionBtn title="عرض" onClick={() => setSelected(log)}>
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                          </ActionBtn>
                          {log.status === 'failed' && (
                            <ActionBtn
                              title="إعادة"
                              onClick={e => { e.stopPropagation(); void handleRetry(log.id) }}
                              disabled={retryingId === log.id}
                              red
                            >
                              <RefreshCw className={`h-3.5 w-3.5 text-red-500 ${retryingId === log.id ? 'animate-spin' : ''}`} />
                            </ActionBtn>
                          )}
                          <ActionBtn title="نسخ البريد" onClick={e => { e.stopPropagation(); copyText(log.recipient) }}>
                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && meta.last_page > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                صفحة <strong className="text-slate-600">{meta.current_page}</strong> / <strong className="text-slate-600">{n(meta.last_page)}</strong>
              </span>
              <div className="flex items-center gap-1">
                <PgBtn disabled={meta.current_page <= 1} onClick={() => void loadAll(meta.current_page - 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </PgBtn>
                {pages.map((p, i) =>
                  p === -1 ? (
                    <span key={`ellipsis-${i}`} className="h-8 w-6 flex items-center justify-center text-slate-300 text-xs">…</span>
                  ) : (
                    <PgBtn key={p} active={p === meta.current_page} onClick={() => void loadAll(p)}>
                      {p}
                    </PgBtn>
                  )
                )}
                <PgBtn disabled={meta.current_page >= meta.last_page} onClick={() => void loadAll(meta.current_page + 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </PgBtn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function Chip({ color, label }: { color: string; label: string }) {
  return <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold ${color}`}>{label}</span>
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
      <span className={`h-2 w-2 rounded-sm ${dot}`} />
      {label}
    </span>
  )
}

function QRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-black tabular-nums ${value > 0 ? color : 'text-slate-300'}`}>{n(value)}</span>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-right px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">{children}</th>
}

function ActionBtn({ children, title, onClick, disabled, red }: {
  children: React.ReactNode; title: string; onClick: (e: React.MouseEvent) => void; disabled?: boolean; red?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-7 w-7 rounded-lg flex items-center justify-center transition disabled:opacity-40 ${red ? 'bg-red-50 hover:bg-red-100' : 'bg-slate-100 hover:bg-slate-200'}`}
    >
      {children}
    </button>
  )
}

function PgBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-8 min-w-8 px-1 rounded-xl text-xs font-bold transition disabled:opacity-30 ${active ? 'bg-[#1E3A5F] text-white' : 'hover:bg-slate-100 text-slate-500'}`}
    >
      {children}
    </button>
  )
}

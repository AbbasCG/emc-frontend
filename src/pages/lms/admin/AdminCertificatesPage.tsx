import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Award, TrendingUp, Clock, XCircle, Plus, Download, Eye, Search,
  Filter, X, Loader2, ChevronLeft, ChevronRight, FileDown, AlertCircle,
  CheckCircle2, RefreshCw, FileX, FileClock,
} from 'lucide-react'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { LmsDataPanel } from '@/components/lms/management'
import { fmtDate, fmtNum } from '@/components/lms/lmsFormatters'
import {
  fetchCertificateStats,
  fetchAdminCertificateList,
  exportCertificates,
  type CertificateStats,
  type Certificate,
  type CertificateType,
  type CertificateFilters,
} from '@/api/certificatesApi'
import apiClient from '@/api/axios'

export const CERT_TYPE_LABELS: Record<CertificateType, string> = {
  course_completion:   'إتمام دورة',
  workshop_attendance: 'حضور ورشة',
  summer_camp:         'معسكر صيفي',
  learning_track:      'مسار تعليمي',
  partner:             'شراكة',
  guest_speaker:       'متحدث ضيف',
  volunteer:           'تطوع',
  internship:          'تدريب',
  sponsor:             'رعاية',
  custom:              'مخصص',
}

const STATUS_LABELS: Record<string, string> = {
  draft:              'مسودة',
  pending:            'قيد المراجعة',
  approved:           'معتمدة',
  pending_generation: 'قيد الإنشاء',
  generation_failed:  'فشل الإنشاء',
  issued:             'صادرة',
  rejected:           'مرفوضة',
  revoked:            'ملغاة',
}

const STATUS_CLS: Record<string, string> = {
  draft:              'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  pending:            'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved:           'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  pending_generation: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  generation_failed:  'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  issued:             'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected:           'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  revoked:            'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
}

const APPROVAL_LABELS: Record<string, string> = {
  pending_approval:          'لم يُعتمد',
  admin_approved:            'اعتماد إداري',
  program_manager_approved:  'اعتماد البرامج',
  both_approved:             'معتمد كلياً',
  rejected:                  'مرفوض',
}

const TYPE_COLORS: Record<string, string> = {
  course_completion:   'bg-[#0077B6]/10 text-[#0077B6]',
  workshop_attendance: 'bg-violet-100 text-violet-700',
  summer_camp:         'bg-orange-100 text-orange-700',
  learning_track:      'bg-emerald-100 text-emerald-700',
  partner:             'bg-pink-100 text-pink-700',
  guest_speaker:       'bg-indigo-100 text-indigo-700',
  volunteer:           'bg-teal-100 text-teal-700',
  internship:          'bg-amber-100 text-amber-700',
  sponsor:             'bg-fuchsia-100 text-fuchsia-700',
  custom:              'bg-slate-100 text-slate-600',
}

// ── PDF status badge ──────────────────────────────────────────────────────────

function PdfBadge({ cert }: { cert: Certificate }) {
  const genStatus = cert.pdf_info?.generation_status
  const hasPdf    = cert.pdf_info?.has_pdf ?? !!cert.pdf_url

  if (cert.status === 'pending_generation' || genStatus === 'generating') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">
        <FileClock size={9} /> قيد الإنشاء
      </span>
    )
  }
  if (cert.status === 'generation_failed' || genStatus === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700 ring-1 ring-rose-200">
        <FileX size={9} /> فشل
      </span>
    )
  }
  if (hasPdf) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 size={9} /> جاهز
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
      <AlertCircle size={9} /> غير متوفر
    </span>
  )
}

// ── Authenticated download ────────────────────────────────────────────────────

async function downloadCertBlob(certId: number, filename: string) {
  const res = await apiClient.get<Blob>(`/admin/certificates/${certId}/download`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a   = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function DownloadBtn({ cert }: { cert: Certificate }) {
  const [busy, setBusy] = useState(false)
  const hasPdf = cert.pdf_info?.has_pdf ?? !!cert.pdf_url
  if (!hasPdf || cert.status === 'revoked') return null
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void downloadCertBlob(cert.id, `certificate-${cert.certificate_code ?? cert.id}.pdf`).finally(() => setBusy(false))
      }}
      className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:opacity-50"
    >
      {busy ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />} تحميل
    </button>
  )
}

// ── Filter state ──────────────────────────────────────────────────────────────

type Filters = {
  search:          string
  status:          string
  certificate_type: string
  approval_status: string
  pdf_status:      string
  issued_from:     string
  issued_to:       string
  created_from:    string
  created_to:      string
}

const EMPTY_FILTERS: Filters = {
  search: '', status: '', certificate_type: '', approval_status: '',
  pdf_status: '', issued_from: '', issued_to: '', created_from: '', created_to: '',
}

const LIST_ERROR = 'تعذّر تحميل الشهادات. تحقق من الاتصال وأعد المحاولة.'

/** Pure mapping — kept outside the component so the list effect and the imperative
 *  reload build the very same query. */
function buildListParams(filters: Filters, pg: number): CertificateFilters {
  const params: CertificateFilters = { page: pg }
  if (filters.search)           params.search           = filters.search
  if (filters.status)           params.status           = filters.status as CertificateFilters['status']
  if (filters.certificate_type) params.certificate_type = filters.certificate_type as CertificateType
  if (filters.approval_status)  params.approval_status  = filters.approval_status
  if (filters.pdf_status)       params.pdf_status       = filters.pdf_status as CertificateFilters['pdf_status']
  if (filters.issued_from)      params.issued_from      = filters.issued_from
  if (filters.issued_to)        params.issued_to        = filters.issued_to
  if (filters.created_from)     params.created_from     = filters.created_from
  if (filters.created_to)       params.created_to       = filters.created_to
  return params
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCertificatesPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [stats, setStats]           = useState<CertificateStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [certs, setCerts]           = useState<Certificate[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError]   = useState<string | null>(null)
  const [page, setPage]             = useState(1)
  const [lastPage, setLastPage]     = useState(1)
  const [total, setTotal]           = useState(0)

  const [draft, setDraft]           = useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied]       = useState<Filters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [exporting, setExporting]   = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  // Re-arm the loading states during render when the query changes (react.dev
  // "adjusting state when a prop changes"); both already start true on mount.
  const [seenLocationKey, setSeenLocationKey] = useState(location.key)
  if (seenLocationKey !== location.key) {
    setSeenLocationKey(location.key)
    setStatsLoading(true)
  }

  const [seenQuery, setSeenQuery] = useState({ applied, page })
  if (seenQuery.applied !== applied || seenQuery.page !== page) {
    setSeenQuery({ applied, page })
    setListLoading(true)
    setListError(null)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const s = await fetchCertificateStats()
        if (alive) setStats(s)
      } catch {
        /* non-critical */
      } finally {
        if (alive) setStatsLoading(false)
      }
    })()
    return () => { alive = false }
  }, [location.key])

  /** Imperative refresh/retry from a button — outside any effect, so flipping to the
   *  loading state synchronously is fine here. */
  const loadList = useCallback(async (filters: Filters, pg: number) => {
    setListLoading(true)
    setListError(null)
    try {
      const { data, meta } = await fetchAdminCertificateList(buildListParams(filters, pg))
      setCerts(data)
      setTotal(meta.total)
      setLastPage(meta.last_page)
    } catch {
      setListError(LIST_ERROR)
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { data, meta } = await fetchAdminCertificateList(buildListParams(applied, page))
        if (!alive) return
        setCerts(data)
        setTotal(meta.total)
        setLastPage(meta.last_page)
      } catch {
        if (alive) setListError(LIST_ERROR)
      } finally {
        if (alive) setListLoading(false)
      }
    })()
    return () => { alive = false }
  }, [applied, page])

  function applyFilters() { setApplied(draft); setPage(1); setFiltersOpen(false) }
  function resetFilters()  { setDraft(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setPage(1); setFiltersOpen(false) }

  async function handleExport() {
    setExporting(true)
    try {
      const params: CertificateFilters = {}
      if (applied.search)           params.search           = applied.search
      if (applied.status)           params.status           = applied.status as CertificateFilters['status']
      if (applied.certificate_type) params.certificate_type = applied.certificate_type as CertificateType
      if (applied.approval_status)  params.approval_status  = applied.approval_status
      if (applied.issued_from)      params.issued_from      = applied.issued_from
      if (applied.issued_to)        params.issued_to        = applied.issued_to
      await exportCertificates(params)
    } finally {
      setExporting(false)
    }
  }

  const hasActiveFilters   = Object.values(applied).some(Boolean)
  const hasPendingGeneration = certs.some(c => c.status === 'pending_generation' || c.status === 'approved')

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AdminLmsShell
      title="إدارة الشهادات"
      description="إصدار، اعتماد، ومتابعة شهادات المتعلمين"
      breadcrumb="الشهادات"
      kpis={[
        { label: 'إجمالي الشهادات',    value: statsLoading ? '...' : fmtNum(stats?.total ?? 0),               icon: Award,        variant: 'brand'   },
        { label: 'مُصدرة هذا الشهر',   value: statsLoading ? '...' : fmtNum(stats?.issued_this_month ?? 0),    icon: TrendingUp,   variant: 'success' },
        { label: 'قيد المراجعة',        value: statsLoading ? '...' : fmtNum(stats?.pending ?? 0),              icon: Clock,        variant: 'warning' },
        { label: 'فشل الإنشاء',         value: statsLoading ? '...' : fmtNum(stats?.pdf_failed ?? 0),           icon: XCircle,      variant: 'accent'  },
      ]}
      loading={false}
      error={null}
      onRetry={() => loadList(applied, page)}
      onRefresh={() => loadList(applied, page)}
      action={
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/certificates/issue')}
          className="flex items-center gap-2 rounded-xl bg-[#f4a320] px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-[#e0921a]"
        >
          <Plus size={14} />
          إصدار شهادة جديدة
        </button>
      }
    >
      {hasPendingGeneration && (
        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[13px] font-semibold text-violet-800 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-violet-600 shrink-0" />
          جاري إنشاء ملفات الشهادات في الخلفية. ستظهر حالة «صادرة» عند اكتمال التوليد.
        </div>
      )}

      <LmsDataPanel>
        <div className="px-5 pt-4 pb-2">

          {/* ── Header row ────────────────────────────────────────────────────── */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div dir="rtl">
              <h2 className="text-sm font-black text-[#06182C]">الشهادات</h2>
              <p className="mt-0.5 text-[11px] text-[#06182C]/40">
                {listLoading ? '...' : `${fmtNum(total)} شهادة`}
                {hasActiveFilters && <span className="mr-1 text-[#0077B6]">· فلاتر مفعّلة</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/certificates/templates')}
                className="rounded-xl border border-[#0077B6]/30 px-3 py-1.5 text-[11px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/5"
              >
                القوالب
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/certificates/batches')}
                className="rounded-xl border border-[#0077B6]/30 px-3 py-1.5 text-[11px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/5"
              >
                الإصدارات الجماعية
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => void handleExport()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-black text-[#06182C]/50 transition hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-50"
              >
                {exporting ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                تصدير CSV
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(v => !v)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-black transition ${hasActiveFilters ? 'border-[#0077B6] bg-[#0077B6]/5 text-[#0077B6]' : 'border-slate-200 text-[#06182C]/50 hover:border-[#0077B6]/30 hover:text-[#0077B6]'}`}
              >
                <Filter size={12} />
                {hasActiveFilters ? 'فلاتر مفعّلة' : 'فلترة'}
              </button>
            </div>
          </div>

          {/* ── Quick search ──────────────────────────────────────────────────── */}
          <div className="mb-3 flex gap-2" dir="rtl">
            <div className="relative flex-1">
              <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#06182C]/30" />
              <input
                ref={searchRef}
                type="text"
                value={draft.search}
                onChange={e => setDraft(d => ({ ...d, search: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                placeholder="ابحث بالاسم، الرمز، البريد، الدورة…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-[12px] text-[#06182C] placeholder:text-[#06182C]/30 focus:border-[#0077B6]/40 focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-xl bg-[#0077B6] px-4 py-2 text-[11px] font-black text-white transition hover:bg-[#1e7aaa]"
            >
              بحث
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-[#06182C]/50 transition hover:border-rose-200 hover:text-rose-600"
              >
                <X size={12} /> إعادة تعيين
              </button>
            )}
          </div>

          {/* ── Expanded filter panel ────────────────────────────────────────── */}
          {filtersOpen && (
            <div className="mb-4 rounded-xl border border-[#0077B6]/10 bg-[#0077B6]/[0.03] p-4" dir="rtl">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                <label className="grid gap-1">
                  <span className="text-[11px] font-black text-[#06182C]/50">الحالة</span>
                  <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-[#06182C] focus:border-[#0077B6]/40 focus:outline-none">
                    <option value="">الكل</option>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-[11px] font-black text-[#06182C]/50">نوع الشهادة</span>
                  <select value={draft.certificate_type} onChange={e => setDraft(d => ({ ...d, certificate_type: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-[#06182C] focus:border-[#0077B6]/40 focus:outline-none">
                    <option value="">الكل</option>
                    {Object.entries(CERT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-[11px] font-black text-[#06182C]/50">حالة الاعتماد</span>
                  <select value={draft.approval_status} onChange={e => setDraft(d => ({ ...d, approval_status: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-[#06182C] focus:border-[#0077B6]/40 focus:outline-none">
                    <option value="">الكل</option>
                    {Object.entries(APPROVAL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-[11px] font-black text-[#06182C]/50">حالة ملف PDF</span>
                  <select value={draft.pdf_status} onChange={e => setDraft(d => ({ ...d, pdf_status: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-[#06182C] focus:border-[#0077B6]/40 focus:outline-none">
                    <option value="">الكل</option>
                    <option value="ready">جاهز</option>
                    <option value="missing">غير متوفر</option>
                    <option value="generating">قيد الإنشاء</option>
                    <option value="failed">فشل الإنشاء</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-[11px] font-black text-[#06182C]/50">من تاريخ الإصدار</span>
                  <input type="date" value={draft.issued_from} onChange={e => setDraft(d => ({ ...d, issued_from: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-[#06182C] focus:border-[#0077B6]/40 focus:outline-none" />
                </label>

                <label className="grid gap-1">
                  <span className="text-[11px] font-black text-[#06182C]/50">إلى تاريخ الإصدار</span>
                  <input type="date" value={draft.issued_to} onChange={e => setDraft(d => ({ ...d, issued_to: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-[#06182C] focus:border-[#0077B6]/40 focus:outline-none" />
                </label>

                <label className="grid gap-1">
                  <span className="text-[11px] font-black text-[#06182C]/50">من تاريخ الإنشاء</span>
                  <input type="date" value={draft.created_from} onChange={e => setDraft(d => ({ ...d, created_from: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-[#06182C] focus:border-[#0077B6]/40 focus:outline-none" />
                </label>

                <label className="grid gap-1">
                  <span className="text-[11px] font-black text-[#06182C]/50">إلى تاريخ الإنشاء</span>
                  <input type="date" value={draft.created_to} onChange={e => setDraft(d => ({ ...d, created_to: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-[#06182C] focus:border-[#0077B6]/40 focus:outline-none" />
                </label>

              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={resetFilters}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-black text-[#06182C]/50 transition hover:border-rose-200 hover:text-rose-600">
                  إعادة تعيين
                </button>
                <button type="button" onClick={applyFilters}
                  className="rounded-xl bg-[#0077B6] px-5 py-2 text-[11px] font-black text-white transition hover:bg-[#1e7aaa]">
                  تطبيق الفلاتر
                </button>
              </div>
            </div>
          )}

          {/* ── Table ─────────────────────────────────────────────────────────── */}
          {listError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center" dir="rtl">
              <p className="text-sm font-bold text-rose-600">{listError}</p>
              <button type="button" onClick={() => loadList(applied, page)}
                className="rounded-xl bg-[#0077B6] px-4 py-2 text-[11px] font-black text-white">
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-[#06182C]/[0.05] bg-[#06182C]/[0.02]">
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-[#06182C]/40">رقم الشهادة</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-[#06182C]/40">الطالب</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-[#06182C]/40">النوع</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-[#06182C]/40">الدورة / الورشة</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-[#06182C]/40">القالب</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-[#06182C]/40">الحالة</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-[#06182C]/40">PDF</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-[#06182C]/40">التاريخ</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-[#06182C]/40">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#06182C]/[0.04]">
                  {listLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 9 }).map((__, j) => (
                            <td key={j} className="px-3 py-3.5">
                              <div className="h-3.5 animate-pulse rounded-lg bg-slate-100" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : certs.map((cert: Certificate) => {
                        const related = cert.course?.title ?? cert.workshop?.title ?? cert.track?.name ?? cert.learning_path?.name ?? '—'
                        return (
                          <tr key={cert.id} className="transition-colors hover:bg-[#06182C]/[0.015]">
                            <td className="px-3 py-3 font-mono text-[10px] text-[#06182C]/50">
                              {cert.certificate_code ?? '—'}
                            </td>
                            <td className="px-3 py-3 max-w-[140px]">
                              <p className="truncate font-bold text-[12px] text-[#06182C]">{cert.recipient_name ?? cert.user?.name ?? '—'}</p>
                              <p className="truncate text-[10px] text-[#06182C]/40">{cert.recipient_email ?? cert.user?.email ?? ''}</p>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${TYPE_COLORS[cert.certificate_type] ?? 'bg-slate-100 text-slate-600'}`}>
                                {CERT_TYPE_LABELS[cert.certificate_type as CertificateType] ?? cert.certificate_type}
                              </span>
                            </td>
                            <td className="px-3 py-3 max-w-[140px]">
                              <p className="truncate text-[11px] font-semibold text-[#06182C]/70">{related}</p>
                            </td>
                            <td className="px-3 py-3 max-w-[110px]">
                              <p className="truncate text-[11px] text-[#06182C]/50">{cert.template?.name ?? '—'}</p>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_CLS[cert.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                {STATUS_LABELS[cert.status] ?? cert.status}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <PdfBadge cert={cert} />
                            </td>
                            <td className="px-3 py-3 text-[11px] font-semibold text-[#06182C]/50 whitespace-nowrap">
                              {fmtDate(cert.issued_at ?? cert.created_at)}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/dashboard/admin/certificates/${cert.id}`)}
                                  className="flex items-center gap-1 rounded-lg bg-[#0077B6]/10 px-2 py-1 text-[10px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/20"
                                >
                                  <Eye size={10} /> عرض
                                </button>
                                <DownloadBtn cert={cert} />
                                {(cert.status === 'generation_failed') && (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/dashboard/admin/certificates/${cert.id}`)}
                                    className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                                  >
                                    <RefreshCw size={10} /> إعادة
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                  }
                  {!listLoading && certs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center" dir="rtl">
                        <div className="flex flex-col items-center gap-2">
                          <Award size={28} className="text-[#06182C]/15" />
                          <p className="text-sm font-bold text-[#06182C]/30">لا توجد شهادات تطابق هذه الفلاتر</p>
                          {hasActiveFilters && (
                            <button type="button" onClick={resetFilters}
                              className="mt-1 text-[11px] font-black text-[#0077B6] hover:underline">
                              إعادة تعيين الفلاتر
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ────────────────────────────────────────────────────── */}
          {!listLoading && lastPage > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-[#06182C]/[0.05] pt-4" dir="rtl">
              <p className="text-[11px] font-semibold text-[#06182C]/40">
                صفحة {page} من {lastPage} · {fmtNum(total)} شهادة
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-[#06182C]/50 transition hover:border-[#0077B6]/30 hover:text-[#0077B6] disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
                {Array.from({ length: Math.min(lastPage, 7) }, (_, i) => {
                  const pg = i + 1
                  return (
                    <button key={pg} type="button" onClick={() => setPage(pg)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-black transition ${pg === page ? 'bg-[#0077B6] text-white' : 'border border-slate-200 text-[#06182C]/50 hover:border-[#0077B6]/30 hover:text-[#0077B6]'}`}>
                      {pg}
                    </button>
                  )
                })}
                <button
                  type="button"
                  disabled={page >= lastPage}
                  onClick={() => setPage(p => p + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-[#06182C]/50 transition hover:border-[#0077B6]/30 hover:text-[#0077B6] disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>
          )}

        </div>
      </LmsDataPanel>
    </AdminLmsShell>
  )
}

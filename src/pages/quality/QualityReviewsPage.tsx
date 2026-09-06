import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, Plus, CheckCircle2, ClipboardCheck, ChevronLeft, ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { fetchQualityReviews, createQualityReview, approveQualityReview } from '@/api/qualityApi'
import toast from '@/lib/toast'

// ─── API payload types ────────────────────────────────────────────────────────
interface QualityReview {
  id: number
  status?: string
  reviewer?: { name?: string | null } | null
  reviewer_name?: string | null
  reviewable_type?: string | null
  reviewable_id?: number | null
  overall_score?: number | null
  objective_clarity_score?: number | null
  content_quality_score?: number | null
  instructor_score?: number | null
  organization_score?: number | null
  time_commitment_score?: number | null
  completion_score?: number | null
  output_quality_score?: number | null
  repeatability_score?: number | null
  notes?: string | null
  recommendations?: string | null
  created_at?: string | null
  reviewed_at?: string | null
}

interface ReviewsMeta {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

// ─── All 9 sub-scores + the required overall score ───────────────────────────
const scoreFields: { key: keyof QualityReview & keyof FormState; label: string; required: boolean }[] = [
  { key: 'overall_score',            label: 'الدرجة الكلية',       required: true  },
  { key: 'objective_clarity_score',  label: 'وضوح الأهداف',        required: false },
  { key: 'content_quality_score',    label: 'جودة المحتوى',        required: false },
  { key: 'instructor_score',         label: 'أداء المدرب',         required: false },
  { key: 'organization_score',       label: 'التنظيم',             required: false },
  { key: 'time_commitment_score',    label: 'الالتزام الزمني',     required: false },
  { key: 'completion_score',         label: 'معدل الإتمام',        required: false },
  { key: 'output_quality_score',     label: 'جودة المخرجات',       required: false },
  { key: 'repeatability_score',      label: 'قابلية التكرار',      required: false },
]

const statusColors: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-emerald-100 text-emerald-700',
  draft:     'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
}
const statusLabels: Record<string, string> = {
  pending: 'معلق', approved: 'مقبول', draft: 'مسودة', submitted: 'مرسل',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {statusLabels[status] ?? status}
    </span>
  )
}

function ScoreRing({ score }: { score: number | null | undefined }) {
  const pct = score != null ? Math.min(100, Math.round(Number(score) * 10)) : 0
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#f43f5e'
  const r = 20
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg viewBox="0 0 48 48" className="w-14 h-14 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {score != null ? Number(score).toFixed(1) : '—'}
      </span>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-deepBlue/[0.07] p-4 flex gap-4 items-center animate-pulse">
      <div className="w-14 h-14 rounded-full bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-3 bg-slate-100 rounded w-1/3" />
      </div>
      <div className="h-6 w-16 bg-slate-200 rounded-full" />
    </div>
  )
}

// ─── Initial form state ───────────────────────────────────────────────────────
type FormState = {
  reviewable_type: string
  reviewable_id: string
  status: 'draft' | 'submitted'
  overall_score: string
  objective_clarity_score: string
  content_quality_score: string
  instructor_score: string
  organization_score: string
  time_commitment_score: string
  completion_score: string
  output_quality_score: string
  repeatability_score: string
  notes: string
  recommendations: string
}

const EMPTY_FORM: FormState = {
  reviewable_type: '',
  reviewable_id: '',
  status: 'draft',
  overall_score: '',
  objective_clarity_score: '',
  content_quality_score: '',
  instructor_score: '',
  organization_score: '',
  time_commitment_score: '',
  completion_score: '',
  output_quality_score: '',
  repeatability_score: '',
  notes: '',
  recommendations: '',
}

// ─── Field-level validation errors helper ────────────────────────────────────
type FieldErrors = Record<string, string>

function FieldError({ errors, field }: { errors: FieldErrors; field: string }) {
  const msg = errors[field]
  if (!msg) return null
  return (
    <div className="flex items-center gap-1 mt-1 text-rose-600">
      <AlertCircle className="w-3 h-3 shrink-0" />
      <span className="text-xs">{msg}</span>
    </div>
  )
}

// ─── Arabic field name map (for 422 messages) ─────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  reviewable_type:         'نوع الكيان',
  reviewable_id:           'رقم الكيان',
  overall_score:           'الدرجة الكلية',
  objective_clarity_score: 'وضوح الأهداف',
  content_quality_score:   'جودة المحتوى',
  instructor_score:        'أداء المدرب',
  organization_score:      'التنظيم',
  time_commitment_score:   'الالتزام الزمني',
  completion_score:        'معدل الإتمام',
  output_quality_score:    'جودة المخرجات',
  repeatability_score:     'قابلية التكرار',
  status:                  'الحالة',
  notes:                   'الملاحظات',
}

function mapFieldErrors(errors: Record<string, string[]>): FieldErrors {
  const out: FieldErrors = {}
  for (const [field, msgs] of Object.entries(errors)) {
    const label = FIELD_LABELS[field] ?? field
    out[field] = msgs[0]?.replace(field, label) ?? `${label} غير صالح`
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────

interface ReviewsQuery {
  page: number
  search: string
  status: string
}

/** Pure I/O — kept outside the component so the mount effect and the imperative
 *  refresh share it without either having to call a state-mutating callback. */
function fetchReviewsPage(query: ReviewsQuery) {
  const params: Record<string, string> = { page: String(query.page) }
  if (query.search) params.search = query.search
  if (query.status) params.status = query.status
  return fetchQualityReviews(params)
}

export default function QualityReviewsPage() {
  const [reviews, setReviews] = useState<QualityReview[]>([])
  const [meta, setMeta]       = useState<ReviewsMeta>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')
  const [page, setPage]       = useState(1)
  const [selected, setSelected]     = useState<QualityReview | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState<FormState>({ ...EMPTY_FORM })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [approving, setApproving]   = useState(false)

  // Re-arm the loading state during render when the query changes (react.dev
  // "adjusting state when a prop changes") instead of from the effect below.
  const [seenQuery, setSeenQuery] = useState({ page, search, status })
  if (seenQuery.page !== page || seenQuery.search !== search || seenQuery.status !== status) {
    setSeenQuery({ page, search, status })
    setLoading(true)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await fetchReviewsPage({ page, search, status })
        if (!alive) return
        setReviews(res.data ?? [])
        setMeta(res.meta ?? {})
      } catch {
        if (alive) toast.error('تعذّر تحميل المراجعات')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [page, search, status])

  /** Imperative refresh from an event handler — outside any effect, so the
   *  synchronous loading flip is allowed. */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchReviewsPage({ page, search, status })
      setReviews(res.data ?? [])
      setMeta(res.meta ?? {})
    } catch {
      toast.error('تعذّر تحميل المراجعات')
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelected(null); setShowCreate(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const setField = (key: keyof FormState, val: string) => {
    setForm(f => ({ ...f, [key]: val }))
    setFieldErrors(e => { const next = { ...e }; delete next[key]; return next })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setSubmitting(true)
    try {
      // Build payload — overall_score is required; sub-scores are optional
      const body: Record<string, unknown> = {
        reviewable_type: form.reviewable_type,
        reviewable_id:   Number(form.reviewable_id),
        overall_score:   Number(form.overall_score),
        status:          form.status,
      }
      // Include optional sub-scores only when provided
      scoreFields.slice(1).forEach(sf => {
        const raw = form[sf.key as keyof FormState]
        if (raw !== '') body[sf.key] = Number(raw)
      })
      if (form.notes)           body.notes           = form.notes
      if (form.recommendations) body.recommendations = form.recommendations

      await createQualityReview(body)
      toast.success('تمّ إنشاء المراجعة بنجاح')
      setShowCreate(false)
      setForm({ ...EMPTY_FORM })
      load()
    } catch (err) {
      // Parse Laravel 422 validation errors
      const response = axios.isAxiosError(err) ? err.response : undefined
      const data = response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
      if (response?.status === 422 && data?.errors) {
        setFieldErrors(mapFieldErrors(data.errors))
        toast.error('يرجى تصحيح الحقول المطلوبة')
      } else {
        toast.error(data?.message ?? 'فشل إنشاء المراجعة')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (id: number) => {
    setApproving(true)
    try {
      await approveQualityReview(id)
      toast.success('تمّ اعتماد المراجعة')
      setSelected(prev => prev ? { ...prev, status: 'approved' } : prev)
      load()
    } catch {
      toast.error('فشل الاعتماد')
    } finally {
      setApproving(false)
    }
  }

  // Score field input component
  function ScoreInput({ sf }: { sf: (typeof scoreFields)[number] }) {
    const val = form[sf.key as keyof FormState]
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">
          {sf.label} <span className="text-slate-400">(0–10)</span>
          {sf.required && <span className="text-rose-500 mr-0.5">*</span>}
        </label>
        <input
          type="number" min="0" max="10" step="0.1"
          required={sf.required}
          value={val}
          onChange={e => setField(sf.key as keyof FormState, e.target.value)}
          className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
            fieldErrors[sf.key] ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
          }`}
        />
        <FieldError errors={fieldErrors} field={sf.key} />
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'إجمالي المراجعات', value: meta.total ?? 0,   color: 'border-blue-500'    },
          { label: 'الصفحة الحالية',    value: meta.current_page ?? 1, color: 'border-slate-400' },
          { label: 'آخر صفحة',          value: meta.last_page ?? 1,    color: 'border-slate-400' },
          { label: 'لكل صفحة',          value: meta.per_page ?? 20,    color: 'border-violet-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm border-t-[3px] ${kpi.color} p-4`}>
            <p className="text-2xl font-black text-deepBlue">{Number(kpi.value).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث..."
            className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="submitted">مرسل</option>
          <option value="pending">معلق</option>
          <option value="approved">مقبول</option>
        </select>
        <button
          onClick={() => { setForm({ ...EMPTY_FORM }); setFieldErrors({}); setShowCreate(true) }}
          className="flex items-center gap-2 bg-customBlue hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> إنشاء مراجعة
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)}</div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <ClipboardCheck className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base">لا توجد مراجعات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(r)}
              className="bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <ScoreRing score={r.overall_score} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-deepBlue text-sm">{r.reviewer?.name ?? r.reviewer_name ?? '—'}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {r.reviewable_type ?? ''}{r.reviewable_id ? ` #${r.reviewable_id}` : ''}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <StatusBadge status={r.status ?? 'draft'} />
                <p className="text-xs text-slate-400">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(meta.last_page ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-600">{page} / {meta.last_page}</span>
          <button onClick={() => setPage(p => Math.min(meta.last_page ?? 1, p + 1))} disabled={page === meta.last_page}
            className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Detail Drawer rendered via portal to escape layout stacking context ── */}
      <AnimatePresence>
        {selected && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-modal-overlay bg-black/30"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-modal-content w-full max-w-lg bg-white shadow-2xl overflow-y-auto"
              dir="rtl"
            >
              <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <h2 className="font-black text-deepBlue text-base">تفاصيل المراجعة</h2>
                <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4">
                  <ScoreRing score={selected.overall_score} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-deepBlue">{selected.reviewer?.name ?? selected.reviewer_name ?? '—'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selected.reviewable_type ?? ''}{selected.reviewable_id ? ` #${selected.reviewable_id}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={selected.status ?? 'draft'} />
                </div>

                {/* Score Bars */}
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">محاور التقييم</h3>
                  <div className="space-y-3">
                    {scoreFields.map(sf => {
                      const val = selected[sf.key]
                      const pct = val != null ? Math.min(100, Math.round(Number(val) * 10)) : 0
                      const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : pct > 0 ? 'bg-rose-500' : 'bg-slate-200'
                      return (
                        <div key={sf.key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600">{sf.label}{sf.required && <span className="text-rose-400 mr-0.5">*</span>}</span>
                            <span className="font-semibold text-deepBlue">{val != null ? Number(val).toFixed(1) : '—'}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {selected.notes && (
                  <section>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ملاحظات</h3>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">{selected.notes}</p>
                  </section>
                )}

                {selected.recommendations && (
                  <section>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">التوصيات</h3>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">{selected.recommendations}</p>
                  </section>
                )}

                <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-100">
                  <p>أُنشئت: {selected.created_at ? new Date(selected.created_at).toLocaleString('en-US') : '—'}</p>
                  {selected.reviewed_at && <p>رُوجعت: {new Date(selected.reviewed_at).toLocaleString('en-US')}</p>}
                </div>

                {selected.status === 'submitted' && (
                  <button
                    onClick={() => handleApprove(selected.id)}
                    disabled={approving}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {approving ? 'جاري الاعتماد...' : 'اعتماد المراجعة'}
                  </button>
                )}
              </div>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>

      {/* ── Create Modal rendered via portal ── */}
      <AnimatePresence>
        {showCreate && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-modal-overlay bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="fixed inset-0 z-modal-content flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" dir="rtl"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                  <div>
                    <h2 className="font-black text-deepBlue text-lg">مراجعة جودة جديدة</h2>
                    <p className="text-xs text-slate-400 mt-0.5">قيّم البرنامج أو الورشة على جميع المحاور</p>
                  </div>
                  <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Body */}
                <form id="review-form" onSubmit={handleCreate} className="flex-1 overflow-y-auto">
                  <div className="p-6 space-y-6">

                    {/* Entity section */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">معلومات الكيان</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                            نوع الكيان <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            value={form.reviewable_type}
                            onChange={e => setField('reviewable_type', e.target.value)}
                            className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                              fieldErrors.reviewable_type ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                            }`}
                          >
                            <option value="">اختر النوع</option>
                            <option value="App\\Models\\Course">دورة (Course)</option>
                            <option value="App\\Models\\WorkshopRequest">ورشة (Workshop)</option>
                            <option value="App\\Models\\Program">برنامج (Program)</option>
                          </select>
                          <FieldError errors={fieldErrors} field="reviewable_type" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                            رقم الكيان <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required type="number" min="1"
                            value={form.reviewable_id}
                            onChange={e => setField('reviewable_id', e.target.value)}
                            placeholder="مثال: 1"
                            className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                              fieldErrors.reviewable_id ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                            }`}
                          />
                          <FieldError errors={fieldErrors} field="reviewable_id" />
                        </div>
                      </div>
                    </div>

                    {/* Overall score required */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">الدرجة الكلية</h3>
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          الدرجة الكلية للمراجعة <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            required type="number" min="0" max="10" step="0.1"
                            value={form.overall_score}
                            onChange={e => setField('overall_score', e.target.value)}
                            placeholder="0.0"
                            className={`w-28 border rounded-xl px-3 py-2.5 text-base font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                              fieldErrors.overall_score ? 'border-rose-400 bg-rose-50' : 'border-blue-200 bg-white'
                            }`}
                          />
                          <span className="text-sm text-slate-500">من 10 (اجمالي التقييم)</span>
                        </div>
                        <FieldError errors={fieldErrors} field="overall_score" />
                      </div>
                    </div>

                    {/* Sub-scores */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">محاور التقييم التفصيلية</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {scoreFields.slice(1).map(sf => (
                          <ScoreInput key={sf.key} sf={sf} />
                        ))}
                      </div>
                    </div>

                    {/* Notes & Recommendations */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5">ملاحظات</label>
                        <textarea rows={3} value={form.notes}
                          onChange={e => setField('notes', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                          placeholder="أدخل ملاحظاتك..." />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5">التوصيات</label>
                        <textarea rows={3} value={form.recommendations}
                          onChange={e => setField('recommendations', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                          placeholder="أدخل توصياتك..." />
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1.5">حالة المراجعة</label>
                      <div className="flex gap-3">
                        {(['draft', 'submitted'] as const).map(s => (
                          <label key={s} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="status" value={s} checked={form.status === s}
                              onChange={() => setField('status', s)}
                              className="accent-customBlue" />
                            <span className="text-sm text-slate-600">
                              {s === 'draft' ? 'مسودة' : 'إرسال للمراجعة'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                  </div>
                </form>

                {/* Sticky footer */}
                <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-slate-100 bg-white">
                  <button
                    type="submit" form="review-form" disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-customBlue hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        جاري الإنشاء...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {form.status === 'submitted' ? 'إنشاء وإرسال للمراجعة' : 'حفظ كمسودة'}
                      </>
                    )}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="px-5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors font-semibold">
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>
    </div>
  )
}

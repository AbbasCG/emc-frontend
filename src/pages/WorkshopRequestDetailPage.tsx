import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Award,
  Banknote,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Tag,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router'
import {
  approveWorkshopRequest,
  fetchWorkshopWorkflowHistory,
  fetchAdminWorkshopRequestDetail,
  rejectWorkshopRequest,
  type WorkflowHistoryResponse,
  type WorkshopRequestDetail,
} from '../api/workshopRequestsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { useAuth } from '../contexts/AuthContext'
import type { User as UserType } from '../types'
import { cn } from '@/lib/utils'

const ROLE_TO_DEPT: Record<string, string> = {
  quality_manager:    'quality_governance',
  finance_manager:    'finance',
  marketing_manager:  'media_marketing',
  executive_admin:    'executive_admin',
  programs_manager:   'programs_tracks',
  operations_manager: 'operations',
}

function getEffectiveDept(user: UserType | null): string | null {
  if (!user) return null
  const role = user.role ?? ''
  if (ROLE_TO_DEPT[role]) return ROLE_TO_DEPT[role]
  return user.department ?? null
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—'
  const datePart = raw.slice(0, 10)
  try {
    const d = new Date(datePart + 'T12:00:00')
    return new Intl.DateTimeFormat('ar', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      numberingSystem: 'latn',
    }).format(d)
  } catch {
    return datePart
  }
}

function formatTimeRange(raw: string | null | undefined): string {
  if (!raw) return ''
  // Format: "HH:MM - HH:MM" already in 24h English digits
  return raw.trim()
}

const STEP_STATUS_LABEL: Record<string, string> = {
  approved: 'تمت الموافقة',
  rejected:  'مرفوض',
  returned:  'مُعاد',
  pending:   'قيد الانتظار',
}

const WORKFLOW_STATUS_COLORS: Record<string, string> = {
  pending:        'bg-amber-50 text-amber-700 ring-amber-200',
  in_review:      'bg-blue-50 text-blue-700 ring-blue-200',
  final_approval: 'bg-purple-50 text-purple-700 ring-purple-200',
  final_approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected:       'bg-red-50 text-red-700 ring-red-200',
}

const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  pending:        'قيد الانتظار',
  in_review:      'قيد المراجعة',
  final_approval: 'موافقة نهائية',
  final_approved: 'تمت الموافقة',
  rejected:       'مرفوض',
}

type ProposedDates = {
  date1: string | null; time1: string | null
  date2: string | null; time2: string | null
  date3: string | null; time3: string | null
}

const sectionCard = 'rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-18px_rgba(12,42,75,0.14)] backdrop-blur-md ring-1 ring-slate-200/45'

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  if (!value || value === '—') return null
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#0077B6]/10 text-[#0077B6]">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-[#0C2A4B]">{value}</p>
      </div>
    </div>
  )
}

// ── Announcement card ─────────────────────────────────────────────────────────

function AnnouncementCard({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const THRESHOLD = 400
  const isLong = text.length > THRESHOLD
  const displayText = !expanded && isLong ? text.slice(0, THRESHOLD) + '…' : text

  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  return (
    <div className={sectionCard}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black text-[#0C2A4B]">نص الإعلان المقترح</h2>
        <button
          type="button"
          onClick={copy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-black transition',
            copied
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-[#0C2A4B] hover:border-[#0077B6]/30 hover:text-[#0077B6]',
          )}
        >
          {copied
            ? <><Check className="h-3.5 w-3.5" aria-hidden /> تم النسخ</>
            : <><Copy className="h-3.5 w-3.5" aria-hidden /> نسخ النص</>
          }
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f8fafc] to-white p-5 ring-1 ring-slate-200/70 shadow-inner">
        <div className="pointer-events-none absolute end-0 top-0 h-20 w-20 bg-[radial-gradient(ellipse_at_100%_0%,rgba(0,119,182,0.08),transparent_70%)]" aria-hidden />
        <p className="relative whitespace-pre-wrap text-[14px] font-[500] leading-[1.9] text-[#0C2A4B]/88 tracking-[0.01em]">
          {displayText}
        </p>
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-black text-[#0077B6] transition hover:opacity-80"
        >
          {expanded
            ? <><ChevronUp className="h-3.5 w-3.5" aria-hidden /> عرض مختصر</>
            : <><ChevronDown className="h-3.5 w-3.5" aria-hidden /> عرض كامل</>
          }
        </button>
      )}
    </div>
  )
}

// ── Action modal ──────────────────────────────────────────────────────────────

function ActionModal({
  open,
  type,
  programName,
  onCancel,
  onConfirm,
  proposedDates,
}: {
  open: boolean
  type: 'approve' | 'reject'
  programName: string
  onCancel: () => void
  onConfirm: (notes: string, selectedDateOption?: number | null) => Promise<void>
  proposedDates?: ProposedDates
}) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDateOption, setSelectedDateOption] = useState<number | null>(null)

  const isApprove = type === 'approve'
  const showDatePicker = isApprove && proposedDates != null

  async function handleSubmit() {
    if (!isApprove && !notes.trim()) {
      setError('يرجى كتابة سبب الرفض.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onConfirm(notes, showDatePicker ? selectedDateOption : undefined)
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : null) ?? 'حدث خطأ. يرجى المحاولة مرة أخرى.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/55 px-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_28px_80px_-16px_rgba(12,42,75,0.35)] ring-1 ring-slate-200/60"
          >
            <div className={cn('px-6 py-4', isApprove ? 'bg-emerald-50' : 'bg-red-50')}>
              <div className="flex items-center gap-3">
                {isApprove
                  ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                  : <XCircle className="h-6 w-6 shrink-0 text-red-600" />
                }
                <h2 className="text-[16px] font-black text-[#0C2A4B]">
                  {isApprove ? 'الموافقة على الطلب' : 'رفض الطلب'}
                </h2>
              </div>
              <p className="mt-1 pr-9 text-[12px] font-semibold text-slate-600">{programName}</p>
            </div>

            <div className="px-6 py-5 text-right" dir="rtl">
              {showDatePicker && (
                <div className="mb-4">
                  <p className="text-[13px] font-black text-[#0C2A4B]">تحديد الموعد المعتمد</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">اختر الموعد المناسب لتنفيذ البرنامج (اختياري)</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {([1, 2, 3] as const).map((n) => {
                      const d = proposedDates![`date${n}` as keyof ProposedDates]
                      const t = proposedDates![`time${n}` as keyof ProposedDates]
                      return (
                        <button
                          key={n}
                          type="button"
                          disabled={!d}
                          onClick={() => setSelectedDateOption(selectedDateOption === n ? null : n)}
                          className={cn(
                            'rounded-xl border p-2.5 text-center text-[11px] transition',
                            !d && 'cursor-not-allowed opacity-40',
                            selectedDateOption === n
                              ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300'
                              : 'border-slate-200 bg-slate-50 hover:border-[#0077B6]/40',
                          )}
                        >
                          <p className="text-[10px] font-black uppercase tracking-wide text-[#0077B6]">
                            {['الأول', 'الثاني', 'الثالث'][n - 1]}
                          </p>
                          <p className="mt-1 text-[12px] font-black text-[#0C2A4B]">
                            {d ? formatDate(d) : '—'}
                          </p>
                          {t && <p className="text-[11px] font-semibold text-slate-500 tabular-nums">{formatTimeRange(t)}</p>}
                          {selectedDateOption === n && (
                            <p className="mt-1 text-[10px] font-black text-emerald-600">✓ محدد</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <label className="block text-[13px] font-black text-[#0C2A4B]">
                {isApprove ? 'ملاحظات (اختياري)' : 'سبب الرفض (مطلوب)'}
              </label>
              <textarea
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:border-[#0077B6]/60 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/20"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isApprove ? 'ملاحظات اختيارية للمرحلة التالية...' : 'اكتب سبب الرفض...'}
              />
              {error && <p className="mt-2 text-[12px] font-bold text-red-600">{error}</p>}
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 rounded-2xl border-2 border-slate-200 bg-white py-2.5 text-[13px] font-black text-slate-600 transition hover:border-slate-300 disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={loading}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] font-black text-white transition disabled:opacity-60',
                    isApprove
                      ? 'bg-gradient-to-l from-emerald-500 to-emerald-600 shadow-[0_10px_24px_rgba(16,185,129,0.35)] hover:brightness-[1.05]'
                      : 'bg-gradient-to-l from-red-500 to-red-600 shadow-[0_10px_24px_rgba(239,68,68,0.35)] hover:brightness-[1.05]',
                  )}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isApprove ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

/** Pure I/O — no state plumbing, so the mount effect and the imperative `load` below
 *  can share it without either calling a state-mutating callback. */
type RequestLoad =
  | { ok: true; detail: WorkshopRequestDetail; history: WorkflowHistoryResponse | null }
  | { ok: false; forbidden: boolean; message: string }

async function loadWorkshopRequest(numId: number): Promise<RequestLoad> {
  try {
    const detail = await fetchAdminWorkshopRequestDetail(numId)
    let history: WorkflowHistoryResponse | null = null
    try {
      history = await fetchWorkshopWorkflowHistory(numId)
    } catch {
      history = null
    }
    return { ok: true, detail, history }
  } catch (e) {
    const status = axios.isAxiosError(e) ? e.response?.status : undefined
    if (status === 403) {
      return {
        ok: false,
        forbidden: true,
        message: getApiErrorMessage(e) || 'غير مصرح لك بالوصول لهذا الطلب.',
      }
    }
    if (status === 404) {
      return { ok: false, forbidden: false, message: 'الطلب غير موجود.' }
    }
    return {
      ok: false,
      forbidden: false,
      message: getApiErrorMessage(e) || 'تعذّر تحميل بيانات الطلب.',
    }
  }
}

export default function WorkshopRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [detail, setDetail] = useState<WorkshopRequestDetail | null>(null)
  const [history, setHistory] = useState<WorkflowHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const numId = Number(id)

  /** Imperative refresh from an event handler — outside any effect, so flipping to the
   *  loading state synchronously is fine here. */
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setForbidden(false)
    const res = await loadWorkshopRequest(numId)
    if (res.ok) {
      setDetail(res.detail)
      setHistory(res.history)
    } else {
      setForbidden(res.forbidden)
      setError(res.message)
    }
    setLoading(false)
  }, [numId])

  // Re-arm the load state during render when the route id changes (react.dev
  // "adjusting state when a prop changes"); the effect below then only does I/O.
  // `Object.is` (not `!==`) because `numId` is `NaN` for a non-numeric route id, and
  // `NaN !== NaN` would re-trigger this branch on every render.
  const [seenId, setSeenId] = useState(numId)
  if (!Object.is(seenId, numId)) {
    setSeenId(numId)
    if (numId > 0) {
      setLoading(true)
      setError('')
      setForbidden(false)
    }
  }

  useEffect(() => {
    if (!(numId > 0)) return
    let alive = true
    void (async () => {
      const res = await loadWorkshopRequest(numId)
      if (!alive) return
      if (res.ok) {
        setDetail(res.detail)
        setHistory(res.history)
      } else {
        setForbidden(res.forbidden)
        setError(res.message)
      }
      setLoading(false)
    })()
    return () => { alive = false }
  }, [numId])

  async function handleApprove(notes: string, selectedDateOption?: number | null) {
    await approveWorkshopRequest(numId, notes || undefined, selectedDateOption ?? undefined)
    setModal(null)
    setActionFeedback({ type: 'success', message: 'تمت الموافقة وتم تحويل الطلب للمرحلة التالية.' })
    await load()
  }

  async function handleReject(notes: string) {
    await rejectWorkshopRequest(numId, notes || undefined)
    setModal(null)
    setActionFeedback({ type: 'success', message: 'تم رفض الطلب.' })
    await load()
  }

  const canAct = detail?.can_act ?? history?.can_act ?? false
  const isFinal = ['final_approved', 'rejected'].includes(detail?.workflow_status ?? '')
  const isHistoryViewer = !canAct && !isFinal &&
    (detail?.is_history_viewer === true || history?.is_history_viewer === true)

  const effectiveDept = getEffectiveDept(user)
  const canSelectDate = canAct && (
    (effectiveDept === 'operations' && detail?.current_step === 3) ||
    (effectiveDept === 'executive_admin' && detail?.current_step === 7) ||
    user?.role === 'super_admin'
  )
  const proposedDates: ProposedDates | undefined = canSelectDate && detail ? {
    date1: detail.proposed_date_1 ?? null, time1: detail.proposed_time_1 ?? null,
    date2: detail.proposed_date_2 ?? null, time2: detail.proposed_time_2 ?? null,
    date3: detail.proposed_date_3 ?? null, time3: detail.proposed_time_3 ?? null,
  } : undefined

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#0077B6]" />
      </div>
    )
  }

  const isDeptManager = user?.role === 'department_manager' || user?.role === 'dept_manager'
  const hasDeptLinked = Boolean(getEffectiveDept(user))

  if (error || !detail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center" dir="rtl">
        <AlertCircle className={cn('h-10 w-10', forbidden ? 'text-amber-500' : 'text-red-500')} />
        <p className="text-[15px] font-bold text-slate-600">{error || 'الطلب غير موجود'}</p>
        {forbidden && isDeptManager && !hasDeptLinked && (
          <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-right">
            <p className="text-[13px] font-black text-amber-800">لم يتم ربط حسابك بإدارة</p>
            <p className="mt-1 text-[12px] font-semibold text-amber-700">
              حسابك يحمل دور "مدير الإدارة" ولكن لم يتم تعيينك كمسؤول عن أي إدارة بعد.
            </p>
          </div>
        )}
        <div className="mt-2 flex items-center gap-3">
          {!forbidden && (
            <button type="button" onClick={() => void load()}
              className="rounded-2xl border-2 border-slate-200 bg-white px-6 py-2.5 text-[13px] font-black text-slate-600 transition hover:border-slate-300">
              إعادة المحاولة
            </button>
          )}
          <button type="button" onClick={() => navigate(-1)}
            className="rounded-2xl bg-[#0077B6] px-6 py-2.5 text-[13px] font-black text-white">
            رجوع
          </button>
        </div>
      </div>
    )
  }

  const wfBadgeColor = WORKFLOW_STATUS_COLORS[detail.workflow_status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
  const wfLabel = WORKFLOW_STATUS_LABELS[detail.workflow_status] ?? detail.workflow_status

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-[#f1f5f9] via-white to-[#0077B6]/[0.05] pb-24 pt-[5.25rem]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Action feedback */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'mb-5 rounded-2xl px-5 py-3 text-[13px] font-bold',
                actionFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-red-50 text-red-700 ring-1 ring-red-200',
              )}
            >
              {actionFeedback.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-l from-[#0C2A4B] via-[#1a2940] to-[#0F172A] px-5 py-7 text-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] sm:px-8 sm:py-8"
        >
          <div className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-[#0077B6]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 end-10 h-40 w-40 rounded-full bg-[#F28C00]/20 blur-3xl" />
          <div className="relative">
            <nav className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-white/80">
              <Link to="/dashboard/admin/workshop-requests" className="transition hover:text-white">
                طلبات البرامج
              </Link>
              <ChevronLeft className="h-4 w-4 shrink-0 rotate-180 text-[#F28C00]" />
              <span className="text-white">#{detail.id}</span>
            </nav>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-black sm:text-3xl">{detail.program_name}</h1>
                <p className="mt-2 text-[14px] font-semibold text-white/70">
                  {detail.requester_name}
                  {detail.requester_email ? ` · ${detail.requester_email}` : ''}
                </p>
              </div>
              <span className={cn('mt-1 shrink-0 rounded-2xl px-3.5 py-1.5 text-[12px] font-black ring-1', wfBadgeColor)}>
                {wfLabel}
              </span>
            </div>

            {canAct && !isFinal && (
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => { setActionFeedback(null); setModal('approve') }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-[13px] font-black text-white shadow-[0_10px_24px_rgba(16,185,129,0.38)] transition hover:bg-emerald-600"
                >
                  <Check className="h-4 w-4" />
                  الموافقة وتحويل
                </button>
                <button
                  type="button"
                  onClick={() => { setActionFeedback(null); setModal('reject') }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-500/90 px-5 py-2.5 text-[13px] font-black text-white shadow-[0_10px_24px_rgba(239,68,68,0.3)] transition hover:bg-red-600"
                >
                  <XCircle className="h-4 w-4" />
                  رفض الطلب
                </button>
              </div>
            )}
            {isHistoryViewer && (
              <div className="mt-5">
                <span className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-[13px] font-black text-white/90 ring-1 ring-white/25">
                  <Clock className="h-4 w-4 shrink-0" />
                  تمت مراجعتك لهذا الطلب — عرض للاطلاع فقط
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Body grid ───────────────────────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">

                    {/* Left column — workflow timeline */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={cn(sectionCard, 'lg:sticky lg:top-28')}
            >
              <h2 className="mb-5 text-[15px] font-black text-[#0C2A4B]">مسار الاعتماد</h2>
              <div className="relative">
                <div className="absolute end-[19px] top-0 w-[2px] bg-slate-200" style={{ height: 'calc(100% - 24px)' }} />
                <ol className="space-y-5">
                  {(history?.all_steps ?? []).map((step, idx) => {
                    const isCurrent = step.is_current
                    const isDone = step.status === 'approved'
                    const isRejected = step.status === 'rejected'
                    return (
                      <li key={idx} className="relative flex items-start gap-4">
                        <div
                          className={cn(
                            'relative z-10 mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-[12px] font-black ring-2 ring-white',
                            isDone && 'bg-emerald-500 text-white',
                            isRejected && 'bg-red-500 text-white',
                            isCurrent && !isDone && !isRejected && 'bg-[#F28C00] text-white shadow-[0_8px_20px_rgba(242,140,0,0.38)]',
                            !isDone && !isRejected && !isCurrent && 'bg-slate-100 text-slate-500',
                          )}
                        >
                          {isDone ? <Check className="h-5 w-5" />
                            : isRejected ? <XCircle className="h-5 w-5" />
                              : isCurrent ? <Clock className="h-4 w-4" />
                                : step.step_number}
                        </div>
                        <div className="flex-1 text-right">
                          <p className={cn(
                            'text-[13px] font-black',
                            isCurrent ? 'text-[#0077B6]' : isDone ? 'text-emerald-700' : isRejected ? 'text-red-600' : 'text-slate-500',
                          )}>
                            {step.department_label}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                            {STEP_STATUS_LABEL[step.status] ?? step.status}
                          </p>
                          {step.actor_name && (
                            <div className="mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-slate-500">
                              <span>{step.actor_name}</span>
                              <User className="h-3 w-3" />
                            </div>
                          )}
                          {step.acted_at && (
                            <p className="text-[10px] font-semibold text-slate-400 tabular-nums">
                              {new Intl.DateTimeFormat('ar', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: false,
                                numberingSystem: 'latn',
                              }).format(new Date(step.acted_at))}
                            </p>
                          )}
                          {step.notes && (
                            <p className="mt-1 rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
                              {step.notes}
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </motion.div>
          </div>

          {/* Right column — detail sections */}
          <div className="space-y-5 lg:col-span-7">

            {/* 1. بيانات مقدم الطلب */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className={sectionCard}
            >
              <h2 className="mb-4 text-[15px] font-black text-[#0C2A4B]">بيانات مقدم الطلب</h2>
              <div className="space-y-3">
                <InfoRow icon={User} label="الاسم الكامل" value={detail.requester_name ?? '—'} />
                <InfoRow icon={Mail} label="البريد الإلكتروني" value={detail.requester_email ?? '—'} />
                {detail.requester_phone && (
                  <InfoRow icon={Phone} label="رقم الجوال" value={detail.requester_phone} />
                )}
                {detail.requester_department && (
                  <InfoRow icon={Building2} label="القسم أو الجهة" value={detail.requester_department} />
                )}
              </div>
            </motion.div>

            {/* 2. بيانات البرنامج */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 }}
              className={sectionCard}
            >
              <h2 className="mb-4 text-[15px] font-black text-[#0C2A4B]">بيانات البرنامج</h2>

              {/* Speaker photo + info */}
              <div className={cn('mb-4 flex items-start gap-4', detail.speaker_photo_url ? '' : '')}>
                {detail.speaker_photo_url && (
                  <img
                    src={detail.speaker_photo_url}
                    alt={detail.speaker_name}
                    className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white shadow-md"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-black text-[#0C2A4B]">{detail.speaker_name}</p>
                  {detail.speaker_job_title && (
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[#0077B6]/10 px-2.5 py-0.5">
                      <Briefcase className="h-3 w-3 shrink-0 text-[#0077B6]" aria-hidden />
                      <span className="text-[12px] font-black text-[#0077B6]">{detail.speaker_job_title}</span>
                    </div>
                  )}
                </div>
              </div>

              {detail.categories && detail.categories.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-start gap-2.5">
                    <Tag className="mt-0.5 h-4 w-4 shrink-0 text-[#0077B6]" aria-hidden />
                    <div className="min-w-0 flex-1 text-right">
                      <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">الفئات</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.categories.map(cat => (
                          <span key={cat} className="rounded-xl border border-[#0077B6]/20 bg-[#0077B6]/[0.06] px-2.5 py-0.5 text-[11px] font-bold text-[#0C2A4B]">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* 3. تفاصيل التنفيذ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className={sectionCard}
            >
              <h2 className="mb-4 text-[15px] font-black text-[#0C2A4B]">تفاصيل التنفيذ</h2>
              <div className="space-y-3">
                {detail.topics && (
                  <div className="border-b border-slate-100 pb-3 last:border-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">المواضيع والمحاور</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-[13px] font-semibold leading-relaxed text-[#0C2A4B]">
                      {detail.topics}
                    </p>
                  </div>
                )}
                {detail.target_audience && (
                  <div className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
                    <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#0077B6]/10 text-[#0077B6]">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">الجمهور المستهدف</p>
                      <p className="mt-0.5 text-[13px] font-semibold text-[#0C2A4B]">{detail.target_audience}</p>
                    </div>
                  </div>
                )}
                {detail.location_types && detail.location_types.length > 0 && (
                  <div className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
                    <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#0077B6]/10 text-[#0077B6]">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">طريقة أو مكان التنفيذ</p>
                      <p className="mt-0.5 text-[13px] font-semibold text-[#0C2A4B]">{detail.location_types.join(' / ')}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 last:border-0">
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#0077B6]/10 text-[#0077B6]">
                    <Banknote className="h-3.5 w-3.5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">رسوم الحضور</p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#0C2A4B]">
                      {detail.price_type === 'free'
                        ? 'مجاني'
                        : `مدفوع — ${detail.price_amount ?? ''} ريال`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 4. المواعيد المقترحة */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={sectionCard}
            >
              <h2 className="mb-4 text-[15px] font-black text-[#0C2A4B]">المواعيد المقترحة</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {([1, 2, 3] as const).map((n) => {
                  const d = detail[`proposed_date_${n}` as keyof WorkshopRequestDetail] as string | null
                  const t = detail[`proposed_time_${n}` as keyof WorkshopRequestDetail] as string | null
                  const hasDate = Boolean(d)
                  const isSelected = detail.selected_date_option === n
                  return (
                    <div
                      key={n}
                      className={cn(
                        'rounded-2xl border p-4 text-center',
                        isSelected
                          ? 'border-emerald-400/70 bg-emerald-50/80 ring-1 ring-emerald-300/60'
                          : hasDate
                            ? 'border-[#0077B6]/20 bg-[#0077B6]/[0.04]'
                            : 'border-slate-200/80 bg-slate-50/60 opacity-45',
                      )}
                    >
                      <p className={cn(
                        'text-[10px] font-black uppercase tracking-wider',
                        isSelected ? 'text-emerald-600' : 'text-[#0077B6]',
                      )}>
                        الخيار {['الأول', 'الثاني', 'الثالث'][n - 1]}
                      </p>
                      <p className="mt-2 text-[13px] font-black text-[#0C2A4B]">
                        {formatDate(d)}
                      </p>
                      {t && (
                        <p className="mt-1 text-[12px] font-semibold tabular-nums text-slate-500">
                          {formatTimeRange(t)}
                        </p>
                      )}
                      {isSelected && (
                        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-black text-emerald-600">
                          <Award className="h-3 w-3" />
                          الموعد المعتمد
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* 5. نص الإعلان المقترح */}
            {detail.generated_announcement_text && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
              >
                <AnnouncementCard text={detail.generated_announcement_text} />
              </motion.div>
            )}
          </div>


        </div>
      </div>

      {modal && (
        <ActionModal
          open={!!modal}
          type={modal}
          programName={detail.program_name}
          onCancel={() => setModal(null)}
          onConfirm={modal === 'approve' ? handleApprove : handleReject}
          proposedDates={modal === 'approve' ? proposedDates : undefined}
        />
      )}
    </main>
  )
}

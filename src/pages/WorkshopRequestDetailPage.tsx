import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  User,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
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


function formatArabicDate(raw: string | null | undefined): string {
  if (!raw) return '—'
  const datePart = raw.slice(0, 10)
  try {
    const d = new Date(datePart + 'T12:00:00')
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return datePart
  }
}

function formatArabicTime(raw: string | null | undefined): string {
  if (!raw) return ''
  const m = raw.match(/(\d{1,2}:\d{2})/)
  if (m) {
    const [h, min] = m[1].split(':').map(Number)
    const period = h < 12 ? 'ص' : 'م'
    const h12 = h % 12 || 12
    return `${h12}:${String(min).padStart(2, '0')} ${period}`
  }
  return raw
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
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_28px_80px_-16px_rgba(34,51,74,0.35)] ring-1 ring-slate-200/60"
          >
            <div className={cn('px-6 py-4', isApprove ? 'bg-emerald-50' : 'bg-red-50')}>
              <div className="flex items-center gap-3">
                {isApprove ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-6 w-6 shrink-0 text-red-600" />
                )}
                <h2 className="text-[16px] font-black text-[#22334A]">
                  {isApprove ? 'الموافقة على الطلب' : 'رفض الطلب'}
                </h2>
              </div>
              <p className="mt-1 pr-9 text-[12px] font-semibold text-slate-600">
                {programName}
              </p>
            </div>

            <div className="px-6 py-5 text-right" dir="rtl">
              {showDatePicker && (
                <div className="mb-4">
                  <p className="text-[13px] font-black text-[#22334A]">تحديد الموعد المعتمد</p>
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
                              : 'border-slate-200 bg-slate-50 hover:border-[#2691C2]/40',
                          )}
                        >
                          <p className="text-[10px] font-black uppercase tracking-wide text-[#2691C2]">
                            {['الأول', 'الثاني', 'الثالث'][n - 1]}
                          </p>
                          <p className="mt-1 text-[12px] font-black text-[#22334A]">
                            {d ? formatArabicDate(d) : '—'}
                          </p>
                          {t && <p className="text-[11px] font-semibold text-slate-500">{formatArabicTime(t)}</p>}
                          {selectedDateOption === n && (
                            <p className="mt-1 text-[10px] font-black text-emerald-600">✓ محدد</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <label className="block text-[13px] font-black text-[#22334A]">
                {isApprove ? 'ملاحظات (اختياري)' : 'سبب الرفض (مطلوب)'}
              </label>
              <textarea
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:border-[#2691C2]/60 focus:outline-none focus:ring-2 focus:ring-[#2691C2]/20"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isApprove ? 'ملاحظات اختيارية للمرحلة التالية...' : 'اكتب سبب الرفض...'}
              />
              {error && (
                <p className="mt-2 text-[12px] font-bold text-red-600">{error}</p>
              )}

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

export default function WorkshopRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [detail, setDetail] = useState<WorkshopRequestDetail | null>(null)
  const [history, setHistory] = useState<WorkflowHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  /** true when the API rejected with 403 — drives a dedicated "not authorized" state */
  const [forbidden, setForbidden] = useState(false)
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const numId = Number(id)

  async function load() {
    setLoading(true)
    setError('')
    setForbidden(false)
    try {
      /* Fetch detail first; history is best-effort so a history-only failure never blocks the page. */
      const det = await fetchAdminWorkshopRequestDetail(numId)
      setDetail(det)
      try {
        const hist = await fetchWorkshopWorkflowHistory(numId)
        setHistory(hist)
      } catch {
        setHistory(null)
      }
    } catch (e) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined
      if (status === 403) {
        setForbidden(true)
        setError(getApiErrorMessage(e) || 'غير مصرح لك بالوصول لهذا الطلب.')
      } else if (status === 404) {
        setError('الطلب غير موجود.')
      } else {
        setError(getApiErrorMessage(e) || 'تعذّر تحميل بيانات الطلب.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (numId > 0) void load()
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

  // Determine if this user can select the date option during approval
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
        <Loader2 className="h-10 w-10 animate-spin text-[#2691C2]" />
      </div>
    )
  }

  const isDeptManager = user?.role === 'department_manager' || user?.role === 'dept_manager'
  const hasDeptLinked = Boolean(getEffectiveDept(user))

  if (error || !detail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center" dir="rtl">
        <AlertCircle className={cn('h-10 w-10', forbidden ? 'text-amber-500' : 'text-red-500')} />
        <p className="text-[15px] font-bold text-slate-600">
          {error || 'الطلب غير موجود'}
        </p>
        {forbidden && isDeptManager && !hasDeptLinked && (
          <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-right">
            <p className="text-[13px] font-black text-amber-800">لم يتم ربط حسابك بإدارة</p>
            <p className="mt-1 text-[12px] font-semibold text-amber-700">
              حسابك يحمل دور "مدير الإدارة" ولكن لم يتم تعيينك كمسؤول عن أي إدارة بعد. تواصل مع المسؤول ليقوم بتحديد إدارتك.
            </p>
          </div>
        )}
        {forbidden && (!isDeptManager || hasDeptLinked) && (
          <p className="max-w-md text-[12px] font-semibold text-slate-400">
            إذا وصلتك مهمة مراجعة لهذا الطلب ولم تتمكن من فتحه، فقد لا تكون مرحلتك هي المرحلة الحالية، أو لم يتم ربط حسابك بالإدارة الصحيحة.
          </p>
        )}
        <div className="mt-2 flex items-center gap-3">
          {!forbidden && (
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-2xl border-2 border-slate-200 bg-white px-6 py-2.5 text-[13px] font-black text-slate-600 transition hover:border-slate-300"
            >
              إعادة المحاولة
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-2xl bg-[#2691C2] px-6 py-2.5 text-[13px] font-black text-white"
          >
            رجوع
          </button>
        </div>
      </div>
    )
  }

  const wfBadgeColor = WORKFLOW_STATUS_COLORS[detail.workflow_status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
  const wfLabel = WORKFLOW_STATUS_LABELS[detail.workflow_status] ?? detail.workflow_status

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-[#f1f5f9] via-white to-[#2691C2]/[0.05] pb-24 pt-[5.25rem]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
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

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-l from-[#22334A] via-[#1a2940] to-[#0F172A] px-5 py-7 text-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] sm:px-8 sm:py-8"
        >
          <div className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-[#2691C2]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 end-10 h-40 w-40 rounded-full bg-[#EC943C]/20 blur-3xl" />
          <div className="relative">
            <nav className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-white/80">
              <Link to="/dashboard/admin/workshop-requests" className="transition hover:text-white">
                طلبات البرامج
              </Link>
              <ChevronLeft className="h-4 w-4 shrink-0 rotate-180 text-[#EC943C]" />
              <span className="text-white">#{detail.id}</span>
            </nav>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black sm:text-3xl">{detail.program_name}</h1>
                <p className="mt-2 text-[14px] font-semibold text-white/75">
                  {detail.requester_name} · {detail.requester_email}
                </p>
              </div>
              <span className={cn('rounded-2xl px-3.5 py-1.5 text-[12px] font-black ring-1', wfBadgeColor)}>
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

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: workflow timeline */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-18px_rgba(34,51,74,0.14)] backdrop-blur-md ring-1 ring-slate-200/45"
            >
              <h2 className="mb-5 text-[15px] font-black text-[#22334A]">مسار الاعتماد</h2>
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
                            isCurrent && !isDone && !isRejected && 'bg-[#EC943C] text-white shadow-[0_8px_20px_rgba(236,148,60,0.38)]',
                            !isDone && !isRejected && !isCurrent && 'bg-slate-100 text-slate-500',
                          )}
                        >
                          {isDone ? <Check className="h-5 w-5" /> :
                           isRejected ? <XCircle className="h-5 w-5" /> :
                           isCurrent ? <Clock className="h-4 w-4" /> :
                           step.step_number}
                        </div>
                        <div className="flex-1 text-right">
                          <p className={cn(
                            'text-[13px] font-black',
                            isCurrent ? 'text-[#2691C2]' : isDone ? 'text-emerald-700' : isRejected ? 'text-red-600' : 'text-slate-500',
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
                            <p className="text-[10px] font-semibold text-slate-400">
                              {new Date(step.acted_at).toLocaleString('ar-SA')}
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

          {/* Right: request details */}
          <div className="space-y-5 lg:col-span-7">
            {/* Program info */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-18px_rgba(34,51,74,0.14)] backdrop-blur-md ring-1 ring-slate-200/45"
            >
              <h2 className="mb-4 text-[15px] font-black text-[#22334A]">تفاصيل البرنامج</h2>
              <dl className="space-y-3 text-right">
                {[
                  { label: 'المتحدث',       value: `${detail.speaker_name} — ${detail.speaker_job_title}` },
                  { label: 'الفئات',        value: detail.categories?.join('، ') ?? '—' },
                  { label: 'الجمهور',       value: detail.target_audience },
                  { label: 'المحاور',       value: detail.topics },
                  { label: 'التنفيذ',       value: detail.location_types?.join(' / ') ?? '—' },
                  { label: 'السعر',         value: detail.price_type === 'free' ? 'مجاني' : `مدفوع — ${detail.price_amount} ريال` },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2 last:border-0">
                    <dt className="col-span-1 text-[11px] font-black text-slate-500">{row.label}</dt>
                    <dd className="col-span-2 text-[13px] font-semibold text-slate-700">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>

            {/* Proposed dates */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.11 }}
              className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-18px_rgba(34,51,74,0.14)] backdrop-blur-md ring-1 ring-slate-200/45"
            >
              <h2 className="mb-4 text-[15px] font-black text-[#22334A]">المواعيد المقترحة</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {([1, 2, 3] as const).map((n) => {
                  const d = detail[`proposed_date_${n}` as keyof WorkshopRequestDetail] as string | null
                  const t = detail[`proposed_time_${n}` as keyof WorkshopRequestDetail] as string | null
                  const hasDate = !!d
                  const isSelected = detail.selected_date_option === n
                  return (
                    <div
                      key={n}
                      className={cn(
                        'rounded-2xl border p-3 text-center',
                        isSelected
                          ? 'border-emerald-400/70 bg-emerald-50/80 ring-1 ring-emerald-300/60'
                          : hasDate
                          ? 'border-[#2691C2]/20 bg-[#2691C2]/[0.04]'
                          : 'border-slate-200/80 bg-slate-50/60 opacity-50',
                      )}
                    >
                      <p className={cn(
                        'text-[10px] font-black uppercase tracking-wider',
                        isSelected ? 'text-emerald-600' : 'text-[#2691C2]',
                      )}>
                        الخيار {['الأول', 'الثاني', 'الثالث'][n - 1]}
                      </p>
                      <p className="mt-1.5 text-[13px] font-black text-[#22334A]">
                        {formatArabicDate(d)}
                      </p>
                      <p className="text-[12px] font-semibold text-slate-500">
                        {formatArabicTime(t)}
                      </p>
                      {isSelected && (
                        <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-black text-emerald-600">
                          <Award className="h-3 w-3" />
                          الموعد المعتمد
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Announcement text */}
            {detail.generated_announcement_text && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-18px_rgba(34,51,74,0.14)] backdrop-blur-md ring-1 ring-slate-200/45"
              >
                <h2 className="mb-3 text-[15px] font-black text-[#22334A]">نص الإعلان المقترح</h2>
                <pre className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-[12px] font-semibold leading-relaxed text-slate-700 ring-1 ring-slate-200/80">
                  {detail.generated_announcement_text}
                </pre>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Action modals */}
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

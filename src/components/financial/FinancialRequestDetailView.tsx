import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, CheckCircle2, XCircle, RotateCcw, Upload, Download,
  Clock, FileText, User, Building2, DollarSign, Calendar, ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { FinancialRequest, FinancialRequestStatus } from '@/api/financialRequestsApi'
import {
  STATUS_LABELS, STATUS_COLORS, TYPE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS,
  financeApprove, financeReject, returnFinancialRequest,
  executiveApprove, executiveReject, uploadAttachment,
} from '@/api/financialRequestsApi'
import FinanceDate from '@/components/finance/FinanceDate'

interface Props {
  request: FinancialRequest
  onClose: () => void
  onUpdate: (updated: FinancialRequest) => void
  viewerRole: 'department_leader' | 'finance_manager' | 'executive_admin' | 'super_admin'
}

const TABS = [
  { key: 'overview',   label: 'نظرة عامة' },
  { key: 'attachments', label: 'المرفقات' },
  { key: 'workflow',   label: 'مسار العمل' },
  { key: 'finance',    label: 'مراجعة مالية' },
  { key: 'executive',  label: 'اعتماد تنفيذي' },
] as const
type TabKey = typeof TABS[number]['key']

const ACTION_LABELS: Record<string, string> = {
  SUBMIT:            'إرسال إلى المالية',
  FINANCE_APPROVE:   'موافقة مالية',
  FINANCE_REJECT:    'رفض مالي',
  ESCALATE:          'تحويل للاعتماد التنفيذي',
  RETURN:            'إرجاع للمراجعة',
  EXECUTIVE_APPROVE: 'اعتماد تنفيذي',
  EXECUTIVE_REJECT:  'رفض تنفيذي',
  UPLOAD:            'رفع مرفق',
  DOWNLOAD_ATTACHMENT: 'تحميل مرفق',
}

const ACTION_COLORS: Record<string, string> = {
  SUBMIT:            'bg-blue-500',
  FINANCE_APPROVE:   'bg-teal-500',
  FINANCE_REJECT:    'bg-red-500',
  ESCALATE:          'bg-purple-500',
  RETURN:            'bg-orange-500',
  EXECUTIVE_APPROVE: 'bg-green-500',
  EXECUTIVE_REJECT:  'bg-red-600',
  UPLOAD:            'bg-slate-400',
  DOWNLOAD_ATTACHMENT: 'bg-slate-300',
}

// Always output English digits
function numFmt(n: number, opts?: Intl.NumberFormatOptions) {
  return n.toLocaleString('en-US', opts)
}


export default function FinancialRequestDetailView({ request: initialReq, onClose, onUpdate, viewerRole }: Props) {
  const [req, setReq] = useState(initialReq)
  const [tab, setTab] = useState<TabKey>('overview')
  const [actionNote, setActionNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Defensive: always arrays
  const attachments = req.attachments ?? []
  const workflowSteps = req.workflow_steps ?? []

  function update(updated: FinancialRequest) {
    const safe: FinancialRequest = {
      ...updated,
      attachments:    updated.attachments    ?? [],
      workflow_steps: updated.workflow_steps ?? [],
    }
    setReq(safe)
    onUpdate(safe)
  }

  async function act(fn: () => Promise<FinancialRequest>, successMsg: string) {
    if (loading) return
    setLoading(true)
    try {
      const updated = await fn()
      update(updated)
      setActionNote('')
      toast.success(successMsg)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } } | null
      toast.error(err?.response?.data?.message ?? 'فشل الإجراء')
    } finally { setLoading(false) }
  }

  const canFinanceAct = (viewerRole === 'finance_manager' || viewerRole === 'super_admin') && req.status === 'finance_review'
  const canExecAct    = (viewerRole === 'executive_admin' || viewerRole === 'super_admin') && req.status === 'executive_review'

  const modal = (
    <div className="fixed inset-0 z-modal-overlay overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm" onClick={onClose} />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="absolute inset-y-0 left-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-bl from-deepBlue/5 to-white px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ${STATUS_COLORS[req.status as FinancialRequestStatus]}`}>
                  {STATUS_LABELS[req.status as FinancialRequestStatus]}
                </span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${PRIORITY_COLORS[req.priority as keyof typeof PRIORITY_COLORS]}`}>
                  {PRIORITY_LABELS[req.priority as keyof typeof PRIORITY_LABELS]}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 tabular-nums" dir="ltr">
                  #{req.id}
                </span>
              </div>

              <h2 className="mt-2.5 text-xl font-black leading-snug text-deepBlue line-clamp-2">{req.title}</h2>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-deepBlue/50">
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} /> {req.department?.name ?? '—'}
                </span>
                <span className="flex items-center gap-1.5">
                  <User size={13} /> {req.requester?.name ?? '—'}
                </span>
                {req.needed_by_date && (
                  <span className="flex items-center gap-1.5 tabular-nums" dir="ltr">
                    <Calendar size={13} /> <FinanceDate value={req.needed_by_date} />
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-deepBlue/40 hover:bg-slate-100 hover:text-deepBlue transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Amount strip */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-deepBlue/10 bg-deepBlue/5 px-5 py-3">
            <DollarSign size={18} className="text-deepBlue/40" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-deepBlue/40">المبلغ المطلوب</p>
              <p className="text-2xl font-black tabular-nums text-deepBlue" dir="ltr">
                {numFmt(Number(req.amount), { minimumFractionDigits: 2 })}
                <span className="mr-2 text-sm font-bold text-deepBlue/50">{req.currency}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-0 border-b border-slate-100 bg-slate-50 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-3 text-[12px] font-bold border-b-2 transition-all ${
                tab === t.key
                  ? 'border-customOrange bg-white text-customOrange'
                  : 'border-transparent text-deepBlue/40 hover:text-deepBlue hover:bg-white/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="p-6 space-y-5"
            >
              {/* ── OVERVIEW ── */}
              {tab === 'overview' && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoCard label="نوع الطلب" value={TYPE_LABELS[req.request_type as keyof typeof TYPE_LABELS] ?? req.request_type} />
                    <InfoCard label="تاريخ الإنشاء" dateValue={req.created_at} showTime />
                    {req.submitted_at && (
                      <InfoCard label="تاريخ الإرسال" dateValue={req.submitted_at} showTime />
                    )}
                    {req.needed_by_date && (
                      <InfoCard label="مطلوب بتاريخ" dateValue={req.needed_by_date} highlight />
                    )}
                  </div>

                  {req.description && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">وصف الطلب</p>
                      <p className="text-sm leading-relaxed text-deepBlue/80 whitespace-pre-wrap">{req.description}</p>
                    </div>
                  )}

                  {req.requester && (
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-l from-blue-50 to-slate-50 p-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-deepBlue/10 text-deepBlue font-black text-lg">
                        {req.requester.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">مقدم الطلب</p>
                        <p className="font-black text-deepBlue">{req.requester.name}</p>
                        <p className="text-[11px] text-deepBlue/50" dir="ltr">{req.requester.email}</p>
                      </div>
                    </div>
                  )}

                  {req.rejection_reason && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                      <p className="text-[11px] font-black text-red-500">سبب الرفض</p>
                      <p className="mt-1 text-sm text-red-700">{req.rejection_reason}</p>
                    </div>
                  )}
                  {req.returned_reason && (
                    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                      <p className="text-[11px] font-black text-orange-500">سبب الإرجاع</p>
                      <p className="mt-1 text-sm text-orange-700">{req.returned_reason}</p>
                    </div>
                  )}
                </>
              )}

              {/* ── ATTACHMENTS ── */}
              {tab === 'attachments' && (
                <div className="space-y-3">
                  {viewerRole !== 'executive_admin' && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 px-5 py-4 hover:border-customBlue hover:bg-blue-50 transition-colors">
                      <Upload size={18} className="text-customBlue" />
                      <div>
                        <p className="text-sm font-bold text-customBlue">{uploading ? 'جاري الرفع…' : 'رفع مرفق'}</p>
                        <p className="text-[11px] text-slate-400">PDF, صور, Word, Excel — حتى 20 MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                        disabled={uploading}
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploading(true)
                          try {
                            const att = await uploadAttachment(req.id, file)
                            setReq(r => ({ ...r, attachments: [...(r.attachments ?? []), att] }))
                            toast.success('تم رفع المرفق')
                          } catch { toast.error('فشل رفع الملف') } finally {
                            setUploading(false)
                            e.target.value = ''
                          }
                        }}
                      />
                    </label>
                  )}

                  {attachments.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-deepBlue/30">
                      <FileText size={36} />
                      <p className="text-sm font-bold">لا توجد مرفقات</p>
                    </div>
                  ) : (
                    attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                          <FileText size={18} className="text-customBlue" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-bold text-deepBlue">{att.original_name}</p>
                          <p className="text-[11px] text-deepBlue/40" dir="ltr">
                            {att.uploaded_by?.name}
                            {att.file_size ? ` · ${numFmt(Math.round(att.file_size / 1024))} KB` : ''}
                            {att.created_at ? <> · <FinanceDate value={att.created_at} showTime /></> : ''}
                          </p>
                        </div>
                        <a
                          href={`/api${att.download_url}`}
                          download={att.original_name}
                          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white hover:bg-blue-50 hover:border-blue-200 transition-colors"
                        >
                          <Download size={15} className="text-customBlue" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── WORKFLOW TIMELINE ── */}
              {tab === 'workflow' && (
                <div>
                  {/* Static stages legend */}
                  <div className="mb-5 flex flex-wrap gap-2">
                    {['إنشاء الطلب', 'إرسال إلى المالية', 'مراجعة المالية', 'اعتماد الإدارة العليا', 'القرار النهائي'].map((s, i) => (
                      <span key={s} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                        <span className="tabular-nums">{i + 1}.</span> {s}
                      </span>
                    ))}
                  </div>

                  {workflowSteps.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-deepBlue/30">
                      <Clock size={36} />
                      <p className="text-sm font-bold">لا توجد خطوات بعد</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute right-[19px] top-2 bottom-2 w-px bg-slate-100" />
                      <div className="space-y-4 pr-12">
                        {workflowSteps.map((step, i) => {
                          const isLast = i === workflowSteps.length - 1
                          const dotColor = ACTION_COLORS[step.action] ?? 'bg-slate-300'
                          return (
                            <div key={step.id} className="relative">
                              <div className={`absolute -right-[39px] top-3 size-3 rounded-full border-2 border-white ${dotColor} shadow-sm`} />
                              <div className={`rounded-2xl border p-4 ${isLast ? 'border-customOrange/20 bg-orange-50/60' : 'border-slate-100 bg-white'}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-[12px] font-black text-deepBlue">
                                    {ACTION_LABELS[step.action] ?? step.action}
                                  </span>
                                  <span className="shrink-0 tabular-nums text-[10px] text-deepBlue/40" dir="ltr">
                                    <FinanceDate value={step.created_at} showTime />
                                  </span>
                                </div>
                                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                                  <span className="font-bold text-deepBlue">{step.actor?.name ?? '—'}</span>
                                  <span className="text-deepBlue/30">·</span>
                                  <span className="flex items-center gap-1 tabular-nums text-deepBlue/50" dir="ltr">
                                    {step.from_status} <ArrowRight size={10} /> {step.to_status}
                                  </span>
                                </div>
                                {step.note && (
                                  <div className="mt-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs text-deepBlue/70">
                                    {step.note}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── FINANCE REVIEW ── */}
              {tab === 'finance' && (
                <div className="space-y-4">
                  {/* Finance decision summary (always visible) */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">ملخص الطلب المالي</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoCard label="المبلغ" value={`${numFmt(Number(req.amount), { minimumFractionDigits: 2 })} ${req.currency}`} />
                      <InfoCard label="نوع الطلب" value={TYPE_LABELS[req.request_type as keyof typeof TYPE_LABELS] ?? req.request_type} />
                    </div>
                    {req.finance_reviewer && (
                      <ReviewerCard
                        label="المراجع المالي"
                        name={req.finance_reviewer.name}
                        reviewedAt={req.finance_reviewed_at}
                        note={req.finance_note}
                        color="teal"
                      />
                    )}
                    {!req.finance_reviewer && (
                      <EmptyState icon={<Clock size={28} />} message="بانتظار المراجعة المالية" />
                    )}
                  </div>

                  {canFinanceAct && (
                    <ActionPanel
                      note={actionNote}
                      onNoteChange={setActionNote}
                      loading={loading}
                      actions={[
                        {
                          label: 'موافقة وتحويل للاعتماد',
                          color: 'bg-teal-600 hover:bg-teal-700',
                          icon: <CheckCircle2 size={16} />,
                          onClick: () => act(() => financeApprove(req.id, actionNote || undefined), 'تمت الموافقة المالية'),
                        },
                        {
                          label: 'إرجاع',
                          color: 'bg-orange-500 hover:bg-orange-600',
                          icon: <RotateCcw size={16} />,
                          onClick: () => {
                            if (!actionNote.trim()) { toast.error('سبب الإرجاع مطلوب'); return }
                            void act(() => returnFinancialRequest(req.id, actionNote), 'تم إرجاع الطلب')
                          },
                        },
                        {
                          label: 'رفض',
                          color: 'bg-red-600 hover:bg-red-700',
                          icon: <XCircle size={16} />,
                          onClick: () => {
                            if (!actionNote.trim()) { toast.error('سبب الرفض مطلوب'); return }
                            void act(() => financeReject(req.id, actionNote), 'تم الرفض')
                          },
                        },
                      ]}
                    />
                  )}
                </div>
              )}

              {/* ── EXECUTIVE ── */}
              {tab === 'executive' && (
                <div className="space-y-4">
                  {/* Finance decision summary visible to executive */}
                  {req.finance_reviewer && (
                    <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
                      <p className="text-[11px] font-black text-teal-600">قرار الإدارة المالية</p>
                      <p className="mt-1 font-bold text-deepBlue">{req.finance_reviewer.name}</p>
                      {req.finance_note && <p className="mt-2 text-sm text-deepBlue/70">{req.finance_note}</p>}
                      {req.finance_reviewed_at && (
                        <div className="mt-1"><FinanceDate value={req.finance_reviewed_at} showTime /></div>
                      )}
                    </div>
                  )}

                  {/* Context: requester + department + amount */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoCard label="مقدم الطلب" value={req.requester?.name ?? '—'} />
                    <InfoCard label="القسم" value={req.department?.name ?? '—'} />
                    <InfoCard label="المبلغ" value={`${numFmt(Number(req.amount), { minimumFractionDigits: 2 })} ${req.currency}`} highlight />
                    <InfoCard label="نوع الطلب" value={TYPE_LABELS[req.request_type as keyof typeof TYPE_LABELS] ?? req.request_type} />
                  </div>

                  {req.executive_reviewer ? (
                    <ReviewerCard
                      label="المعتمد التنفيذي"
                      name={req.executive_reviewer.name}
                      reviewedAt={req.executive_reviewed_at}
                      note={req.executive_note}
                      color="purple"
                    />
                  ) : !canExecAct ? (
                    <EmptyState icon={<Clock size={28} />} message="بانتظار الاعتماد التنفيذي" />
                  ) : null}

                  {canExecAct && (
                    <ActionPanel
                      note={actionNote}
                      onNoteChange={setActionNote}
                      loading={loading}
                      actions={[
                        {
                          label: 'اعتماد نهائي',
                          color: 'bg-green-600 hover:bg-green-700',
                          icon: <CheckCircle2 size={16} />,
                          onClick: () => act(() => executiveApprove(req.id, actionNote || undefined), 'تمت الموافقة التنفيذية'),
                        },
                        {
                          label: 'رفض',
                          color: 'bg-red-600 hover:bg-red-700',
                          icon: <XCircle size={16} />,
                          onClick: () => {
                            if (!actionNote.trim()) { toast.error('سبب الرفض مطلوب'); return }
                            void act(() => executiveReject(req.id, actionNote), 'تم الرفض التنفيذي')
                          },
                        },
                      ]}
                    />
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.aside>
    </div>
  )

  return createPortal(modal, document.body)
}

// ── Sub-components ─────────────────────────────────────────────────────────

function InfoCard({ label, value, highlight, dateValue, showTime }: {
  label: string
  value?: React.ReactNode
  highlight?: boolean
  dateValue?: string | null
  showTime?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className={`mt-1 ${highlight ? 'text-lg text-deepBlue' : 'text-sm text-deepBlue'}`}>
        {dateValue !== undefined ? <FinanceDate value={dateValue} showTime={showTime} /> : value}
      </div>
    </div>
  )
}

function ReviewerCard({ label, name, reviewedAt, note, color }: {
  label: string; name: string; reviewedAt: string | null; note: string | null
  color: 'teal' | 'purple'
}) {
  const bg  = color === 'teal' ? 'border-teal-100 bg-teal-50' : 'border-purple-100 bg-purple-50'
  const txt = color === 'teal' ? 'text-teal-600' : 'text-purple-600'
  return (
    <div className={`rounded-2xl border p-5 ${bg}`}>
      <p className={`text-[11px] font-black ${txt}`}>{label}</p>
      <p className="mt-1.5 text-lg font-black text-deepBlue">{name}</p>
      {reviewedAt && (
        <FinanceDate value={reviewedAt} showTime />
      )}
      {note && <p className="mt-3 text-sm text-deepBlue/80 border-t border-white/50 pt-3">{note}</p>}
    </div>
  )
}

function ActionPanel({ note, onNoteChange, loading, actions }: {
  note: string
  onNoteChange: (v: string) => void
  loading: boolean
  actions: { label: string; color: string; icon: React.ReactNode; onClick: () => void }[]
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5 space-y-4">
      <div>
        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
          ملاحظة (مطلوبة عند الرفض أو الإرجاع)
        </label>
        <textarea
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-deepBlue focus:outline-none focus:ring-2 focus:ring-customBlue/40 focus:border-customBlue resize-none placeholder:text-slate-400"
          placeholder="اكتب ملاحظتك هنا…"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(a => (
          <button
            key={a.label}
            onClick={a.onClick}
            disabled={loading}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 transition-all ${a.color}`}
          >
            {a.icon} {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-deepBlue/30">
      {icon}
      <p className="text-sm font-bold">{message}</p>
    </div>
  )
}

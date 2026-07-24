import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle, Ban, CheckCircle2, Download, FileText, Loader2, Mail, Phone, User, X, XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  cancelManualPayment,
  confirmManualPayment,
  downloadManualPaymentProof,
  fetchManualPayment,
  rejectManualPayment,
} from '@/api/financeApi'
import type { ManualPayment } from '@/types/intelligence'
import { CancelPaymentModal, ConfirmPaymentModal, RejectPaymentModal } from './ApprovalModals'
import { ENTITY_AR, PAYMENT_METHOD_AR, paymentReference } from './constants'
import ManualPaymentStatusBadge, { EntityTypeBadge } from './ManualPaymentStatusBadge'
import FinanceDate from '@/components/finance/FinanceDate'
import { creatorName, formatPaymentAmount } from './formatters'

function DetailRow({ label, value, ltr, dateValue, showTime }: {
  label: string
  value?: string
  ltr?: boolean
  dateValue?: string | null
  showTime?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#F1F5F9] py-3 last:border-0">
      <dt className="shrink-0 text-[11px] font-black text-[#94A3B8]">{label}</dt>
      <dd className={`text-left text-[12px] font-bold text-[#0F172A] ${ltr ? 'font-mono' : ''}`} dir={ltr ? 'ltr' : 'rtl'}>
        {dateValue !== undefined ? <FinanceDate value={dateValue} showTime={showTime} /> : value}
      </dd>
    </div>
  )
}

export default function ManualPaymentDetailDrawer({
  paymentId,
  initial,
  onClose,
  onUpdated,
}: {
  paymentId: number | null
  initial: ManualPayment | null
  onClose: () => void
  onUpdated: () => void
}) {
  const reduce = useReducedMotion()
  const [payment, setPayment] = useState<ManualPayment | null>(initial)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [action, setAction] = useState<'confirm' | 'reject' | 'cancel' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [reviewerNote, setReviewerNote] = useState('')
  const [proofLoading, setProofLoading] = useState(false)

  useEffect(() => {
    if (!paymentId) {
      setPayment(null)
      return
    }
    setPayment(initial)
    setLoadingDetail(true)
    void fetchManualPayment(paymentId)
      .then(setPayment)
      .catch(() => toast.error('تعذر تحميل تفاصيل الدفعة'))
      .finally(() => setLoadingDetail(false))
  }, [paymentId, initial])

  useEffect(() => {
    if (!paymentId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !action) onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [paymentId, action, onClose])

  const loadedPaymentId = payment?.id
  const refreshPayment = useCallback(async () => {
    if (!loadedPaymentId) return
    const fresh = await fetchManualPayment(loadedPaymentId)
    setPayment(fresh)
    onUpdated()
  }, [loadedPaymentId, onUpdated])

  const runAction = async () => {
    if (!payment || !action) return
    if (action === 'reject' && !rejectReason.trim()) {
      setRejectError('يرجى إدخال سبب الرفض')
      return
    }
    setActionLoading(true)
    setRejectError(null)
    try {
      if (action === 'confirm') {
        await confirmManualPayment(payment.id)
        toast.success('تم اعتماد الدفعة بنجاح')
      } else if (action === 'reject') {
        await rejectManualPayment(payment.id, rejectReason.trim())
        toast.success('تم رفض الدفعة')
      } else {
        await cancelManualPayment(payment.id)
        toast.success('تم إلغاء الدفعة')
      }
      setAction(null)
      setRejectReason('')
      await refreshPayment()
    } catch {
      toast.error('تعذر تنفيذ العملية، يرجى المحاولة مرة أخرى')
    } finally {
      setActionLoading(false)
    }
  }

  const downloadProof = async () => {
    if (!payment) return
    setProofLoading(true)
    try {
      const { blob, filename } = await downloadManualPaymentProof(payment.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('تعذر تنزيل إثبات الدفع')
    } finally {
      setProofLoading(false)
    }
  }

  if (!paymentId || !payment) return null

  const ref = paymentReference(payment)
  const currency = payment.currency ?? payment.account?.currency ?? 'EUR'
  const diff = payment.difference_amount ?? 0
  const methodLabel = payment.payment_method ? (PAYMENT_METHOD_AR[payment.payment_method] ?? payment.payment_method) : '—'
  const registrar = creatorName(payment)
  const canAct = payment.status === 'pending_review'
  const hasProof = payment.has_proof ?? Boolean(payment.proof_original_name)

  const drawer = (
    <AnimatePresence>
      <motion.div className="fixed inset-0" style={{ zIndex: 320 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-[#0C2A4B]/25 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label="تفاصيل الدفعة اليدوية"
          initial={reduce ? { opacity: 0 } : { x: '-100%' }}
          animate={reduce ? { opacity: 1 } : { x: 0 }}
          exit={reduce ? { opacity: 0 } : { x: '-100%' }}
          transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute inset-y-0 start-0 flex w-full max-w-md flex-col border-e border-[#E2E8F0] bg-white shadow-2xl sm:max-w-lg"
          dir="rtl"
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0077B6]">تفاصيل الدفعة</p>
              <h2 className="mt-1 font-mono text-lg font-black text-[#0F172A]" dir="ltr">{ref}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-xl border border-[#E2E8F0] p-2 text-[#64748B] hover:bg-[#F6F8FB]">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loadingDetail && (
              <div className="mb-4 flex items-center gap-2 text-[12px] font-bold text-[#64748B]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                جاري تحديث التفاصيل…
              </div>
            )}

            <div className="mb-4">
              <ManualPaymentStatusBadge status={payment.status} />
            </div>

            <p className="font-mono text-2xl font-black tabular-nums text-[#0F172A]" dir="ltr">
              {formatPaymentAmount(payment)}
            </p>

            {diff !== 0 && (
              <div className={`mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-bold ${diff > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                {diff > 0
                  ? `الدفع ناقص بمقدار ${formatPaymentAmount({ ...payment, paid_amount: diff })}`
                  : `الدفع زائد بمقدار ${formatPaymentAmount({ ...payment, paid_amount: Math.abs(diff) })}`}
              </div>
            )}

            {payment.student && (
              <section className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F6F8FB] p-4">
                <h3 className="text-[11px] font-black text-[#64748B]">المستخدم</h3>
                <div className="mt-2 flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0077B6]/10 text-[#0077B6]">
                    <User className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-[#0F172A]">{payment.student.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#64748B]" dir="ltr">
                      <Mail className="h-3 w-3" aria-hidden />
                      {payment.student.email}
                    </p>
                    {payment.student.phone && (
                      <p className="flex items-center gap-1 text-[11px] text-[#64748B]" dir="ltr">
                        <Phone className="h-3 w-3" aria-hidden />
                        {payment.student.phone}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] font-bold text-[#94A3B8]" dir="ltr">ID: {payment.student.id}</p>
                  </div>
                </div>
              </section>
            )}

            {payment.purchasable && (
              <section className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                <h3 className="text-[11px] font-black text-[#64748B]">العنصر المرتبط</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <EntityTypeBadge type={payment.purchasable.type} />
                  <span className="text-[12px] font-black text-[#0F172A]">{payment.purchasable.title}</span>
                </div>
                <p className="mt-1 text-[10px] font-bold text-[#94A3B8]">
                  {ENTITY_AR[payment.purchasable.type]} · #{payment.purchasable.id}
                </p>
              </section>
            )}

            <dl className="mt-5">
              <DetailRow label="المبلغ المتوقع" value={formatPaymentAmount({ ...payment, paid_amount: payment.expected_amount })} ltr />
              <DetailRow label="طريقة الدفع" value={methodLabel} />
              <DetailRow label="حساب المالية" value={payment.account?.name ?? '—'} />
              <DetailRow label="العملة" value={currency} ltr />
              <DetailRow label="المرجع الخارجي" value={payment.external_reference?.trim() || '—'} ltr />
              <DetailRow label="تاريخ الدفع" dateValue={payment.payment_date} ltr />
              <DetailRow label="تاريخ الإنشاء" dateValue={payment.created_at} showTime ltr />
              {payment.updated_at && <DetailRow label="آخر تحديث" dateValue={payment.updated_at} showTime ltr />}
              {registrar && <DetailRow label="أُنشئت بواسطة" value={registrar} />}
              {payment.reviewer && <DetailRow label="المراجع" value={payment.reviewer.name} />}
              {payment.reviewed_at && <DetailRow label="تاريخ المراجعة" dateValue={payment.reviewed_at} showTime ltr />}
              {payment.rejection_reason && <DetailRow label="سبب الرفض" value={payment.rejection_reason} />}
              {payment.notes?.trim() && <DetailRow label="ملاحظات" value={payment.notes} />}
            </dl>

            {hasProof && (
              <section className="mt-5 rounded-2xl border border-[#E2E8F0] p-4">
                <h3 className="text-[11px] font-black text-[#64748B]">إثبات الدفع</h3>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[12px] font-bold text-[#0F172A]">
                    <FileText className="h-4 w-4 text-[#0077B6]" aria-hidden />
                    {payment.proof_original_name ?? 'ملف مرفق'}
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadProof()}
                    disabled={proofLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-black text-[#0C2A4B] disabled:opacity-50"
                  >
                    {proofLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    تنزيل
                  </button>
                </div>
              </section>
            )}

            <section className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F6F8FB] p-4">
              <h3 className="text-[11px] font-black text-[#64748B]">السجل</h3>
              <ul className="mt-3 space-y-2 text-[11px] font-semibold text-[#64748B]">
                <li>• تم إنشاء الدفعة — <FinanceDate value={payment.created_at} showTime /></li>
                {payment.status === 'pending_review' && <li>• بانتظار المراجعة</li>}
                {payment.status === 'confirmed' && payment.reviewed_at && <li>• تمت الموافقة عليها — <FinanceDate value={payment.reviewed_at} showTime /></li>}
                {payment.status === 'rejected' && <li>• تم رفضها{payment.reviewed_at ? <> — <FinanceDate value={payment.reviewed_at} showTime /></> : ''}</li>}
                {payment.status === 'cancelled' && <li>• تم إلغاؤها</li>}
              </ul>
            </section>
          </div>

          {canAct && (
            <div className="border-t border-[#E2E8F0] p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAction('confirm')}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-[12px] font-black text-white"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  اعتماد الدفعة
                </button>
                <button
                  type="button"
                  onClick={() => setAction('reject')}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] font-black text-rose-700"
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  رفض الدفعة
                </button>
                <button
                  type="button"
                  onClick={() => setAction('cancel')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] px-4 py-2.5 text-[12px] font-black text-[#64748B]"
                >
                  <Ban className="h-4 w-4" aria-hidden />
                  إلغاء الدفعة
                </button>
              </div>
            </div>
          )}
        </motion.aside>
      </motion.div>

      {action === 'confirm' && payment && (
        <ConfirmPaymentModal
          payment={payment}
          note={reviewerNote}
          onNoteChange={setReviewerNote}
          onConfirm={() => void runAction()}
          onCancel={() => setAction(null)}
          loading={actionLoading}
        />
      )}
      {action === 'reject' && payment && (
        <RejectPaymentModal
          payment={payment}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onConfirm={() => void runAction()}
          onCancel={() => setAction(null)}
          loading={actionLoading}
          error={rejectError}
        />
      )}
      {action === 'cancel' && payment && (
        <CancelPaymentModal
          payment={payment}
          onConfirm={() => void runAction()}
          onCancel={() => setAction(null)}
          loading={actionLoading}
        />
      )}
    </AnimatePresence>
  )

  return createPortal(drawer, document.body)
}

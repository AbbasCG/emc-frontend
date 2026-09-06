import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { ManualPayment } from '@/types/intelligence'
import { paymentReference } from './constants'
import { formatPaymentAmount } from './formatters'

export function ConfirmPaymentModal({
  payment,
  note,
  onNoteChange,
  onConfirm,
  onCancel,
  loading,
}: {
  payment: ManualPayment
  note: string
  onNoteChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const reduce = useReducedMotion()
  const ref = paymentReference(payment)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[400] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-[#0C2A4B]/30 backdrop-blur-[1px]" onClick={onCancel} aria-hidden />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="اعتماد الدفعة"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          className="relative w-full max-w-md rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-2xl"
          dir="rtl"
        >
          <h3 className="text-[15px] font-black text-[#0F172A]">اعتماد الدفعة</h3>
          <p className="mt-2 text-[12px] font-semibold text-[#64748B]">
            سيتم تأكيد الدفعة وإنشاء سجل مالي. تأكد من صحة البيانات قبل المتابعة.
          </p>
          <dl className="mt-4 space-y-2 rounded-2xl bg-[#F6F8FB] p-4 text-[12px]">
            <div className="flex justify-between gap-3">
              <dt className="font-bold text-[#94A3B8]">المرجع</dt>
              <dd className="font-mono font-black text-[#0F172A]" dir="ltr">{ref}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-bold text-[#94A3B8]">المستخدم</dt>
              <dd className="font-black text-[#0F172A]">{payment.student?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-bold text-[#94A3B8]">المبلغ</dt>
              <dd className="font-mono font-black text-[#0F172A]" dir="ltr">{formatPaymentAmount(payment)}</dd>
            </div>
            {payment.purchasable && (
              <div className="flex justify-between gap-3">
                <dt className="font-bold text-[#94A3B8]">العنصر</dt>
                <dd className="font-black text-[#0F172A]">{payment.purchasable.title}</dd>
              </div>
            )}
          </dl>
          <label className="mt-4 block text-right">
            <span className="text-[11px] font-black text-[#64748B]">ملاحظة المراجع (اختياري)</span>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-[12px] font-semibold outline-none focus:border-[#0077B6]/50 focus:ring-2 focus:ring-[#0077B6]/15"
            />
          </label>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-[12px] font-black text-white disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              اعتماد الدفعة
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-2xl border border-[#E2E8F0] py-2.5 text-[12px] font-black text-[#64748B]"
            >
              إلغاء
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export function RejectPaymentModal({
  payment,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
  loading,
  error,
}: {
  payment: ManualPayment
  reason: string
  onReasonChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error?: string | null
}) {
  const reduce = useReducedMotion()
  const ref = paymentReference(payment)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[400] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-[#0C2A4B]/30 backdrop-blur-[1px]" onClick={onCancel} aria-hidden />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="رفض الدفعة"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-md rounded-[20px] border border-rose-200 bg-white p-6 shadow-2xl"
          dir="rtl"
        >
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-5 w-5" aria-hidden />
            <h3 className="text-[15px] font-black">رفض الدفعة</h3>
          </div>
          <p className="mt-2 text-[12px] font-semibold text-[#64748B]">
            المرجع <span className="font-mono font-black" dir="ltr">{ref}</span> {payment.student?.name}
          </p>
          <label className="mt-4 block text-right">
            <span className="text-[11px] font-black text-[#64748B]">سبب الرفض *</span>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-[12px] font-semibold outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
            {error && <p className="mt-1 text-[11px] font-bold text-rose-600">{error}</p>}
          </label>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 py-2.5 text-[12px] font-black text-white disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              رفض الدفعة
            </button>
            <button type="button" onClick={onCancel} disabled={loading} className="flex-1 rounded-2xl border border-[#E2E8F0] py-2.5 text-[12px] font-black text-[#64748B]">
              إلغاء
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export function CancelPaymentModal({
  payment,
  onConfirm,
  onCancel,
  loading,
}: {
  payment: ManualPayment
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const reduce = useReducedMotion()

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[400] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-[#0C2A4B]/30" onClick={onCancel} aria-hidden />
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={reduce ? false : { scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-full max-w-sm rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-2xl"
          dir="rtl"
        >
          <h3 className="text-[15px] font-black text-[#0F172A]">إلغاء الدفعة</h3>
          <p className="mt-2 text-[12px] font-semibold text-[#64748B]">
            سيتم إلغاء الدفعة #{payment.id} ولن تُعالج كدفعة مالية. لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={onConfirm} disabled={loading} className="flex-1 rounded-2xl bg-rose-600 py-2.5 text-[12px] font-black text-white disabled:opacity-60">
              {loading ? 'جاري الإلغاء…' : 'تأكيد الإلغاء'}
            </button>
            <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-[#E2E8F0] py-2.5 text-[12px] font-black text-[#64748B]">
              تراجع
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Copy, ExternalLink, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { FinancialTransaction } from '@/types/intelligence'
import { financeSectionBase } from '@/utils/financeNav'
import TransactionStatusBadge, { TransactionTypeBadge } from './TransactionStatusBadge'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatMoney } from '@/utils/financeFormatters'

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

export default function TransactionDetailDrawer({
  tx,
  onClose,
}: {
  tx: FinancialTransaction | null
  onClose: () => void
}) {
  const { pathname } = useLocation()
  const base = financeSectionBase(pathname)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!tx) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [tx, onClose])

  const copyRef = useCallback((text: string) => {
    void navigator.clipboard.writeText(text)
  }, [])

  if (!tx) return null

  const drawer = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0"
        style={{ zIndex: 320 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-[#22334A]/25 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label="تفاصيل المعاملة"
          initial={reduce ? { opacity: 0 } : { x: '-100%' }}
          animate={reduce ? { opacity: 1 } : { x: 0 }}
          exit={reduce ? { opacity: 0 } : { x: '-100%' }}
          transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute inset-y-0 start-0 flex w-full max-w-md flex-col border-e border-[#E2E8F0] bg-white shadow-2xl"
          dir="rtl"
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2691C2]">تفاصيل المعاملة</p>
              <h2 className="mt-1 font-mono text-lg font-black text-[#0F172A]" dir="ltr">#{tx.id}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="rounded-xl border border-[#E2E8F0] p-2 text-[#64748B] hover:bg-[#F6F8FB]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <TransactionStatusBadge status={tx.status} type={tx.type} />
              <TransactionTypeBadge type={tx.type} />
            </div>

            <p className="font-mono text-2xl font-black tabular-nums whitespace-nowrap text-[#0F172A]" dir="ltr">
              {formatMoney(tx.amount, tx.currency)}
            </p>

            <dl className="mt-6">
              <DetailRow label="الوصف" value={tx.description?.trim() || '—'} />
              <DetailRow label="العملة" value={tx.currency} ltr />
              <DetailRow label="تاريخ التنفيذ" dateValue={tx.occurred_at || tx.created_at} showTime ltr />
              <DetailRow label="تاريخ الإنشاء" dateValue={tx.created_at} showTime ltr />
              {tx.payment_id != null && (
                <DetailRow label="مرجع الدفع" value={String(tx.payment_id)} ltr />
              )}
              {tx.registration_id != null && (
                <DetailRow label="مرجع التسجيل" value={String(tx.registration_id)} ltr />
              )}
            </dl>

            {tx.user && (
              <section className="mt-6 rounded-2xl border border-[#E2E8F0] bg-[#F6F8FB] p-4">
                <h3 className="text-[11px] font-black text-[#64748B]">المستخدم</h3>
                <p className="mt-2 text-[13px] font-black text-[#0F172A]">{tx.user.name || '—'}</p>
                <p className="text-[12px] font-semibold text-[#64748B]" dir="ltr">{tx.user.email}</p>
              </section>
            )}
          </div>

          <div className="border-t border-[#E2E8F0] p-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyRef(String(tx.id))}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] px-4 py-2.5 text-[12px] font-black text-[#22334A]"
              >
                <Copy className="h-4 w-4" aria-hidden />
                نسخ المرجع
              </button>
              {tx.payment_id != null && (
                <Link
                  to={`${base}/payments`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2691C2] px-4 py-2.5 text-[12px] font-black text-white"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  المدفوعات
                </Link>
              )}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-[#94A3B8]">
              <Check className="h-3 w-3" aria-hidden />
              لا تتوفر عمليات استرداد أو إلغاء لهذه المعاملة من هذه الشاشة.
            </p>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(drawer, document.body)
}

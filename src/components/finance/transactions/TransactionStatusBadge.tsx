import { motion, useReducedMotion } from 'framer-motion'
import type { FinancialTransactionStatus, FinancialTransactionType } from '@/types/intelligence'
import { getTransactionStatusBadgeStyle, mapTransactionStatusKey } from '@/utils/transactionStatusLabels'

export default function TransactionStatusBadge({
  status,
  type,
}: {
  status: FinancialTransactionStatus
  type?: FinancialTransactionType
}) {
  const key = mapTransactionStatusKey(status, type)
  const s = getTransactionStatusBadgeStyle(key)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  )
}

export function TransactionTypeBadge({ type }: { type: FinancialTransactionType }) {
  const cls =
    type === 'revenue' ? 'bg-[#0077B6]/10 text-[#1e6f96] ring-[#0077B6]/20'
    : type === 'refund' ? 'bg-violet-50 text-violet-700 ring-violet-200'
    : type === 'expense' ? 'bg-rose-50 text-rose-700 ring-rose-200'
    : 'bg-slate-100 text-slate-600 ring-slate-200'
  const label =
    type === 'revenue' ? 'إيراد'
    : type === 'refund' ? 'استرداد'
    : type === 'expense' ? 'مصروف'
    : 'تعديل يدوي'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1 ${cls}`}>
      {label}
    </span>
  )
}

export function MotionFadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

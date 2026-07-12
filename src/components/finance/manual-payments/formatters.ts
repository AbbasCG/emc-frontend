import { formatTxAmount, formatTxAmountCompact, formatTxDate, txInitials } from '@/components/finance/transactions/formatters'
import { paymentReference } from './constants'
import type { ManualPayment } from '@/types/intelligence'

export { formatTxAmount, formatTxAmountCompact, formatTxDate, txInitials }

export function formatPaymentAmount(p: ManualPayment): string {
  const currency = p.currency ?? p.account?.currency ?? 'EUR'
  return formatTxAmount(p.paid_amount, currency)
}

export function shortPaymentRef(p: ManualPayment): string {
  const ref = paymentReference(p)
  return ref.length > 18 ? `${ref.slice(0, 8)}…${ref.slice(-6)}` : ref
}

export function creatorName(p: ManualPayment): string | null {
  return p.created_by?.name ?? p.creator?.name ?? null
}

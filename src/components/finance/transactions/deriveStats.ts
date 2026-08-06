import type { FinancialTransaction } from '@/types/intelligence'
import { isRefundedTransaction } from './constants'

export type TransactionSummaryStats = {
  totalCount: number
  revenueTotal: number
  pendingCount: number
  pendingTotal: number
  refundedCount: number
  refundedTotal: number
}

export function deriveTransactionStats(rows: FinancialTransaction[]): TransactionSummaryStats {
  let revenueTotal = 0
  let pendingCount = 0
  let pendingTotal = 0
  let refundedCount = 0
  let refundedTotal = 0

  for (const t of rows) {
    const amt = Number(t.amount) || 0
    if (t.type === 'revenue' && t.status === 'confirmed') revenueTotal += amt
    if (t.status === 'pending') {
      pendingCount += 1
      pendingTotal += amt
    }
    if (isRefundedTransaction(t)) {
      refundedCount += 1
      refundedTotal += amt
    }
  }

  return {
    totalCount: rows.length,
    revenueTotal,
    pendingCount,
    pendingTotal,
    refundedCount,
    refundedTotal,
  }
}

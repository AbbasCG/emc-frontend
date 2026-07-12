import type { ManualPayment } from '@/types/intelligence'

export type ManualPaymentSummaryStats = {
  totalCount: number
  totalAmount: number
  pendingCount: number
  pendingAmount: number
  confirmedCount: number
  confirmedAmount: number
  rejectedCount: number
  rejectedAmount: number
}

export function deriveManualPaymentStats(rows: ManualPayment[]): ManualPaymentSummaryStats {
  let totalAmount = 0
  let pendingCount = 0
  let pendingAmount = 0
  let confirmedCount = 0
  let confirmedAmount = 0
  let rejectedCount = 0
  let rejectedAmount = 0

  for (const p of rows) {
    const amt = Number(p.paid_amount) || 0
    totalAmount += amt
    if (p.status === 'pending_review') {
      pendingCount += 1
      pendingAmount += amt
    } else if (p.status === 'confirmed') {
      confirmedCount += 1
      confirmedAmount += amt
    } else if (p.status === 'rejected') {
      rejectedCount += 1
      rejectedAmount += amt
    }
  }

  return {
    totalCount: rows.length,
    totalAmount,
    pendingCount,
    pendingAmount,
    confirmedCount,
    confirmedAmount,
    rejectedCount,
    rejectedAmount,
  }
}

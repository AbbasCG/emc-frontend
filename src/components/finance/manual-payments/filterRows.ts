import type { ManualPayment } from '@/types/intelligence'

export type ManualPaymentFilterState = {
  search: string
  status: string
  paymentMethod: string
  entityType: string
  accountId: string
  from: string
  to: string
  minAmount: string
  maxAmount: string
  page: number
}

export function filterManualPaymentsClient(rows: ManualPayment[], f: ManualPaymentFilterState): ManualPayment[] {
  const q = f.search.trim().toLowerCase()
  const min = f.minAmount.trim() ? Number(f.minAmount) : null
  const max = f.maxAmount.trim() ? Number(f.maxAmount) : null

  return rows.filter((p) => {
    if (f.entityType !== 'all' && p.purchasable?.type !== f.entityType) return false
    if (f.accountId !== 'all' && String(p.account?.id ?? '') !== f.accountId) return false
    if (min != null && !Number.isNaN(min) && (Number(p.paid_amount) || 0) < min) return false
    if (max != null && !Number.isNaN(max) && (Number(p.paid_amount) || 0) > max) return false
    if (!q) return true

    const ref = [
      p.external_reference,
      p.internal_reference,
      p.reference,
      String(p.id),
      p.student?.name,
      p.student?.email,
      p.student?.phone,
      p.purchasable?.title,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return ref.includes(q) || ref.split(/\s+/).some((w) => w.includes(q))
  })
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}

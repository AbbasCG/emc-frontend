import type { FinancialTransaction } from '@/types/intelligence'
import { mapStatusForFilter } from './constants'

export type TransactionFilterState = {
  search: string
  status: string
  type: string
  from: string
  to: string
  minAmount: string
  maxAmount: string
  page: number
}

export function filterTransactionsClient(
  rows: FinancialTransaction[],
  filters: Pick<TransactionFilterState, 'search' | 'status' | 'type' | 'minAmount' | 'maxAmount'>,
): FinancialTransaction[] {
  const q = filters.search.trim().toLowerCase()
  const min = filters.minAmount.trim() ? Number(filters.minAmount) : null
  const max = filters.maxAmount.trim() ? Number(filters.maxAmount) : null

  return rows.filter((t) => {
    const mappedStatus = mapStatusForFilter(t.status, t.type)
    if (filters.status !== 'all' && mappedStatus !== filters.status) return false
    if (filters.type !== 'all' && t.type !== filters.type) return false

    const amt = Number(t.amount) || 0
    if (min != null && Number.isFinite(min) && amt < min) return false
    if (max != null && Number.isFinite(max) && amt > max) return false

    if (!q) return true
    const blob = [
      t.id,
      t.description,
      t.user?.name,
      t.user?.email,
      t.payment_id,
      t.registration_id,
      t.amount,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return blob.includes(q)
  })
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}

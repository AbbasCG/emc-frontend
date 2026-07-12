import type { FinancialTransaction } from '@/types/intelligence'
import type { TrendRangeKey } from './constants'
import { TREND_RANGE_OPTIONS } from './constants'

export type TrendPoint = { label: string; amount: number; count: number }

export function deriveTransactionTrend(
  rows: FinancialTransaction[],
  rangeKey: TrendRangeKey,
): TrendPoint[] {
  const cfg = TREND_RANGE_OPTIONS.find((r) => r.value === rangeKey) ?? TREND_RANGE_OPTIONS[1]
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - cfg.days)

  const bucket = new Map<string, { amount: number; count: number }>()

  for (const t of rows) {
    const raw = t.occurred_at || t.created_at
    if (!raw) continue
    const d = new Date(raw)
    if (Number.isNaN(d.getTime()) || d < cutoff) continue
    const key = d.toISOString().slice(0, 10)
    const prev = bucket.get(key) ?? { amount: 0, count: 0 }
    prev.amount += Number(t.amount) || 0
    prev.count += 1
    bucket.set(key, prev)
  }

  const keys = [...bucket.keys()].sort()
  if (keys.length === 0) return []

  return keys.map((key) => {
    const b = bucket.get(key)!
    const d = new Date(key + 'T12:00:00')
    const label = new Intl.DateTimeFormat('ar', { month: 'short', day: 'numeric', numberingSystem: 'latn' }).format(d)
    return { label, amount: b.amount, count: b.count }
  })
}

import type { FinanceDashboardData, FinancePaymentRow } from '@/types/intelligence'

export function monthOverMonthGrowthPct(monthly: { amount: number }[]): number | null {
  if (monthly.length < 2) return null
  const prev = monthly[monthly.length - 2]!.amount
  const cur = monthly[monthly.length - 1]!.amount
  if (prev === 0) return cur > 0 ? 100 : 0
  return ((cur - prev) / prev) * 100
}

export function successRatePct(data: FinanceDashboardData): number {
  const t = data.total_revenue
  if (t <= 0) return 0
  return Math.min(100, Math.round((data.confirmed_revenue / t) * 100))
}

/** Average captured payment in the preview list (confirmed rows), else coarse fallback. */
export function avgCapturedAmount(data: FinanceDashboardData): number {
  const confirmed = data.latest_payments.filter((p) => p.status === 'confirmed')
  if (confirmed.length > 0) {
    const sum = confirmed.reduce((a, p) => a + p.amount, 0)
    return sum / confirmed.length
  }
  const n = data.latest_payments.length
  if (n > 0) return data.total_revenue / n
  return data.total_revenue
}

export function gatewayTotalsFromPayments(payments: FinancePaymentRow[]) {
  const map = new Map<string, number>()
  for (const p of payments) {
    map.set(p.provider, (map.get(p.provider) ?? 0) + p.amount)
  }
  return Array.from(map.entries())
    .map(([provider, amount]) => ({ provider, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function pendingCountPreview(payments: FinancePaymentRow[]) {
  return payments.filter((p) => p.status === 'pending').length
}

export function activePreviewCount(payments: FinancePaymentRow[]) {
  return payments.filter((p) => p.status !== 'failed').length
}

export function pickTopCourse(data: FinanceDashboardData) {
  const rows = data.revenue_by_course
  if (!rows.length) return null
  return rows.reduce((a, b) => (b.amount > a.amount ? b : a))
}

export function pickTopTrack(data: FinanceDashboardData) {
  const rows = data.revenue_by_track
  if (!rows.length) return null
  return rows.reduce((a, b) => (b.amount > a.amount ? b : a))
}

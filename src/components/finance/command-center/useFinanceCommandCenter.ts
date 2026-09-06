import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchFinanceAccountsSummary,
  fetchFinanceDashboard,
  fetchFinanceInvoices,
  fetchFinancePayments,
  fetchFinanceTransactionsLegacy,
  fetchManualPayments,
} from '@/api/financeApi'
import type { FinanceCommandCenterData } from './types'
import {
  buildActivityFeed,
  buildAlerts,
  buildAnalyticsWidgets,
  buildCalendarItems,
  buildCashFlowSeries,
  buildKpiCards,
  buildRevenueExpenseSeries,
  buildRevenueSources,
} from './derivations'
import { monthOverMonthGrowthPct } from '../financeDashboardDerivations'

export type FinanceDateRange = { from: string; to: string }

const LOAD_ERROR = 'تعذّر تحميل بيانات مركز التحكم المالي. تحقق من الاتصال وأعد المحاولة.'

/** Pure I/O — no state — so the mount effect and the imperative `reload` can share the
 *  request without either calling a state-mutating helper. */
async function fetchCommandCenterData(range: FinanceDateRange): Promise<FinanceCommandCenterData> {
  const [dashboard, accountsSummary, paymentsRes, transactions, invoicesRes, manualRes] =
    await Promise.all([
      fetchFinanceDashboard({ from: range.from, to: range.to }),
      fetchFinanceAccountsSummary(),
      fetchFinancePayments({ from: range.from, to: range.to }),
      fetchFinanceTransactionsLegacy({ from: range.from, to: range.to }),
      fetchFinanceInvoices({ from: range.from, to: range.to }),
      fetchManualPayments({ status: 'pending_review', date_from: range.from, date_to: range.to }),
    ])

  return {
    dashboard,
    accounts: accountsSummary.accounts,
    totalCash: accountsSummary.total_cash,
    payments: paymentsRes.data.length ? paymentsRes.data : dashboard.latest_payments,
    transactions,
    invoices: invoicesRes.data,
    manualPayments: manualRes.data,
  }
}

export function useFinanceCommandCenter(range: FinanceDateRange, formatCurrency: (n: number) => string) {
  const [data, setData] = useState<FinanceCommandCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // Re-arm the loading state during render when the range changes (react.dev "adjusting
  // state when a prop changes"), so the new range never paints the previous range's
  // numbers as settled. The initial state already covers the first run.
  const [seenRange, setSeenRange] = useState({ from: range.from, to: range.to })
  if (seenRange.from !== range.from || seenRange.to !== range.to) {
    setSeenRange({ from: range.from, to: range.to })
    setLoading(true)
    setError(null)
  }

  /** Imperative refresh from an event handler — outside the effect, so it may flip to
   *  the loading state synchronously. */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchCommandCenterData({ from: range.from, to: range.to }))
      setLastSync(new Date())
    } catch {
      setError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const payload = await fetchCommandCenterData({ from: range.from, to: range.to })
        if (!alive) return
        setData(payload)
        setLastSync(new Date())
      } catch {
        if (alive) setError(LOAD_ERROR)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [range.from, range.to])

  const derived = useMemo(() => {
    if (!data) return null
    const expenses = data.transactions
      .filter((t) => t.type === 'debit')
      .reduce((a, t) => a + t.amount, 0)

    return {
      kpis: buildKpiCards(data, formatCurrency),
      revenueExpense: buildRevenueExpenseSeries(data.dashboard, expenses),
      revenueSources: buildRevenueSources(data.payments),
      cashFlow: buildCashFlowSeries(data.dashboard, data.transactions),
      activity: buildActivityFeed(data),
      analytics: buildAnalyticsWidgets(data, formatCurrency),
      growth: monthOverMonthGrowthPct(data.dashboard.monthly_revenue),
    }
  }, [data, formatCurrency])

  return { data, derived, loading, error, lastSync, reload: load }
}

export function useFinanceAlerts(data: FinanceCommandCenterData | null, financeBase: string) {
  return useMemo(
    () => (data ? buildAlerts(data, financeBase) : []),
    [data, financeBase],
  )
}

export function useFinanceCalendar(data: FinanceCommandCenterData | null) {
  return useMemo(() => (data ? buildCalendarItems(data) : []), [data])
}

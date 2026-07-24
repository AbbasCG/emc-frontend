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

export function useFinanceCommandCenter(range: FinanceDateRange, formatCurrency: (n: number) => string) {
  const [data, setData] = useState<FinanceCommandCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashboard, accountsSummary, paymentsRes, transactions, invoicesRes, manualRes] =
        await Promise.all([
          fetchFinanceDashboard({ from: range.from, to: range.to }),
          fetchFinanceAccountsSummary(),
          fetchFinancePayments({ from: range.from, to: range.to }),
          fetchFinanceTransactionsLegacy({ from: range.from, to: range.to }),
          fetchFinanceInvoices({ from: range.from, to: range.to }),
          fetchManualPayments({ status: 'pending_review', date_from: range.from, date_to: range.to }),
        ])

      const payload: FinanceCommandCenterData = {
        dashboard,
        accounts: accountsSummary.accounts,
        totalCash: accountsSummary.total_cash,
        payments: paymentsRes.data.length ? paymentsRes.data : dashboard.latest_payments,
        transactions,
        invoices: invoicesRes.data,
        manualPayments: manualRes.data,
      }
      setData(payload)
      setLastSync(new Date())
    } catch {
      setError('تعذّر تحميل بيانات مركز التحكم المالي. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to])

  useEffect(() => {
    void load()
  }, [load])

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

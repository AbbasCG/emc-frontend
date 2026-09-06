import { lazy, Suspense, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FinanceSubnav } from '@/components/intelligence'
import { formatFinanceCurrencyInteger, formatFinanceSAR } from '@/utils/financeFormatters'
import FinanceHeader from './FinanceHeader'
import KpiGrid from './KpiGrid'
import AccountGrid from './AccountGrid'
import ActivityTimeline from './ActivityTimeline'
import QuickActions from './QuickActions'
import AlertCenter from './AlertCenter'
import AnalyticsGrid from './AnalyticsGrid'
import RecentTransactions from './RecentTransactions'
import FinanceCalendar from './FinanceCalendar'
import FinanceCommandCenterSkeleton from './shared'
import { useFinanceAlerts, useFinanceCalendar, useFinanceCommandCenter } from './useFinanceCommandCenter'
import type { FinanceCurrency } from './types'

const ChartsRow = lazy(() => import('./ChartsRow'))
const CashFlowChart = lazy(() => import('./CashFlowChart'))

type Props = {
  displayName: string
  roleLabel: string
  financeBase: string
  range: { from: string; to: string }
  onRangeChange: (range: { from: string; to: string }) => void
}

function periodToRange(period: 'month' | 'quarter' | 'year'): { from: string; to: string; label: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')

  if (period === 'month') {
    const last = new Date(y, m + 1, 0).getDate()
    return {
      from: `${y}-${pad(m + 1)}-01`,
      to: `${y}-${pad(m + 1)}-${pad(last)}`,
      label: 'هذا الشهر',
    }
  }
  if (period === 'quarter') {
    const qStart = Math.floor(m / 3) * 3
    const end = new Date(y, qStart + 3, 0)
    return {
      from: `${y}-${pad(qStart + 1)}-01`,
      to: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
      label: 'هذا الربع',
    }
  }
  return { from: `${y}-01-01`, to: `${y}-12-31`, label: 'هذه السنة' }
}

export default function FinanceCommandCenter({
  displayName,
  roleLabel,
  financeBase,
  range,
  onRangeChange,
}: Props) {
  const [currency, setCurrency] = useState<FinanceCurrency>('EUR')
  const [periodKey, setPeriodKey] = useState<'month' | 'quarter' | 'year'>('year')

  const formatCurrency = useMemo(
    () => (n: number) => currency === 'SAR' ? formatFinanceSAR(n) : formatFinanceCurrencyInteger(n),
    [currency],
  )

  const { data, derived, loading, error, lastSync, reload } = useFinanceCommandCenter(range, formatCurrency)
  const alerts = useFinanceAlerts(data, financeBase)
  const calendarItems = useFinanceCalendar(data)

  const periodLabel = useMemo(() => {
    const r = periodToRange(periodKey)
    return r.label
  }, [periodKey])

  if (loading && !data) return <FinanceCommandCenterSkeleton />

  if (error || !data || !derived) {
    return (
      <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
        <p className="font-black text-rose-800">{error ?? 'تعذّر تحميل البيانات.'}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-5 pb-8"
    >
      <FinanceHeader
        displayName={displayName}
        roleLabel={roleLabel}
        lastSync={lastSync}
        loading={loading}
        periodLabel={periodLabel}
        currency={currency}
        onPeriodChange={(p) => {
          setPeriodKey(p)
          onRangeChange(periodToRange(p))
        }}
        onCurrencyChange={setCurrency}
        onRefresh={() => void reload()}
        onExport={() => window.print()}
      />

      <FinanceSubnav />

      <KpiGrid cards={derived.kpis} formatCurrency={formatCurrency} />

      <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-slate-100" />}>
        <ChartsRow revenueExpense={derived.revenueExpense} revenueSources={derived.revenueSources} />
      </Suspense>

      <AccountGrid accounts={data.accounts} payments={data.payments} financeBase={financeBase} />

      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-slate-100" />}>
        <CashFlowChart data={derived.cashFlow} />
      </Suspense>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ActivityTimeline items={derived.activity} />
        <FinanceCalendar items={calendarItems} />
      </div>

      <QuickActions financeBase={financeBase} />

      <AlertCenter alerts={alerts} />

      <AnalyticsGrid widgets={derived.analytics} />

      <RecentTransactions payments={data.payments} financeBase={financeBase} />
    </motion.div>
  )
}

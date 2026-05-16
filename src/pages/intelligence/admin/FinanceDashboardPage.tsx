import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  activePreviewCount,
  FinanceBentoWidgets,
  FinanceExecutiveHero,
  FinancePaymentsActivity,
  FinancePremiumKPIGrid,
  FinanceRechartsSection,
  monthOverMonthGrowthPct,
} from '@/components/finance'
import { DateRangeFilter, ExportButton, FinanceSubnav, IntelligencePageSkeleton } from '@/components/intelligence'
import { fetchFinanceDashboard } from '@/api/financeApi'
import { useAuth } from '@/contexts/AuthContext'
import { seedFinanceDashboard } from '@/data/intelligenceSeed'
import type { FinanceDashboardData } from '@/types/intelligence'
import { financeSectionBase } from '@/utils/financeNav'
import { formatEuroInteger } from '@/utils/currency'
import { getUserDisplayName, getUserRoleLabel } from '@/utils/userIdentity'

export default function FinanceDashboardPage() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const financeBase = financeSectionBase(pathname)
  const paymentsHref = `${financeBase}/payments`

  const [data, setData] = useState<FinanceDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState({ from: '2026-01-01', to: '2026-06-30' })
  const [applied, setApplied] = useState(range)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await fetchFinanceDashboard({ from: applied.from, to: applied.to })
        if (!cancelled) setData(d)
      } catch {
        if (!cancelled) setData(seedFinanceDashboard())
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applied])

  const formatCurrency = useMemo(() => (n: number) => formatEuroInteger(n, 'ar'), [])

  const displayName = getUserDisplayName(user) || 'زائر'
  const roleLabel = getUserRoleLabel(user) || 'مدير المالية'

  if (loading || !data) return <IntelligencePageSkeleton />

  const growth = monthOverMonthGrowthPct(data.monthly_revenue)

  return (
    <div className="space-y-10">
      <FinanceExecutiveHero
        displayName={displayName}
        roleLabel={roleLabel}
        totalRevenue={data.total_revenue}
        confirmedRevenue={data.confirmed_revenue}
        growthPct={growth}
        activePreviewTx={activePreviewCount(data.latest_payments)}
        formatCurrency={formatCurrency}
        paymentsHref={paymentsHref}
      />

      <FinanceSubnav />

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <ExportButton label="تصدير ملخص (PDF)" onClick={() => {}} />
        </div>
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange} onApply={() => setApplied(range)} />
      </div>

      <FinancePremiumKPIGrid data={data} formatCurrency={formatCurrency} />

      <FinanceRechartsSection data={data} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,2.05fr)_minmax(280px,0.95fr)] xl:items-start">
        <FinancePaymentsActivity payments={data.latest_payments} paymentsHref={paymentsHref} />
        <FinanceBentoWidgets data={data} />
      </div>
    </div>
  )
}

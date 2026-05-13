import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Banknote, Clock3, TrendingUp } from 'lucide-react'
import {
  DateRangeFilter,
  ExportButton,
  FinanceMetricCard,
  FinanceSubnav,
  IntelligencePageSkeleton,
  PaymentStatusBadge,
  RevenueChart,
} from '@/components/intelligence'
import { fetchFinanceDashboard } from '@/api/financeApi'
import { seedFinanceDashboard } from '@/data/intelligenceSeed'
import type { FinanceDashboardData } from '@/types/intelligence'

function fmt(n: number) {
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n) + ' ر.س'
}

export default function FinanceDashboardPage() {
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

  const courseBars = useMemo(
    () =>
      (data?.revenue_by_course ?? []).map((c) => ({
        label: c.course_name.slice(0, 8) + '…',
        amount: c.amount,
      })),
    [data],
  )

  if (loading || !data) return <IntelligencePageSkeleton />

  return (
    <div className="space-y-8">
      <header className="rounded-[1.35rem] bg-gradient-to-bl from-deepBlue via-deepBlue to-[#152536] p-8 text-right text-white shadow-xl ring-1 ring-white/10">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">محرك الإيرادات</p>
        <h1 className="mt-2 text-2xl font-black">لوحة المالية التحليلية</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold text-white/70">
          إجمالي الإيرادات، التحصيل، والمعلق — بتجربة تشبه لوحات الدفع الحديثة مع هوية EMC العربية.
        </p>
      </header>

      <FinanceSubnav />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <ExportButton label="تصدير ملخص (PDF)" onClick={() => {}} />
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange} onApply={() => setApplied(range)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceMetricCard icon={TrendingUp} label="إجمالي الإيرادات" value={fmt(data.total_revenue)} accent="blue" />
        <FinanceMetricCard icon={Banknote} label="المدفوعات الناجحة" value={fmt(data.confirmed_revenue)} accent="blue" />
        <FinanceMetricCard icon={Clock3} label="المدفوعات المعلقة" value={fmt(data.pending_revenue)} accent="orange" />
        <FinanceMetricCard icon={AlertTriangle} label="المدفوعات الفاشلة" value={String(data.failed_count)} hint="عدد العمليات" accent="orange" />
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <RevenueChart data={data.monthly_revenue} title="الإيراد الشهري" />
        <RevenueChart data={courseBars.length ? courseBars : [{ label: '—', amount: 0 }]} title="الإيراد حسب الدورة" />
      </div>

      <motion.section layout className="rounded-[1.35rem] bg-white p-6 shadow-lg ring-1 ring-deepBlue/[0.06]">
        <h3 className="text-right text-sm font-black text-deepBlue">الإيراد حسب المسار</h3>
        <ul className="mt-4 space-y-3">
          {data.revenue_by_track.map((t) => (
            <li key={t.track_name} className="flex items-center justify-between gap-3 text-right">
              <span className="text-sm font-black text-customBlue">{fmt(t.amount)}</span>
              <span className="text-sm font-bold text-deepBlue">{t.track_name}</span>
            </li>
          ))}
        </ul>
      </motion.section>

      <section className="rounded-[1.35rem] bg-white p-6 shadow-lg ring-1 ring-deepBlue/[0.06]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black text-deepBlue">أحدث المدفوعات</h3>
          <Link to="/dashboard/admin/finance/payments" className="text-xs font-black text-customOrange hover:underline">
            عرض الكل
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400">
              <tr>
                <th className="py-3">#</th>
                <th className="py-3">المبلغ</th>
                <th className="py-3">الحالة</th>
                <th className="py-3">المزود</th>
                <th className="py-3">الدورة</th>
                <th className="py-3">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data.latest_payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 font-semibold text-deepBlue">
                  <td className="py-3">{p.id}</td>
                  <td className="py-3">{fmt(p.amount)}</td>
                  <td className="py-3">
                    <PaymentStatusBadge status={p.status} />
                  </td>
                  <td className="py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                      {p.provider}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-slate-600">{p.course_name}</td>
                  <td className="py-3 text-xs text-slate-500">{p.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DateRangeFilter, ExportButton, FinanceSubnav, IntelligencePageSkeleton, PaymentStatusBadge } from '@/components/intelligence'
import EmptyState from '@/components/dashboard/EmptyState'
import { ArrowLeftRight } from 'lucide-react'
import { fetchFinanceTransactions } from '@/api/financeApi'
import { seedFinanceTransactions } from '@/data/intelligenceSeed'
import type { FinanceTransactionRow } from '@/types/intelligence'

function fmt(n: number) {
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n) + ' ر.س'
}

export default function FinanceTransactionsPage() {
  const [rows, setRows] = useState<FinanceTransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState({ from: '2026-01-01', to: '2026-06-30' })
  const [applied, setApplied] = useState(range)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await fetchFinanceTransactions({ from: applied.from, to: applied.to })
        if (!cancelled) setRows(d)
      } catch {
        if (!cancelled) setRows(seedFinanceTransactions())
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applied])

  if (loading) return <IntelligencePageSkeleton />

  return (
    <div className="space-y-8">
      <header className="text-right">
        <h1 className="text-2xl font-black text-deepBlue">المعاملات</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">حركة ائتمان وخصم مع الحالة والمزود</p>
      </header>
      <FinanceSubnav />

      <div className="flex flex-wrap items-center justify-end gap-4">
        <ExportButton label="Excel placeholder" onClick={() => {}} />
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange} onApply={() => setApplied(range)} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="لا معاملات" />
      ) : (
        <motion.div layout className="overflow-x-auto rounded-[1.35rem] bg-white p-4 shadow-lg ring-1 ring-deepBlue/[0.06]">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400">
              <tr>
                <th className="py-3">#</th>
                <th className="py-3">البيان</th>
                <th className="py-3">النوع</th>
                <th className="py-3">المبلغ</th>
                <th className="py-3">الحالة</th>
                <th className="py-3">المزود</th>
                <th className="py-3">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 font-semibold text-deepBlue">
                  <td className="py-3">{t.id}</td>
                  <td className="py-3">{t.label}</td>
                  <td className="py-3">
                    <span className={t.type === 'credit' ? 'text-emerald-700' : 'text-red-700'}>
                      {t.type === 'credit' ? 'إيداع' : 'خصم'}
                    </span>
                  </td>
                  <td className="py-3">{fmt(t.amount)}</td>
                  <td className="py-3">
                    <PaymentStatusBadge status={t.status} />
                  </td>
                  <td className="py-3 text-[10px] font-black uppercase text-slate-500">{t.provider}</td>
                  <td className="py-3 text-xs text-slate-500">{t.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  )
}

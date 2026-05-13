import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  DateRangeFilter,
  ExportButton,
  FinanceSubnav,
  IntelligencePageSkeleton,
  PaymentStatusBadge,
} from '@/components/intelligence'
import EmptyState from '@/components/dashboard/EmptyState'
import { CreditCard } from 'lucide-react'
import { fetchFinancePayments } from '@/api/financeApi'
import { seedFinancePayments } from '@/data/intelligenceSeed'
import type { FinancePaymentRow, PaymentStatus } from '@/types/intelligence'

function fmt(n: number) {
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n) + ' ر.س'
}

export default function FinancePaymentsPage() {
  const [rows, setRows] = useState<FinancePaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all')
  const [range, setRange] = useState({ from: '2026-01-01', to: '2026-06-30' })
  const [applied, setApplied] = useState(range)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const params = {
          from: applied.from,
          to: applied.to,
          ...(status !== 'all' ? { status } : {}),
        }
        const d = await fetchFinancePayments(params)
        if (!cancelled) setRows(d)
      } catch {
        if (!cancelled) setRows(seedFinancePayments())
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applied, status])

  const filtered = useMemo(() => {
    if (status === 'all') return rows
    return rows.filter((r) => r.status === status)
  }, [rows, status])

  if (loading) return <IntelligencePageSkeleton />

  return (
    <div className="space-y-8">
      <header className="text-right">
        <h1 className="text-2xl font-black text-deepBlue">المدفوعات</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">جدول المنظّف بحالة الدفع ومزود الخدمة</p>
      </header>
      <FinanceSubnav />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <ExportButton label="Excel placeholder" onClick={() => {}} />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus | 'all')}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-deepBlue"
          >
            <option value="all">كل الحالات</option>
            <option value="confirmed">المدفوعات الناجحة</option>
            <option value="pending">المدفوعات المعلقة</option>
            <option value="failed">المدفوعات الفاشلة</option>
            <option value="refunded">مستردة</option>
          </select>
        </div>
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange} onApply={() => setApplied(range)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="لا مدفوعات" />
      ) : (
        <motion.div layout className="overflow-x-auto rounded-[1.35rem] bg-white p-4 shadow-lg ring-1 ring-deepBlue/[0.06]">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400">
              <tr>
                <th className="py-3">#</th>
                <th className="py-3">المبلغ</th>
                <th className="py-3">الحالة</th>
                <th className="py-3">Stripe / PayPal / Fake</th>
                <th className="py-3">الدورة</th>
                <th className="py-3">البريد</th>
                <th className="py-3">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 font-semibold text-deepBlue">
                  <td className="py-3">{p.id}</td>
                  <td className="py-3">{fmt(p.amount)}</td>
                  <td className="py-3">
                    <PaymentStatusBadge status={p.status} />
                  </td>
                  <td className="py-3">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                      {p.provider}
                    </span>
                  </td>
                  <td className="py-3 text-xs">{p.course_name}</td>
                  <td className="py-3 text-xs text-slate-500">{p.payer_email}</td>
                  <td className="py-3 text-xs text-slate-500">{p.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  )
}

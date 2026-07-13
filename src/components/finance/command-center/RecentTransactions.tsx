import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatFinanceCurrencyInteger, FINANCE_ACCOUNT_EMPTY_LABEL } from '@/utils/financeFormatters'
import PaymentStatusBadge from '@/components/intelligence/PaymentStatusBadge'
import type { FinancePaymentRow, PaymentStatus } from '@/types/intelligence'
import { providerLabelAr } from './chartConfig'
import { SectionShell } from './shared'

const PAGE_SIZE = 8

export default function RecentTransactions({
  payments,
  financeBase,
}: {
  payments: FinancePaymentRow[]
  financeBase: string
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | PaymentStatus>('all')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return payments.filter((p) => {
      if (status !== 'all' && p.status !== status) return false
      if (!q) return true
      const hay = `${p.student_name} ${p.item_title} ${p.course_name} ${p.provider} ${p.id}`.toLowerCase()
      return hay.includes(q)
    })
  }, [payments, query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const slice = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <SectionShell
      eyebrow="المعاملات"
      title="أحدث المعاملات"
      subtitle="بحث وتصفية وعرض تفصيلي"
      action={
        <Link
          to={`${financeBase}/transactions`}
          className="text-[11px] font-black text-brand-600 hover:underline"
        >
          عرض الكل
        </Link>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0) }}
            placeholder="بحث بالطالب أو الدورة..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-[12px] font-semibold outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {(['all', 'confirmed', 'pending', 'failed', 'refunded'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatus(s); setPage(0) }}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-black transition ${
                status === s ? 'bg-deepBlue text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {s === 'all' ? 'الكل' : s === 'confirmed' ? 'مؤكد' : s === 'pending' ? 'معلق' : s === 'failed' ? 'فاشل' : 'مسترد'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {['الحالة', 'المبلغ', 'العملة', 'الحساب', 'المزود', 'الطالب', 'الدورة', 'التاريخ', ''].map((h) => (
                <th key={h} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {slice.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="transition hover:bg-brand-50/30"
              >
                <td className="px-3 py-3">
                  <PaymentStatusBadge status={p.status} />
                </td>
                <td className="px-3 py-3 font-latin text-[12px] font-black tabular-nums whitespace-nowrap text-deepBlue" dir="ltr">
                  {formatFinanceCurrencyInteger(p.amount)}
                </td>
                <td className="px-3 py-3 font-latin text-[11px] font-bold text-slate-500">{p.currency ?? 'EUR'}</td>
                <td className="px-3 py-3 text-[11px] font-semibold text-slate-400">{FINANCE_ACCOUNT_EMPTY_LABEL}</td>
                <td className="px-3 py-3 text-[11px] font-bold text-slate-600">{providerLabelAr(p.provider)}</td>
                <td className="px-3 py-3 text-[11px] font-bold text-deepBlue">{p.student_name ?? p.payer_email ?? '—'}</td>
                <td className="max-w-[120px] truncate px-3 py-3 text-[11px] font-semibold text-slate-500">
                  {p.item_title ?? p.course_name ?? '—'}
                </td>
                <td className="px-3 py-3">
                  <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap tabular-nums" dir="ltr">
                    <FinanceDate value={p.created_at} showTime />
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Link
                    to={`${financeBase}/payments`}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600 hover:bg-brand-100 hover:text-brand-700"
                  >
                    <Eye size={11} />
                    عرض
                  </Link>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {slice.length === 0 && (
          <div className="py-12 text-center text-sm font-bold text-slate-400">لا توجد معاملات مطابقة</div>
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-400">
            {filtered.length} معاملة · صفحة {page + 1} من {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}
    </SectionShell>
  )
}

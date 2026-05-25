import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Clock3,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import { DateRangeFilter, FinanceSubnav, PaymentStatusBadge } from '@/components/intelligence'
import { fetchFinanceTransactions } from '@/api/financeApi'

import type { FinanceTransactionRow, PaymentProvider, PaymentStatus } from '@/types/intelligence'
import {
  ProviderBadge,
  downloadCsv,
  financeFadeUp,
  financeMotionContainer,
  formatFinanceCurrency,
  formatFinanceDateTime,
  providerLabelAr,
} from '@/components/finance/financeTablesShared'
import { FinancePageKpiCard } from '@/components/finance/FinancePageKpiCard'

type TxShapeFilter = 'all' | 'credit' | 'debit' | 'refunded'

function TransactionTypeBadge({ row }: { row: FinanceTransactionRow }) {
  if (row.status === 'refunded')
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-800 ring-1 ring-slate-200">
        استرداد
      </span>
    )
  if (row.type === 'credit')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-800 ring-1 ring-emerald-100">
        <ArrowUpRight size={12} aria-hidden />
        إيداع
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-800 ring-1 ring-rose-100">
      <ArrowDownLeft size={12} aria-hidden />
      خصم
    </span>
  )
}

function TxActionsCell() {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        className="rounded-xl border border-deepBlue/[0.08] bg-white px-3 py-1.5 text-[11px] font-black text-customBlue shadow-sm transition hover:border-brand-400/35 hover:bg-brand-500/5 hover:shadow-emc-xs"
      >
        تفاصيل
      </button>
    </div>
  )
}

export default function FinanceTransactionsPage() {
  const [allRows, setAllRows] = useState<FinanceTransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(false)

  const [range, setRange] = useState({ from: '2026-01-01', to: '2026-06-30' })
  const [applied, setApplied] = useState(range)

  const [shape, setShape] = useState<TxShapeFilter>('all')
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all')
  const [provider, setProvider] = useState<PaymentProvider | 'all'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadErr(false)
    ;(async () => {
      try {
        const d = await fetchFinanceTransactions({ from: applied.from, to: applied.to })
        if (!cancelled) setAllRows(Array.isArray(d) ? d : [])
      } catch {
        if (!cancelled) {
          setAllRows([])
          setLoadErr(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applied])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRows.filter((t) => {
      if (shape === 'credit' && !(t.type === 'credit' && t.status !== 'refunded')) return false
      if (shape === 'debit' && !(t.type === 'debit' && t.status !== 'refunded')) return false
      if (shape === 'refunded' && t.status !== 'refunded') return false

      if (status !== 'all' && t.status !== status) return false
      if (provider !== 'all' && String(t.provider).toLowerCase() !== String(provider).toLowerCase()) return false

      if (!q) return true
      const blob = `${t.label} ${t.id} ${t.amount}`.toLowerCase()
      return blob.includes(q)
    })
  }, [allRows, shape, status, provider, search])

  const kpis = useMemo(() => {
    const total = allRows.length
    const deposits = allRows.filter((t) => t.type === 'credit').reduce((a, t) => a + (Number(t.amount) || 0), 0)
    const withdrawals = allRows.filter((t) => t.type === 'debit').reduce((a, t) => a + (Number(t.amount) || 0), 0)
    const refunds = allRows.filter((t) => t.status === 'refunded').length
    const pending = allRows.filter((t) => t.status === 'pending').length
    return { total, deposits, withdrawals, refunds, pending }
  }, [allRows])

  function exportExcel() {
    const headers = [
      'رقم المعاملة',
      'البيان',
      'النوع المعروض',
      'المبلغ (EUR)',
      'الحالة',
      'المزود',
      'التاريخ',
    ]
    const data = filteredRows.map((t) => {
      let kind = t.type === 'credit' ? 'إيداع' : 'خصم'
      if (t.status === 'refunded') kind = 'استرداد'
      return [
        t.id,
        t.label,
        kind,
        formatFinanceCurrency(t.amount),
        t.status,
        providerLabelAr(t.provider),
        t.created_at,
      ]
    })
    downloadCsv(`emc-transactions-${applied.from}_${applied.to}`, headers, data)
  }

  return (
    <div dir="rtl" className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      <FinanceSubnav />

      <motion.div initial="hidden" animate="show" variants={financeMotionContainer} className="mt-10 space-y-8">
        <motion.div variants={financeFadeUp} className="text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-600">دفتر الأستاذ</p>
          <h1 className="mt-2 text-2xl font-black text-deepBlue sm:text-3xl">المعاملات</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
            تتبع حركة الخصم والإيداع والاسترداد
          </p>
        </motion.div>

        {loadErr ?
          <motion.div
            variants={financeFadeUp}
            className="flex items-center justify-end gap-2 rounded-3xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm font-bold text-amber-900 ring-1 ring-amber-100"
            role="status"
          >
            <AlertCircle size={18} aria-hidden />
            تعذّر تحميل المعاملات المالية من الخادم. تحقق من الاتصال وأعد المحاولة.
          </motion.div>
        : null}

        <motion.div variants={financeMotionContainer} className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <FinancePageKpiCard icon={Banknote} label="إجمالي المعاملات" value={String(kpis.total)} accent="blue" />
          <FinancePageKpiCard
            icon={ArrowUpRight}
            label="إجمالي الإيداعات"
            value={formatFinanceCurrency(kpis.deposits)}
            accent="blue"
          />
          <FinancePageKpiCard
            icon={ArrowDownLeft}
            label="إجمالي الخصومات"
            value={formatFinanceCurrency(kpis.withdrawals)}
            accent="orange"
          />
          <FinancePageKpiCard icon={RefreshCw} label="الاستردادات" value={String(kpis.refunds)} sub="عدد العمليات" accent="orange" />
          <FinancePageKpiCard icon={Clock3} label="المعاملات المعلقة" value={String(kpis.pending)} accent="blue" className="xl:col-span-2" />
        </motion.div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4, ease: [0.22, 0.61, 0.36, 1] as const }}
        className="mt-10 rounded-3xl border border-deepBlue/[0.06] bg-white/90 p-5 shadow-sm ring-1 ring-deepBlue/[0.03] md:p-6"
      >
        <div className="border-b border-slate-100 pb-5 text-right">
          <h2 className="text-sm font-black text-deepBlue">التصفية والتصدير</h2>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1.5 text-right text-[11px] font-black text-deepBlue">
              نوع الحركة
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value as TxShapeFilter)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-deepBlue shadow-inner shadow-slate-100/80 focus:border-brand-400/55 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="all">كل الأنواع</option>
                <option value="credit">إيداع</option>
                <option value="debit">خصم</option>
                <option value="refunded">استرداد</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-right text-[11px] font-black text-deepBlue">
              الحالة
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentStatus | 'all')}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-deepBlue shadow-inner shadow-slate-100/80 focus:border-brand-400/55 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="all">كل الحالات</option>
                <option value="confirmed">مؤكدة</option>
                <option value="pending">معلقة</option>
                <option value="failed">فاشلة</option>
                <option value="refunded">مستردة</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-right text-[11px] font-black text-deepBlue">
              المزوّد
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as PaymentProvider | 'all')}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-deepBlue shadow-inner shadow-slate-100/80 focus:border-brand-400/55 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="all">كل المزوّدين</option>
                <option value="stripe">سترايب</option>
                <option value="paypal">باي بال</option>
                <option value="fake">تجريبي</option>
              </select>
            </label>
            <div className="sm:col-span-2 xl:col-span-1">
              <label className="grid gap-1.5 text-right text-[11px] font-black text-deepBlue">
                بحث (بيان / مبلغ / رقم)
                <span className="relative">
                  <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث…"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pe-11 ps-3 text-sm font-semibold text-[#0F172A] shadow-inner shadow-slate-100/80 placeholder:text-slate-400 focus:border-brand-400/55 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </span>
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-end gap-3">
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-l from-deepBlue to-brand-600 px-4 text-[12px] font-black text-white shadow-emc-md transition hover:-translate-y-px disabled:opacity-50"
              disabled={filteredRows.length === 0}
            >
              <FileSpreadsheet size={17} aria-hidden />
              تصدير Excel (CSV)
            </button>
            <DateRangeFilter from={range.from} to={range.to} onChange={setRange} onApply={() => setApplied(range)} />
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.42, ease: [0.22, 0.61, 0.36, 1] as const }}
        className="mt-8 overflow-hidden rounded-3xl border border-deepBlue/[0.06] bg-white/90 shadow-sm ring-1 ring-deepBlue/[0.03]"
      >
        {loading ?
          <div className="flex items-center justify-center gap-3 py-20 text-sm font-bold text-slate-500">
            <Loader2 className="size-5 animate-spin text-customBlue" aria-hidden />
            جاري تحميل المعاملات…
          </div>
        : filteredRows.length === 0 ?
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Banknote size={26} />
            </div>
            <p className="mt-4 text-sm font-black text-deepBlue">لا توجد معاملات مطابقة</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">اضبط الفلاتر أو امتد الفترة الزمنية.</p>
          </div>
        : (
          <div className="max-h-[min(70vh,720px)] overflow-auto">
            <table className="w-full min-w-[920px] border-collapse text-right text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 text-[10px] font-black uppercase tracking-wide text-slate-400 shadow-sm backdrop-blur-sm">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">رقم المعاملة</th>
                  <th className="px-4 py-3">البيان</th>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3 font-latin">المبلغ</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">المزود</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.35), duration: 0.25 }}
                    className="group border-b border-slate-50 font-semibold transition-colors hover:bg-brand-500/[0.04]"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-latin tabular-nums text-slate-600">{t.id}</td>
                    <td className="max-w-[260px] px-4 py-2.5 text-xs text-deepBlue">{t.label}</td>
                    <td className="px-4 py-2.5">
                      <TransactionTypeBadge row={t} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-latin text-sm font-black tabular-nums text-[#0F172A]">
                      {formatFinanceCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <PaymentStatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <ProviderBadge provider={t.provider} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold text-slate-500 font-latin">
                      {formatFinanceDateTime(t.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <TxActionsCell />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredRows.length > 0 ?
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-right text-[11px] font-bold text-slate-500">
            عرض {filteredRows.length} من أصل {allRows.length} للفترة
          </div>
        : null}
      </motion.section>
    </div>
  )
}

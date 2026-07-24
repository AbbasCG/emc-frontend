import { useMemo, useState } from 'react'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatFinanceCurrencyInteger } from '@/utils/financeFormatters'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CreditCard, Search } from 'lucide-react'
import PaymentStatusBadge from '@/components/intelligence/PaymentStatusBadge'
import type { FinancePaymentRow, PaymentStatus } from '@/types/intelligence'

const PROVIDER_LABEL: Record<string, string> = {
  stripe: 'سترايب',
  paypal: 'باي بال',
  fake: 'تجريبي',
}

function fmt(n: number) {
  return formatFinanceCurrencyInteger(n)
}

const FILTERS: { id: 'all' | PaymentStatus; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'confirmed', label: 'مؤكدة' },
  { id: 'pending', label: 'معلقة' },
  { id: 'failed', label: 'فاشلة' },
  { id: 'refunded', label: 'مستردة' },
]

export default function FinancePaymentsActivity({
  payments,
  paymentsHref,
}: {
  payments: FinancePaymentRow[]
  paymentsHref: string
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | PaymentStatus>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return payments.filter((p) => {
      if (status !== 'all' && p.status !== status) return false
      if (!q) return true
      const hay =
        `${p.course_name ?? ''} ${p.payer_email ?? ''} ${p.provider} ${p.id}`
          .toLowerCase()
      return hay.includes(q)
    })
  }, [payments, query, status])

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
      className="rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.9] shadow-emc-md ring-1 ring-deepBlue/[0.04] backdrop-blur-sm"
    >
      <div className="border-b border-slate-100 p-6 text-right">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-brand-600">النشاط</p>
            <h3 className="mt-1 text-lg font-black text-deepBlue">سجل مدفوعات حديث</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">من أحدث المدفوعات المعروضة في ملخص لوحة التحكم</p>
          </div>
          <Link
            to={paymentsHref}
            className="shrink-0 rounded-2xl bg-deepBlue/[0.04] px-4 py-2 text-[11px] font-black text-customBlue ring-1 ring-deepBlue/[0.08] transition hover:bg-white hover:shadow-emc-xs"
          >
            عرض الكل
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              dir="rtl"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث عن دورة، بريد، مزود…"
              className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 pe-11 ps-4 text-sm font-semibold text-deepBlue shadow-inner shadow-slate-100/80 placeholder:text-slate-400 focus:border-brand-400/55 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              aria-label="بحث في المدفوعات"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {FILTERS.map((f) => {
              const active = status === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatus(f.id)}
                  className={[
                    'rounded-xl px-3 py-2 text-[11px] font-black transition',
                    active ?
                      'bg-gradient-to-l from-brand-500 to-brand-600 text-white shadow-emc-glow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/90',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <ul className="divide-y divide-slate-100 p-2" role="list">
        {filtered.length === 0 ?
          <li className="rounded-2xl px-4 py-12 text-center text-sm font-bold text-slate-500">
            لا توجد نتائج مطابقة.
          </li>
        : filtered.map((p, i) => (
          <motion.li
            key={p.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.36), duration: 0.3 }}
            whileHover={{ backgroundColor: 'rgba(0,119,182,0.06)' }}
            className="group rounded-2xl px-4 py-3.5 transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-700 ring-1 ring-brand-500/15 transition group-hover:shadow-emc-xs">
                  <CreditCard size={18} aria-hidden />
                </span>
                <div className="text-right">
                  <p className="line-clamp-1 text-sm font-black text-deepBlue">
                    {p.course_name || 'عملية بدون عنوان دورة'}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500 font-latin">
                    {p.payer_email || `معرّف #${p.id}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-deepBlue/[0.05] px-2.5 py-1 text-[10px] font-black uppercase text-deepBlue ring-1 ring-deepBlue/[0.08]">
                  {PROVIDER_LABEL[p.provider.toLowerCase()] ?? p.provider}
                </span>
                <PaymentStatusBadge status={p.status} />
                <span className="min-w-[6.5rem] text-left font-latin text-sm font-black tabular-nums whitespace-nowrap text-deepBlue md:text-end" dir="ltr">
                  {fmt(p.amount)}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-bold text-slate-400 whitespace-nowrap tabular-nums" dir="ltr">
              <FinanceDate value={p.created_at} showTime />
            </p>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  )
}

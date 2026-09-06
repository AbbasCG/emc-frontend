import { motion } from 'framer-motion'
import {
  Bell,
  Calendar,
  ChevronDown,
  Download,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import FinanceDate from '@/components/finance/FinanceDate'
import type { FinanceCurrency } from './types'

type Props = {
  displayName: string
  roleLabel: string
  lastSync: Date | null
  loading: boolean
  periodLabel: string
  currency: FinanceCurrency
  onPeriodChange: (p: 'month' | 'quarter' | 'year') => void
  onCurrencyChange: (c: FinanceCurrency) => void
  onRefresh: () => void
  onExport: () => void
}

const PERIODS = [
  { id: 'month' as const, label: 'هذا الشهر' },
  { id: 'quarter' as const, label: 'هذا الربع' },
  { id: 'year' as const, label: 'هذه السنة' },
]

const CURRENCIES: FinanceCurrency[] = ['EUR', 'USD', 'SAR']

export default function FinanceHeader({
  displayName,
  roleLabel,
  lastSync,
  loading,
  periodLabel,
  currency,
  onPeriodChange,
  onCurrencyChange,
  onRefresh,
  onExport,
}: Props) {
  const today = new Date()
  const syncAt = lastSync ?? null

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-2xl border border-deepBlue/[0.08] bg-gradient-to-l from-deepBlue via-[#1a3a55] to-brand-600 px-5 py-5 text-white shadow-[0_12px_40px_-16px_rgba(12,42,75,0.45)] sm:px-6 sm:py-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-accent-400/15 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/12 backdrop-blur-sm ring-1 ring-white/20">
            <Wallet size={22} />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[11px] font-bold text-white/55">مركز التحكم المالي · EMC</p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">مدير المالية</h1>
            <p className="mt-1 text-[13px] font-semibold text-white/70">
              {displayName} · {roleLabel}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-white/50">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} />
                <FinanceDate value={today} />
              </span>
              <span>آخر مزامنة: <FinanceDate value={syncAt} showTime /></span>
              <span>الفترة: {periodLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as FinanceCurrency)}
              className="appearance-none rounded-xl border border-white/15 bg-white/10 py-2 pl-8 pr-3 text-[12px] font-black backdrop-blur-sm transition hover:bg-white/15"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} className="text-deepBlue">
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60" />
          </div>

          <div className="flex rounded-xl border border-white/15 bg-white/8 p-0.5 backdrop-blur-sm">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPeriodChange(p.id)}
                className="rounded-lg px-3 py-1.5 text-[11px] font-black text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label="إشعارات"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/15"
          >
            <Bell size={16} />
          </button>

          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-black transition hover:bg-white/15"
          >
            <Download size={14} />
            تصدير
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-deepBlue shadow-sm transition hover:bg-white/95 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>
      </div>
    </motion.header>
  )
}

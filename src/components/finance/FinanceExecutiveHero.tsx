import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, CreditCard } from 'lucide-react'
import FinanceAnimatedNumber from './FinanceAnimatedNumber'

const heroMotion = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: [0.22, 0.61, 0.36, 1] as const },
  },
}

export default function FinanceExecutiveHero({
  displayName,
  roleLabel,
  totalRevenue,
  confirmedRevenue,
  growthPct,
  activePreviewTx,
  formatCurrency,
  paymentsHref,
}: {
  displayName: string
  roleLabel: string
  totalRevenue: number
  confirmedRevenue: number
  growthPct: number | null
  activePreviewTx: number
  formatCurrency: (n: number) => string
  paymentsHref: string
}) {
  const growthPositive = growthPct !== null ? growthPct >= 0 : true

  return (
    <motion.header
      initial="hidden"
      animate="show"
      variants={heroMotion}
      className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-bl from-deepBlue via-[#1b2f45] to-[#0f1b2b] px-7 py-9 text-right shadow-emc-lg ring-1 ring-white/[0.07]"
    >
      <div aria-hidden className="pointer-events-none absolute -left-28 top-0 h-64 w-64 rounded-full bg-customBlue/35 blur-[100px]" />
      <div aria-hidden className="pointer-events-none absolute -right-16 bottom-0 h-52 w-52 rounded-full bg-customOrange/20 blur-[90px]" />
      <motion.div
        aria-hidden
        animate={{ y: [0, -12, 0], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-[12%] top-[18%] h-28 w-28 rounded-[2rem] border border-white/10 bg-white/[0.04]"
      />
      <motion.div
        aria-hidden
        animate={{ rotate: [-6, 4, -6], scale: [1, 1.02, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute bottom-[-8%] right-[8%] h-36 w-36 rounded-full border border-customBlue/20 bg-customBlue/[0.07]"
      />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-white/45">محرك العمليات المالية</p>
          <h1 className="mt-3 text-[1.65rem] font-black leading-snug tracking-tight text-white sm:text-3xl">
            مرحبًا، {displayName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold text-white/55">
            <span>{roleLabel}</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:inline" aria-hidden />
            <span>إليك ملخص الأداء المالي للفترة المحددة</span>
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.07] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/45">إجمالي التحصيل</p>
              <p className="mt-1 text-xl font-black text-white drop-shadow-[0_0_24px_rgba(38,145,194,0.35)]">
                <FinanceAnimatedNumber value={totalRevenue} format={formatCurrency} />
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/45">المدفوعات المؤكدة</p>
              <p className="mt-1 text-xl font-black text-brand-100">
                <FinanceAnimatedNumber value={confirmedRevenue} format={formatCurrency} />
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
              <p className="flex items-center justify-end gap-1.5 text-[10px] font-black uppercase tracking-wide text-white/45">
                نمو بين الشهرين الأخيرين
                {growthPct !== null &&
                  (growthPositive ?
                    <ArrowUpRight size={13} className="text-accent-400" aria-hidden />
                  : <ArrowDownLeft size={13} className="text-rose-300" aria-hidden />)}
              </p>
              <p className="mt-1 text-xl font-black text-white tabular-nums font-latin">
                {growthPct === null ?
                  '—'
                : `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}٪`}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <Link
              to={paymentsHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-[12px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:bg-white/[0.16] hover:shadow-emc-sm"
            >
              <CreditCard size={17} aria-hidden />
              إدارة المدفوعات
              <ChevronLeft size={16} aria-hidden />
            </Link>
          </div>
        </div>

        <div className="relative rounded-[1.35rem] border border-customBlue/25 bg-gradient-to-br from-customBlue/20 via-transparent to-customOrange/10 p-[1px] shadow-[0_28px_60px_-30px_rgba(38,145,194,0.85)] backdrop-blur-md">
          <div className="rounded-[1.3rem] bg-deepBlue/40 p-6 ring-1 ring-white/10">
            <p className="text-xs font-black text-white/70">لقطة تنفيذية</p>
            <p className="mt-3 text-3xl font-black leading-none text-white tabular-nums font-latin">
              <FinanceAnimatedNumber value={totalRevenue} format={formatCurrency} />
            </p>
            <p className="mt-2 text-[11px] font-bold text-white/50">صافي الإيرادات المعروضة للفترة</p>
            <dl className="mt-8 space-y-4 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between gap-4 text-sm font-bold">
                <dt className="text-white/45">معاملات فعالة (عيّنة)</dt>
                <dd className="rounded-lg bg-customBlue/25 px-2.5 py-1 tabular-nums font-latin text-white">
                  {activePreviewTx}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm font-bold">
                <dt className="text-white/45">معدل التحصيل المؤكد</dt>
                <dd className="text-accent-300 tabular-nums font-latin">
                  {totalRevenue > 0 ? `${Math.round((confirmedRevenue / totalRevenue) * 100)}٪` : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </motion.header>
  )
}

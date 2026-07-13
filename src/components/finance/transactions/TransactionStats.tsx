import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Clock3, RotateCcw, TrendingUp, WalletCards } from 'lucide-react'
import { formatFinanceCount } from '@/utils/financeFormatters'
import type { TransactionSummaryStats } from './deriveStats'
import { formatTxAmountCompact } from './formatters'

type CardDef = {
  icon: LucideIcon
  label: string
  value: string
  sub: string
  accent: string
}

function StatCard({ card, index }: { card: CardDef; index: number }) {
  const reduce = useReducedMotion()
  const Icon = card.icon
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.05 }}
      whileHover={reduce ? undefined : { y: -2 }}
      className="flex h-full flex-col rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.12)] transition-shadow duration-200 hover:shadow-[0_12px_28px_-14px_rgba(15,23,42,0.16)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${card.accent}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <p className="mt-4 text-[11px] font-black text-[#64748B]">{card.label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-[#0F172A]" dir="ltr">
        {card.value}
      </p>
      <p className="mt-1 text-[10px] font-semibold text-[#94A3B8]">{card.sub}</p>
    </motion.article>
  )
}

function StatSkeleton() {
  return <div className="h-28 animate-pulse rounded-[18px] bg-slate-200/70" />
}

export default function TransactionStats({
  stats,
  loading,
}: {
  stats: TransactionSummaryStats | null
  loading: boolean
}) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    )
  }

  const cards: CardDef[] = [
    {
      icon: WalletCards,
      label: 'إجمالي المعاملات',
      value: formatFinanceCount(stats.totalCount),
      sub: 'عدد السجلات في النتائج المصفّاة',
      accent: 'bg-[#2691C2]/10 text-[#2691C2]',
    },
    {
      icon: TrendingUp,
      label: 'إجمالي الإيرادات',
      value: formatTxAmountCompact(stats.revenueTotal),
      sub: 'مجموع الإيرادات المؤكدة',
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: Clock3,
      label: 'المدفوعات المعلقة',
      value: formatFinanceCount(stats.pendingCount),
      sub: stats.pendingTotal > 0 ? `بقيمة ${formatTxAmountCompact(stats.pendingTotal)}` : 'لا توجد مبالغ معلقة',
      accent: 'bg-amber-50 text-amber-600',
    },
    {
      icon: RotateCcw,
      label: 'المبالغ المستردة',
      value: formatFinanceCount(stats.refundedCount),
      sub: stats.refundedTotal > 0 ? `بقيمة ${formatTxAmountCompact(stats.refundedTotal)}` : 'لا توجد استردادات',
      accent: 'bg-violet-50 text-violet-600',
    },
  ]

  return (
    <section aria-label="ملخص المعاملات" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <StatCard key={card.label} card={card} index={i} />
      ))}
    </section>
  )
}

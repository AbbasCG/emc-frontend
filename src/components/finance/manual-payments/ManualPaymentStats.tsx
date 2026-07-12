import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { BadgeCheck, Ban, Clock3, HandCoins } from 'lucide-react'
import type { ManualPaymentSummaryStats } from './deriveStats'
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
      className="flex h-full min-h-[7.5rem] flex-col rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.12)]"
    >
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${card.accent}`}>
        <Icon className="h-5 w-5" aria-hidden />
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

export default function ManualPaymentStats({
  stats,
  loading,
}: {
  stats: ManualPaymentSummaryStats | null
  loading: boolean
}) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    )
  }

  const cards: CardDef[] = [
    {
      icon: HandCoins,
      label: 'إجمالي المدفوعات اليدوية',
      value: stats.totalCount.toLocaleString('ar'),
      sub: 'عدد السجلات في النتائج المصفّاة',
      accent: 'bg-[#2691C2]/10 text-[#2691C2]',
    },
    {
      icon: HandCoins,
      label: 'إجمالي المبالغ',
      value: formatTxAmountCompact(stats.totalAmount),
      sub: 'مجموع المبالغ المدفوعة',
      accent: 'bg-[#22334A]/8 text-[#22334A]',
    },
    {
      icon: Clock3,
      label: 'بانتظار المراجعة',
      value: stats.pendingCount.toLocaleString('ar'),
      sub: stats.pendingAmount > 0 ? `بقيمة ${formatTxAmountCompact(stats.pendingAmount)}` : 'لا توجد دفعات معلقة',
      accent: 'bg-amber-50 text-amber-600',
    },
    {
      icon: BadgeCheck,
      label: 'المدفوعات المعتمدة',
      value: stats.confirmedCount.toLocaleString('ar'),
      sub: stats.confirmedAmount > 0 ? `بقيمة ${formatTxAmountCompact(stats.confirmedAmount)}` : 'لا توجد دفعات معتمدة',
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: Ban,
      label: 'المدفوعات المرفوضة',
      value: stats.rejectedCount.toLocaleString('ar'),
      sub: stats.rejectedAmount > 0 ? `بقيمة ${formatTxAmountCompact(stats.rejectedAmount)}` : 'لا توجد دفعات مرفوضة',
      accent: 'bg-rose-50 text-rose-600',
    },
  ]

  return (
    <section aria-label="ملخص المدفوعات اليدوية" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card, i) => (
        <StatCard key={card.label} card={card} index={i} />
      ))}
    </section>
  )
}

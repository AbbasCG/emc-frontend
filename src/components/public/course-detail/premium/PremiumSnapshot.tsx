import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatPublicText } from '@/utils/publicDetailFormat'
import type { MetricWidget } from '@/components/public/course-detail/CourseDetailMetricsDashboard'

const accentStyles = {
  blue: {
    card: 'border-[#0077B6]/14 bg-[#0077B6]/5 hover:border-[#0077B6]/28',
    icon: 'bg-[#0077B6]/10 text-[#0077B6]',
    value: 'text-[#1e7aaa]',
  },
  orange: {
    card: 'border-[#F28C00]/16 bg-[#F28C00]/5 hover:border-[#F28C00]/32',
    icon: 'bg-[#F28C00]/10 text-[#F28C00]',
    value: 'text-[#c07828]',
  },
  navy: {
    card: 'border-[#0C2A4B]/10 bg-[#0C2A4B]/4 hover:border-[#0C2A4B]/20',
    icon: 'bg-[#0C2A4B]/8 text-[#0C2A4B]',
    value: 'text-[#0C2A4B]',
  },
  green: {
    card: 'border-emerald-200/50 bg-emerald-50/60 hover:border-emerald-300/60',
    icon: 'bg-emerald-100 text-emerald-700',
    value: 'text-emerald-800',
  },
} as const

type Props = { items: MetricWidget[] }

export default function PremiumSnapshot({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section
      aria-label="ملخص الدورة"
      dir="rtl"
      className="border-b border-[#0C2A4B]/8 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-[88rem]">
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide sm:gap-2.5 lg:flex-wrap lg:overflow-visible">
          {items.map((item, i) => {
            const a = accentStyles[item.accent ?? 'blue']
            const Icon = item.icon
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.28 }}
                className={cn(
                  'flex shrink-0 cursor-default items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-right transition-all',
                  a.card,
                )}
              >
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', a.icon)}>
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-[12px] font-black tabular-nums leading-tight', a.value)}>
                    {formatPublicText(item.value)}
                  </p>
                  <p className="truncate text-[9.5px] font-semibold text-slate-500">{item.label}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatPublicText } from '@/utils/publicDetailFormat'
import type { MetricWidget } from '@/components/public/course-detail/CourseDetailMetricsDashboard'

const accentStyles = {
  blue: {
    card: 'border-[#2691C2]/14 bg-[#2691C2]/5 hover:border-[#2691C2]/28',
    icon: 'bg-[#2691C2]/10 text-[#2691C2]',
    value: 'text-[#1e7aaa]',
  },
  orange: {
    card: 'border-[#EC943C]/16 bg-[#EC943C]/5 hover:border-[#EC943C]/32',
    icon: 'bg-[#EC943C]/10 text-[#EC943C]',
    value: 'text-[#c07828]',
  },
  navy: {
    card: 'border-[#22334A]/10 bg-[#22334A]/4 hover:border-[#22334A]/20',
    icon: 'bg-[#22334A]/8 text-[#22334A]',
    value: 'text-[#22334A]',
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
      className="border-b border-[#22334A]/8 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-6 lg:px-10"
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

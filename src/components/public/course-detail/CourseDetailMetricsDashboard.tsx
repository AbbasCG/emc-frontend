import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MetricWidget = {
  id: string
  icon: LucideIcon
  label: string
  value: string
  accent?: 'blue' | 'orange' | 'navy' | 'green'
}

const accentMap = {
  blue: 'border-customBlue/15 from-customBlue/[0.06] text-customBlue',
  orange: 'border-customOrange/18 from-customOrange/[0.06] text-customOrange',
  navy: 'border-deepBlue/10 from-deepBlue/[0.05] text-deepBlue',
  green: 'border-emerald-200/60 from-emerald-50/70 text-emerald-700',
} as const

export default function CourseDetailMetricsDashboard({ items }: { items: MetricWidget[] }) {
  if (items.length === 0) return null

  return (
    <section
      aria-label="مؤشرات سريعة"
      className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-5"
    >
      {items.map((item) => {
        const Icon = item.icon
        const accent = accentMap[item.accent ?? 'blue']
        return (
          <div
            key={item.id}
            className={cn(
              'flex h-[72px] max-h-[80px] items-center gap-2 rounded-2xl border bg-gradient-to-l to-white/95 px-2.5 py-2 text-right shadow-emc-xs backdrop-blur-sm transition-shadow duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:shadow-emc',
              accent,
            )}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/90 shadow-emc-inset ring-1 ring-deepBlue/5">
              <Icon className="h-3 w-3" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[8px] font-bold uppercase tracking-[0.08em] text-deepBlue/45">{item.label}</p>
              <p className="line-clamp-2 font-latin text-[10px] font-black leading-tight tabular-nums text-deepBlue">
                {item.value}
              </p>
            </div>
          </div>
        )
      })}
    </section>
  )
}

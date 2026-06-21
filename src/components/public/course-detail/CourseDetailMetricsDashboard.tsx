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
  blue: 'border-[#0077B6]/15 from-[#0077B6]/6 text-[#0077B6]',
  orange: 'border-[#F28C00]/18 from-[#F28C00]/6 text-[#F28C00]',
  navy: 'border-[#0C2A4B]/10 from-[#0C2A4B]/5 text-[#0C2A4B]',
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
              'flex h-[72px] max-h-[80px] items-center gap-2 rounded-2xl border bg-gradient-to-l to-white/95 px-2.5 py-2 text-right shadow-sm backdrop-blur-sm',
              accent,
            )}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/90 ring-1 ring-black/5">
              <Icon className="h-3 w-3" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[8px] font-bold text-[#0C2A4B]/45">{item.label}</p>
              <p className="line-clamp-2 text-[10px] font-black leading-tight tabular-nums text-[#0C2A4B]">
                {item.value}
              </p>
            </div>
          </div>
        )
      })}
    </section>
  )
}

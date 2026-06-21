import type { LucideIcon } from 'lucide-react'
import PublicDetailSection from '@/components/public/detail/PublicDetailSection'

export type TrainingStat = {
  icon: LucideIcon
  label: string
  value: string
  accent?: 'blue' | 'orange' | 'navy'
}

const accentCls = {
  blue: 'from-[#0077B6]/12 to-white text-customBlue ring-[#0077B6]/15',
  orange: 'from-[#F28C00]/12 to-white text-customOrange ring-[#F28C00]/15',
  navy: 'from-[#0C2A4B]/8 to-white text-deepBlue ring-[#0C2A4B]/10',
} as const

export default function PublicTrainingStatsSection({ stats }: { stats: TrainingStat[] }) {
  if (stats.length === 0) return null

  return (
    <PublicDetailSection id="training-stats" title="إحصائيات التدريب">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          const accent = stat.accent ?? 'blue'
          return (
            <div
              key={stat.label}
              className={`rounded-3xl bg-gradient-to-br p-5 text-right ring-1 ${accentCls[accent]}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 shadow-sm">
                  <Icon size={20} aria-hidden />
                </span>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{stat.label}</p>
              </div>
              <p className="text-lg font-black leading-snug text-deepBlue">{stat.value}</p>
            </div>
          )
        })}
      </div>
    </PublicDetailSection>
  )
}

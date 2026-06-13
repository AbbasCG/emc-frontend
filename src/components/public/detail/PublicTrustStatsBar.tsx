import type { LucideIcon } from 'lucide-react'

export type TrustStat = {
  icon: LucideIcon
  label: string
  value: string
}

export default function PublicTrustStatsBar({ stats }: { stats: TrustStat[] }) {
  if (stats.length === 0) return null

  return (
    <section
      aria-label="مؤشرات الثقة"
      className="-mt-4 relative z-10 mx-auto max-w-6xl rounded-3xl border border-slate-100 bg-white px-4 py-4 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)] ring-1 ring-slate-100 sm:px-6"
    >
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4 xl:grid-cols-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className={`flex min-w-[9.5rem] shrink-0 items-start gap-3 rounded-2xl bg-slate-50/80 p-3 sm:min-w-0 ${
                i > 0 ? 'sm:border-s sm:border-slate-100 sm:ps-4' : ''
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#2691C2]/10 text-customBlue ring-1 ring-[#2691C2]/15">
                <Icon size={18} aria-hidden />
              </span>
              <div className="min-w-0 text-right">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{stat.label}</p>
                <p className="mt-0.5 text-sm font-black leading-snug text-[#0F172A]">{stat.value}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

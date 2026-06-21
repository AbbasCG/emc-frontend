import type { LucideIcon } from 'lucide-react'

export type PublicInfoCard = {
  icon: LucideIcon
  label: string
  value: string
  accent?: 'blue' | 'orange' | 'navy'
}

export default function PublicDetailInfoCards({ items }: { items: PublicInfoCard[] }) {
  if (items.length === 0) return null

  const accentCls = {
    blue: 'bg-sky-50 text-customBlue ring-sky-100',
    orange: 'bg-orange-50 text-customOrange ring-orange-100',
    navy: 'bg-[#0C2A4B]/5 text-deepBlue ring-[#0C2A4B]/10',
  } as const

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon
        const accent = item.accent ?? 'blue'
        return (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-right"
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ${accentCls[accent]}`}
            >
              <Icon size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="mt-1 text-sm font-black leading-snug text-deepBlue">{item.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'

export type KpiItem = { label: string; value: string; hint?: string; icon: LucideIcon; tone?: 'brand' | 'accent' | 'navy' }

const TONES: Record<NonNullable<KpiItem['tone']>, string> = {
  brand: 'bg-brand-50 text-brand-600',
  accent: 'bg-accent-50 text-accent-700',
  navy: 'bg-slate-100 text-navy',
}

/** KPI strip. Only the KPIs the backend can support are passed in — never placeholders. */
export default function PointsKpiCards({ items }: { items: KpiItem[] }) {
  return (
    <section aria-label="مؤشرات نقاط الأثر" className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
      {items.map(({ label, value, hint, icon: Icon, tone = 'brand' }, index) => (
        <div
          key={label}
          className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-4 ${items.length % 2 === 1 && index === items.length - 1 ? 'col-span-2 lg:col-span-1' : ''}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-muted-500">{label}</span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
              <Icon size={16} aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2.5 truncate text-xl font-black leading-none text-navy sm:mt-3 sm:text-2xl" title={value}>{value}</p>
          {hint && <p className="mt-1.5 truncate text-[11px] font-semibold text-muted-500" title={hint}>{hint}</p>}
        </div>
      ))}
    </section>
  )
}

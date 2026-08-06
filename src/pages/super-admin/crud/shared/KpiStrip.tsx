import { cn } from '@/lib/utils'

export type KpiItem = {
  label: string
  value: string | number
  hint?: string
  tone?: 'blue' | 'orange' | 'ink' | 'slate' | 'success' | 'danger'
}

const toneBg: Record<NonNullable<KpiItem['tone']>, string> = {
  blue: 'from-brand-500/12 via-white to-white',
  orange: 'from-accent-400/18 via-white to-white',
  ink: 'from-ink-500/14 via-white to-brand-500/6',
  slate: 'from-slate-200/55 via-white to-white',
  success: 'from-emerald-200/55 via-white to-white',
  danger: 'from-red-100/60 via-white to-white',
}

const toneAccent: Record<NonNullable<KpiItem['tone']>, string> = {
  blue: 'text-customBlue ring-customBlue/20',
  orange: 'text-accent-700 ring-accent-400/25',
  ink: 'text-deepBlue ring-deepBlue/[0.12]',
  slate: 'text-slate-800 ring-slate-200',
  success: 'text-emerald-800 ring-emerald-200',
  danger: 'text-red-800 ring-red-200',
}

export function KpiCards({ items }: { items: KpiItem[] }) {
  return (
    <>
      {items.map((k) => (
        <div
          key={k.label}
          className={cn(
            'rounded-2xl border border-ink-100/90 bg-gradient-to-br p-[1px] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:shadow-[0_10px_32px_rgba(15,23,42,0.08)]',
            `bg-gradient-to-br ${toneBg[k.tone ?? 'blue']}`,
          )}
        >
          <div className="rounded-[15px] bg-white/80 p-5 text-right backdrop-blur-sm rtl:text-right">
            <p className="text-[11px] font-black text-muted-600">{k.label}</p>
            <p className={cn('mt-2 text-3xl font-black tracking-tight', toneAccent[k.tone ?? 'blue'])}>{k.value}</p>
            {k.hint ? <p className="mt-2 text-[11px] font-bold text-muted-500">{k.hint}</p> : null}
          </div>
        </div>
      ))}
    </>
  )
}

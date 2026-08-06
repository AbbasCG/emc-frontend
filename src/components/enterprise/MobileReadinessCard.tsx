import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MobileReadinessCard({
  icon: Icon,
  title,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: LucideIcon
  title: string
  value: string
  hint?: string
  tone?: 'neutral' | 'success' | 'warning'
}) {
  const ring =
    tone === 'success'
      ? 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-white'
      : tone === 'warning'
        ? 'border-amber-100 bg-gradient-to-br from-amber-50 to-white'
        : 'border-slate-100 bg-white'

  return (
    <div dir="rtl" className={cn('rounded-2xl border p-4 shadow-sm transition hover:shadow-md', ring)}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-deepBlue text-white shadow-md shadow-deepBlue/15">
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{title}</p>
          <p className="mt-1 text-lg font-black text-deepBlue">{value}</p>
          {hint && <p className="mt-2 text-xs font-medium leading-6 text-slate-500">{hint}</p>}
        </div>
      </div>
    </div>
  )
}

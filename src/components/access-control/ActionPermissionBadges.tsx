import { Check, Minus } from 'lucide-react'
import type { ActionPermissionSource, ActionPermissionSourceType } from '@/api/actionPermissionsApi'
import { cn } from '@/lib/utils'

/**
 * Presentation-only chips for action permissions («صلاحيات الإجراءات»).
 * They show what the SERVER decided; they never gate anything.
 */

const SOURCE_META: Record<ActionPermissionSourceType, { labelAr: string; cls: string }> = {
  role: { labelAr: 'من الدور', cls: 'bg-customBlue/10 text-customBlue ring-customBlue/25' },
  system: { labelAr: 'صلاحية النظام', cls: 'bg-navy text-white ring-navy/30' },
  direct_allow: { labelAr: 'منح مباشر', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  direct_deny: { labelAr: 'منع مباشر', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

export function ActionEffectiveChip({ effective }: { effective: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1',
        effective ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200',
      )}
    >
      {effective ? <Check className="h-3 w-3" aria-hidden /> : <Minus className="h-3 w-3" aria-hidden />}
      {effective ? 'فعّالة' : 'غير فعّالة'}
    </span>
  )
}

export function ActionSourceChip({ source }: { source: ActionPermissionSource }) {
  const meta = SOURCE_META[source.type]
  // The role chip carries the role's name; the other types have fixed Arabic wording.
  const text = source.type === 'role' && source.labelAr ? `${meta.labelAr}: ${source.labelAr}` : meta.labelAr

  return (
    <span
      data-source-type={source.type}
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1', meta.cls)}
    >
      {text}
    </span>
  )
}

export function ActionSourceChips({ sources }: { sources: ActionPermissionSource[] }) {
  if (sources.length === 0) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {sources.map((s, i) => (
        <ActionSourceChip key={`${s.type}-${s.labelAr}-${i}`} source={s} />
      ))}
    </span>
  )
}

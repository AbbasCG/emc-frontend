import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EMC_WIZARD_GLASS_CARD } from '@/components/emc-form-wizard/emcWizardTokens'

export type ChecklistItem = { id: string; label: string; done?: boolean }

type Props = {
  title?: string
  items: readonly ChecklistItem[]
  className?: string
}

export function FormChecklist({ title = 'قائمة الجاهزية', items, className }: Props) {
  return (
    <div className={cn(EMC_WIZARD_GLASS_CARD, 'p-5 text-right', className)} dir="rtl">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li
            key={it.id}
            className={cn(
              'flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-[12px] font-bold transition',
              it.done ?
                'border-emerald-200/90 bg-emerald-50/80 text-emerald-950'
              : 'border-slate-200/80 bg-white/90 text-slate-700',
            )}
          >
            <span className="min-w-0 flex-1 leading-snug">{it.label}</span>
            <span
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-xl border text-[11px] font-black',
                it.done ?
                  'border-emerald-300 bg-emerald-600 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-400',
              )}
            >
              {it.done ?
                <Check className="h-4 w-4" aria-hidden />
              : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

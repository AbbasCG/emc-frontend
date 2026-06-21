import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EMC_WIZARD_GLASS_CARD } from '@/components/emc-form-wizard/emcWizardTokens'

export type SummaryRow = { label: string; value: ReactNode }

type Props = {
  title?: string
  rows: SummaryRow[]
  footer?: ReactNode
  className?: string
}

export function FormSummaryPanel({ title = 'ملخص مباشر', rows, footer, className }: Props) {
  return (
    <div className={cn(EMC_WIZARD_GLASS_CARD, 'p-5 text-right', className)} dir="rtl">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F28C00]/15 text-[#F28C00] ring-1 ring-[#F28C00]/20">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">نظرة سريعة</p>
          <p className="text-sm font-black text-[#0C2A4B]">{title}</p>
        </div>
      </div>
      <ul className="space-y-2.5">
        {rows.map((r, i) => (
          <li
            key={`${r.label}-${i}`}
            className="flex flex-col gap-0.5 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 shadow-[0_8px_22px_-14px_rgba(12, 42, 75,0.2)]"
          >
            <span className="text-[10px] font-black text-slate-500">{r.label}</span>
            <span className="text-[13px] font-bold leading-snug text-[#0F172A]">{r.value}</span>
          </li>
        ))}
      </ul>
      {footer ?
        <div className="mt-4 border-t border-slate-200/80 pt-4">{footer}</div>
      : null}
    </div>
  )
}

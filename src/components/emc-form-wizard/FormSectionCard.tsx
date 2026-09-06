import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EMC_WIZARD_GLASS_CARD } from '@/components/emc-form-wizard/emcWizardTokens'

type Props = {
  title?: string
  icon?: LucideIcon
  eyebrow?: string
  children: ReactNode
  className?: string
  dense?: boolean
}

export function FormSectionCard({ title, icon: Icon, eyebrow, children, className, dense }: Props) {
  return (
    <section
      className={cn(EMC_WIZARD_GLASS_CARD, dense ? 'p-4 sm:p-5' : 'p-5 sm:p-6', 'text-right', className)}
      dir="rtl"
    >
      {eyebrow || title ?
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            {Icon ?
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0077B6]/10 text-[#0077B6] ring-1 ring-[#0077B6]/15">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
            : null}
            <div className="min-w-0">
              {eyebrow ?
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
              : null}
              {title ?
                <h3 className="text-sm font-black text-[#0C2A4B]">{title}</h3>
              : null}
            </div>
          </div>
        </div>
      : null}
      <div className="space-y-4">{children}</div>
    </section>
  )
}

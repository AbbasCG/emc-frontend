import type { ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EMC_WIZARD_GLASS_CARD } from '@/components/emc-form-wizard/emcWizardTokens'

type Props = {
  title?: string
  children: ReactNode
  className?: string
}

export function FormHelpCard({ title = 'إرشادات', children, className }: Props) {
  return (
    <div
      className={cn(
        EMC_WIZARD_GLASS_CARD,
        'border-[#2691C2]/25 bg-gradient-to-br from-[#2691C2]/[0.07] to-white p-5 text-right',
        className,
      )}
      dir="rtl"
    >
      <div className="mb-3 flex items-start gap-2">
        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#2691C2]" aria-hidden />
        <p className="text-sm font-black text-[#22334A]">{title}</p>
      </div>
      <div className="space-y-2 text-[12px] font-semibold leading-relaxed text-slate-700">{children}</div>
    </div>
  )
}

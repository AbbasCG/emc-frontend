import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EMC_WIZARD_PROGRESS_GRADIENT } from '@/components/emc-form-wizard/emcWizardTokens'

type Props = {
  /** 0–100 */
  percent: number
  label?: string
  className?: string
  compact?: boolean
}

export function FormProgressBar({ percent, label = 'تقدّم النموذج', className, compact }: Props) {
  const p = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className={cn(compact ? 'space-y-2' : 'space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#0077B6]/20 bg-[#0077B6]/[0.07] px-4 py-2.5">
        <span className="text-[12px] font-black text-[#0C2A4B]">{label}</span>
        <span className="text-sm font-black text-[#0077B6] tabular-nums">{p}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/90">
        <motion.div
          className={cn('h-full rounded-full', EMC_WIZARD_PROGRESS_GRADIENT)}
          initial={false}
          animate={{ width: `${p}%` }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        />
      </div>
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type StatCardProps = {
  number: ReactNode
  label: string
  icon?: LucideIcon
  className?: string
}

/**
 * Compact public-facing stat card. Renders numerals in Inter tabular form
 * for a sharp analytics-grade look. Backward-compatible API.
 */
export default function StatCard({ number, label, icon: Icon, className = '' }: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white px-6 py-5 text-right shadow-emc ring-1 ring-deepBlue/[0.07] transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:shadow-emc-md',
        className,
      )}
    >
      {/* Soft brand glow corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-12 -left-12 h-32 w-32 rounded-full bg-customBlue/[0.10] blur-2xl"
      />
      {Icon && (
        <div className="relative mb-2 flex justify-end">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-customBlue/[0.10] text-customBlue ring-1 ring-customBlue/15">
            <Icon size={20} strokeWidth={2.1} aria-hidden />
          </span>
        </div>
      )}
      <div className="relative emc-display-num text-3xl text-deepBlue sm:text-[2.1rem]" dir="ltr">{number}</div>
      <p className="relative mt-1 text-xs font-black uppercase tracking-[0.16em] text-deepBlue/55 font-latin sm:text-[13px]">
        {label}
      </p>
    </div>
  )
}

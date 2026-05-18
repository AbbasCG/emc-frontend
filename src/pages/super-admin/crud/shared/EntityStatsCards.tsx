import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Responsive grid for EnterpriseMetricTile / SaStatChip rows — keeps KPI strips aligned */
export function EntityStatsCards(props: {
  children: ReactNode
  className?: string
  columnsClassName?: string
}) {
  const { children, className, columnsClassName } = props
  return (
    <div
      className={cn(
        'grid gap-3 sm:grid-cols-2 xl:grid-cols-4',
        columnsClassName,
        className,
      )}
    >
      {children}
    </div>
  )
}

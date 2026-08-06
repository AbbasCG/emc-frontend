import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Document order: hero → KPI/metrics → toolbar → main body.
 * Keeps spacing consistent without forcing identical inner layouts.
 */
export function CrudPageShell(props: {
  className?: string
  hero?: ReactNode
  metrics?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
}) {
  const { hero, metrics, toolbar, children, className } = props
  return (
    <div className={cn('space-y-6 lg:space-y-8', className)}>
      {hero}
      {metrics}
      {toolbar}
      {children}
    </div>
  )
}

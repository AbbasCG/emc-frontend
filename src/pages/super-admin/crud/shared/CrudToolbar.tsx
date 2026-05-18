import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  CrudFilterBar,
  type FilterBarProps,
} from '@/pages/super-admin/crud/shared/FilterBar'

type CrudToolbarProps = Omit<FilterBarProps, 'className'> & {
  /** Pin below global nav so filters stay reachable while scrolling */
  sticky?: boolean
  className?: string
  /** Refresh, export, create, or secondary controls — rendered after filters on wide screens */
  actions?: ReactNode
  innerClassName?: string
}

/** Search + filters row; place immediately after KPI / metrics on every CRUD page */
export function CrudToolbar({
  sticky,
  actions,
  className,
  innerClassName,
  children,
  ...filterProps
}: CrudToolbarProps) {
  return (
    <div
      className={cn(
        sticky && 'sticky top-[4.25rem] z-20 lg:top-20',
        className,
      )}
    >
      <div
        className={cn(
          'overflow-hidden rounded-3xl border border-ink-100/90 bg-white/[0.97] shadow-[0_8px_40px_rgba(34,51,74,0.07)] ring-1 ring-white/85 backdrop-blur-md',
          innerClassName,
        )}
      >
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:p-4">
          <div className="min-w-0 flex-1">
            <CrudFilterBar
              {...filterProps}
              className="border-0 bg-transparent p-0 shadow-none sm:flex-row sm:items-end"
            >
              {children}
            </CrudFilterBar>
          </div>
          {actions ?
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:pb-0.5">{actions}</div>
          : null}
        </div>
      </div>
    </div>
  )
}

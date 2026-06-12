import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  CrudFilterBar,
  type FilterBarProps,
} from '@/pages/super-admin/crud/shared/FilterBar'

type CrudToolbarProps = Omit<FilterBarProps, 'className'> & {
  sticky?: boolean
  className?: string
  actions?: ReactNode
  innerClassName?: string
}

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
          'rounded-2xl border border-slate-200/80 bg-white shadow-sm',
          innerClassName,
        )}
      >
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <CrudFilterBar {...filterProps} className="border-0 bg-transparent p-0 shadow-none">
              {children}
            </CrudFilterBar>
          </div>
          {actions ?
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
          : null}
        </div>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * EMC <DashboardPageShell /> — consistent dashboard page header.
 *
 * Backward-compatible: `title`, `description`, `actions`, `children` keep their
 * exact semantics. Optional new props: `eyebrow`, `breadcrumbs`, `badge`,
 * `tabs`, `density`. Existing call-sites render unchanged.
 */

export type BreadcrumbEntry = { label: string; href?: string }

type Props = {
  title: string
  description?: string
  actions?: ReactNode
  /** Optional small uppercase tag (e.g. "AI Command Center", "إدارة"). */
  eyebrow?: ReactNode
  /** Optional breadcrumb chain rendered above the title. RTL-aware. */
  breadcrumbs?: BreadcrumbEntry[]
  /** Optional inline pill rendered next to the title (e.g. status, count). */
  badge?: ReactNode
  /** Optional row below the description (e.g. tabs / segmented control). */
  tabs?: ReactNode
  /** Default `cozy`. Use `compact` for table-heavy admin pages. */
  density?: 'cozy' | 'compact'
  children: ReactNode
}

export default function DashboardPageShell({
  title,
  description,
  actions,
  eyebrow,
  breadcrumbs,
  badge,
  tabs,
  density = 'cozy',
  children,
}: Props) {
  const showCrumbs = breadcrumbs && breadcrumbs.length > 0
  return (
    <div className={cn('space-y-8', density === 'compact' && 'space-y-6')}>
      <header
        className={cn(
          'flex flex-col gap-4 border-b border-slate-100 pb-6',
          'sm:flex-row sm:items-end sm:justify-between',
        )}
      >
        <div className="min-w-0 flex-1">
          {showCrumbs && (
            <nav
              aria-label="مسار الصفحة"
              className="mb-3 flex flex-wrap items-center gap-1 text-xs font-bold text-deepBlue/55"
            >
              {breadcrumbs!.map((crumb, idx) => {
                const isLast = idx === breadcrumbs!.length - 1
                return (
                  <span key={`${crumb.label}-${idx}`} className="inline-flex items-center gap-1">
                    {crumb.href && !isLast ? (
                      <Link
                        to={crumb.href}
                        className="rounded-md px-1.5 py-0.5 transition hover:bg-deepBlue/[0.05] hover:text-deepBlue"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={cn('px-1.5 py-0.5', isLast && 'text-deepBlue')}>{crumb.label}</span>
                    )}
                    {!isLast && (
                      <ChevronLeft size={13} className="text-deepBlue/30" aria-hidden />
                    )}
                  </span>
                )
              })}
            </nav>
          )}

          {eyebrow && (
            <div className="mb-2 inline-flex items-center gap-2">
              {typeof eyebrow === 'string' ? (
                <span className="emc-eyebrow">{eyebrow}</span>
              ) : (
                eyebrow
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <h1
              className={cn(
                'font-black tracking-tight text-deepBlue',
                density === 'compact' ? 'text-xl md:text-2xl' : 'text-2xl md:text-[1.75rem]',
              )}
            >
              {title}
            </h1>
            {badge}
          </div>

          {description && (
            <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-deepBlue/65">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>

      {tabs && <div className="-mt-2">{tabs}</div>}

      {children}
    </div>
  )
}

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Brand-neutral shimmer skeletons (EMC V2.2).
 *
 * Uses the calibrated `emc-skeleton` utility (calm sweep, sea-neutral base)
 * rather than a hard `animate-pulse` flash — world-class products feel polished
 * even while waiting. Compose the primitive `<Skeleton />` or reach for the
 * prebuilt blocks (line / text / card / avatar / list).
 */

/** Base shimmer primitive. Pass utility classes for size/shape. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span className={cn('emc-skeleton block', className)} style={style} aria-hidden />
}

/** A single line of faux text. */
export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn('h-3.5 w-full rounded-md', className)} />
}

/** A short stack of text lines, last one intentionally shorter. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          className={i === lines - 1 ? 'w-3/5 opacity-80' : i === 0 ? 'w-11/12' : 'w-full'}
        />
      ))}
    </div>
  )
}

/** A circular avatar placeholder. */
export function SkeletonAvatar({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <Skeleton
      className={cn('shrink-0 rounded-full', className)}
      style={{ width: size, height: size }}
    />
  )
}

/** A self-contained card placeholder — title + body lines inside a calm surface. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-emc-sm ring-1 ring-deepBlue/[0.03]',
        className,
      )}
    >
      <Skeleton className="mb-4 h-5 w-2/5 rounded-lg" />
      <SkeletonText lines={3} />
      <Skeleton className="mt-5 h-9 w-32 rounded-xl opacity-70" />
    </div>
  )
}

/** A stack of row placeholders — for list / table loading. */
export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3.5 rounded-xl border border-deepBlue/[0.05] bg-white px-4 py-3.5 shadow-emc-xs"
        >
          <SkeletonAvatar size={40} />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonLine className="w-2/5" />
            <SkeletonLine className="h-2.5 w-3/5 opacity-75" />
          </div>
          <Skeleton className="h-7 w-16 rounded-lg opacity-70" />
        </div>
      ))}
    </div>
  )
}

/** A responsive grid of card placeholders. */
export function SkeletonCardGrid({
  count = 3,
  cols = 3,
  className,
}: {
  count?: number
  cols?: 2 | 3 | 4
  className?: string
}) {
  const colCls =
    cols === 2
      ? 'sm:grid-cols-2'
      : cols === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3'
  return (
    <div className={cn('grid gap-5', colCls, className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export default Skeleton

import { cn } from '@/lib/utils'

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-slate-100', className)} aria-hidden />
}

export function LoadingSkeletonStack({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  )
}

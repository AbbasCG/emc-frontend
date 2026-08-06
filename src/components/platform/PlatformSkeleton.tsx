export function PlatformSkeleton({
  className,
  lines = 1,
}: {
  className?: string
  lines?: number
}) {
  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-xl bg-gradient-to-l from-slate-100 to-slate-200/80"
        />
      ))}
    </div>
  )
}

/** Alias requested in Phase 5 brief */
export const LoadingSkeleton = PlatformSkeleton

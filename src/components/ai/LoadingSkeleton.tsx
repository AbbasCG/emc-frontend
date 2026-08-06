export function LoadingSkeleton({ className = 'h-24 w-full' }: { className?: string }) {
  return <div className={['animate-pulse rounded-2xl bg-slate-100', className].join(' ')} aria-hidden />
}

export function LoadingStack({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} />
      ))}
    </div>
  )
}

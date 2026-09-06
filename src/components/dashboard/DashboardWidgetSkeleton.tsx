/** Per-section skeleton states — use instead of full-page spinners. */

export function DashboardHeroSkeleton() {
  return <div className="h-44 animate-pulse rounded-[1.75rem] bg-slate-200/70 ring-1 ring-slate-200" />
}

export function DashboardKpiSkeleton({ count = 4 }: { count?: number }) {
  const cols =
    count <= 3 ? 'sm:grid-cols-3'
    : count <= 4 ? 'sm:grid-cols-2 lg:grid-cols-4'
    : count <= 6 ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
    : 'sm:grid-cols-2 lg:grid-cols-4'
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-slate-200/70" />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-2xl bg-slate-100 ring-1 ring-slate-200/70"
      style={{ height: `${height}px` }}
    />
  )
}

export function DashboardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl bg-slate-100 ring-1 ring-slate-200/50"
        />
      ))}
    </div>
  )
}

export function DashboardCardGridSkeleton({ count = 3, cols = 3 }: { count?: number; cols?: number }) {
  const colCls =
    cols === 2 ? 'sm:grid-cols-2'
    : cols === 4 ? 'sm:grid-cols-2 lg:grid-cols-4'
    : 'sm:grid-cols-2 lg:grid-cols-3'
  return (
    <div className={`grid gap-5 ${colCls}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-slate-200/60" />
      ))}
    </div>
  )
}

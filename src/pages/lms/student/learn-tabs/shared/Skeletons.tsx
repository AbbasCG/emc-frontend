function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />
}

export function ToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bar className="h-10 flex-1 min-w-[180px]" />
      <Bar className="h-10 w-28" />
      <Bar className="h-10 w-28" />
    </div>
  )
}

export function GridCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-[#0C2A4B]/[0.06] bg-white p-5">
          <Bar className="h-5 w-16" />
          <Bar className="h-5 w-3/4" />
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-2/3" />
          <Bar className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}

export function ListRowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-[#0C2A4B]/[0.06] bg-white p-5">
          <Bar className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bar className="h-4 w-1/2" />
            <Bar className="h-3 w-1/3" />
          </div>
          <Bar className="h-9 w-24 shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function AccordionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[#0C2A4B]/[0.06] bg-white p-4">
          <div className="flex items-center gap-3">
            <Bar className="h-8 w-8 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Bar className="h-4 w-1/3" />
              <Bar className="h-1.5 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

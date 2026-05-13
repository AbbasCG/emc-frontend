export default function LmsPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-36 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white ring-1 ring-slate-100" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-white ring-1 ring-slate-100" />
    </div>
  )
}

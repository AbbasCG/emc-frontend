export default function IntelligencePageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-deepBlue/[0.06]" />
        ))}
      </div>
      <div className="h-72 rounded-[1.35rem] bg-white ring-1 ring-deepBlue/[0.06]" />
      <div className="h-48 rounded-2xl bg-white ring-1 ring-deepBlue/[0.06]" />
    </div>
  )
}

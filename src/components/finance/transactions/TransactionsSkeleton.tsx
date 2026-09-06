export function TransactionsSkeleton() {
  return (
    <div className="animate-pulse space-y-6" dir="rtl">
      <div className="h-28 rounded-[20px] bg-slate-200/80" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-[18px] bg-slate-200/70" />
        ))}
      </div>
      <div className="h-64 rounded-[20px] bg-slate-200/60" />
      <div className="h-24 rounded-[18px] bg-slate-100" />
      <div className="space-y-2 rounded-[20px] border border-[#E2E8F0] bg-white p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

import { Skeleton } from './ui/Skeleton'

/** Full-page fallback while lazy route layouts chunk loads */
export default function RouteFallback() {
  return (
    <div
      className="flex min-h-screen flex-col bg-slate-50/60 p-4 sm:p-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="جارٍ تحميل الصفحة"
      dir="rtl"
    >
      {/* Header Skeleton */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 pb-8 pt-4">
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton variant="circular" className="h-10 w-10" />
      </div>

      {/* Hero / Banner Skeleton */}
      <div className="mx-auto w-full max-w-7xl">
        <Skeleton className="h-44 w-full rounded-3xl" />
      </div>

      {/* Grid Content Skeleton */}
      <div className="mx-auto mt-8 grid w-full max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}

import { Skeleton } from './ui/Skeleton'

/**
 * Full-page fallback while a lazy route chunk loads.
 * V3 identity: the flying-pages mark + tricolor sweep over layout-shaped
 * skeletons — the same loading language as the boot splash in index.html.
 */
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
      {/* Branded loading mark flying pages + tricolor sweep */}
      <div className="pointer-events-none fixed inset-x-0 top-[42vh] z-10 flex flex-col items-center gap-4">
        <div className="emc-load-pages" aria-hidden>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="emc-load-bar" aria-hidden>
          <i></i>
        </div>
      </div>

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

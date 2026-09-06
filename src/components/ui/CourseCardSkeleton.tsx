import { Skeleton } from './Skeleton'

export function CourseCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/80">
      {/* Thumbnail */}
      <Skeleton className="h-48 w-full rounded-none" />

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Category Pill & Rating */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* Title */}
        <Skeleton className="mt-4 h-6 w-5/6" />
        <Skeleton className="mt-2 h-6 w-2/3" />

        {/* Description lines */}
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-4/5" />

        {/* Instructor info */}
        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
          <Skeleton variant="circular" className="h-9 w-9" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Footer price & CTA */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function CourseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <CourseCardSkeleton key={index} />
      ))}
    </div>
  )
}

export default CourseCardSkeleton

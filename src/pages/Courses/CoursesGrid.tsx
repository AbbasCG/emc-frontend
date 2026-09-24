import { useState, memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { RotateCcw, Search } from 'lucide-react'
import CourseCard from './CourseCard'
import type { CourseItem } from '@/services/coursesApi'

type CoursesGridProps = {
  courses: CourseItem[]
  totalFromApi: number
  loading: boolean
  /** Kept for call-site compatibility (/programs passes it) — the editorial rows list is the one view. */
  viewMode?: 'grid' | 'list'
  embedded?: boolean
  sectionId?: string
  /** Optional: lets the empty state offer a one-click filter reset. */
  onResetFilters?: () => void
}

const PAGE_SIZE = 12

/** Editorial loading state — pulsing row silhouettes seated on hairlines (no boxed skeleton cards). */
function RowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden className="animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 border-b border-line py-6 ps-3 sm:flex-row sm:items-center sm:gap-6 sm:py-7 sm:ps-4"
        >
          <div className="emc-page-clip-sm aspect-video w-full shrink-0 bg-paper2 sm:w-40 md:w-56" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-3/4 rounded bg-paper2" />
            <div className="h-3.5 w-1/2 rounded bg-paper2" />
          </div>
          <div className="hidden h-10 w-40 rounded-xl bg-paper2 sm:block" />
        </div>
      ))}
    </div>
  )
}

/** De-boxed empty state — typography and whitespace, seated between hairlines. */
function EmptyState({
  apiEmpty,
  onResetFilters,
}: {
  apiEmpty: boolean
  onResetFilters?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Search className="mb-5 h-9 w-9 text-muted-300" aria-hidden />
      {apiEmpty ? (
        <>
          <h3 className="mb-2 font-display text-xl font-black text-deepBlue">لا توجد دورات في الكتالوج</h3>
          <p className="max-w-md text-sm leading-7 text-muted-500">
            لم يُعثر على برامج منشورة. يُحدَّث الكتالوج تلقائياً عند نشر دورات جديدة من لوحة الإدارة.
          </p>
        </>
      ) : (
        <>
          <h3 className="mb-2 font-display text-xl font-black text-deepBlue">لا برامج تطابق فلاترك</h3>
          <p className="max-w-xs text-sm leading-7 text-muted-500">
            جرّب تعديل البحث أو إعادة ضبط الفلاتر.
          </p>
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="emc-cta-line mt-6 text-sm focus-visible:outline-none"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              مسح الفلاتر
            </button>
          )}
        </>
      )}
    </div>
  )
}

/** Full editorial list: all filtered courses, first 12 up front + «عرض المزيد» appending 12 more. */
function AllCoursesList({ courses }: { courses: CourseItem[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Reset pagination whenever the filtered result set changes — adjusted during
  // render (react.dev "adjusting state when a prop changes") so a new filter
  // never paints with the previous expanded count first.
  const [seen, setSeen] = useState(courses)
  if (seen !== courses) {
    setSeen(courses)
    setVisibleCount(PAGE_SIZE)
  }

  const visible = courses.slice(0, visibleCount)
  const hasMore = courses.length > visible.length

  return (
    <div>
      <div>
        {visible.map((course, i) => (
          <CourseCard key={course.id} course={course} index={i} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="emc-cta-line text-base focus-visible:outline-none"
          >
            عرض المزيد
          </button>
          <p className="text-xs text-muted-500" dir="rtl">
            عرض{' '}
            <span className="tabular-nums" dir="ltr">
              {visible.length.toLocaleString('en-US')}
            </span>{' '}
            من{' '}
            <span className="tabular-nums" dir="ltr">
              {courses.length.toLocaleString('en-US')}
            </span>{' '}
            دورة
          </p>
        </div>
      )}
    </div>
  )
}

function CoursesGrid({
  courses,
  totalFromApi,
  loading,
  embedded = false,
  sectionId = 'catalog-courses',
  onResetFilters,
}: CoursesGridProps) {
  const listBody = (
    <>
      {loading && <RowsSkeleton />}

      {!loading && courses.length === 0 && (
        <EmptyState apiEmpty={totalFromApi === 0} onResetFilters={onResetFilters} />
      )}

      {!loading && courses.length > 0 && (
        embedded ? (
          /* /programs and other embedded contexts: flat rows list of all results */
          <>
            <div>
              <AnimatePresence>
                {courses.map((course, i) => (
                  <CourseCard key={course.id} course={course} index={i} />
                ))}
              </AnimatePresence>
            </div>
            <p className="mt-4 text-center text-xs text-muted-500">
              عرض {courses.length.toLocaleString('en-US')} دورة
            </p>
          </>
        ) : (
          /* /courses discovery page: every filtered course, load-more past 12 */
          <AllCoursesList courses={courses} />
        )
      )}
    </>
  )

  if (embedded) {
    return <div className="mx-auto max-w-7xl px-4 sm:px-6">{listBody}</div>
  }

  return (
    <section id={sectionId} className="scroll-mt-28 bg-white py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6">
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-accent-700">
            جميع الدورات
          </span>
          <h2 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue md:text-3xl">الدورات المتاحة</h2>
        </div>

        {/* Opening seam the list begins on a fading hairline, not inside a container */}
        <div className="emc-hairline mb-1" aria-hidden />

        {listBody}
      </div>
    </section>
  )
}

export default memo(CoursesGrid)

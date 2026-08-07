import { useState, memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { RotateCcw, Search } from 'lucide-react'
import CourseCard from './CourseCard'
import type { CourseItem } from '@/services/coursesApi'
import { CourseGridSkeleton } from '@/components/ui/CourseCardSkeleton'

type CoursesGridProps = {
  courses: CourseItem[]
  totalFromApi: number
  loading: boolean
  viewMode: 'grid' | 'list'
  embedded?: boolean
  sectionId?: string
  /** Optional: lets the empty state offer a one-click filter reset. */
  onResetFilters?: () => void
}

const PAGE_SIZE = 12

function gridClassFor(viewMode: 'grid' | 'list') {
  return viewMode === 'grid'
    ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
    : 'flex flex-col gap-5'
}

function EmptyState({
  apiEmpty,
  onResetFilters,
}: {
  apiEmpty: boolean
  onResetFilters?: () => void
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-paper/70 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-inner">
        <Search className="h-8 w-8 text-muted-300" aria-hidden />
      </div>
      {apiEmpty ? (
        <>
          <h3 className="mb-2 text-xl font-black text-deepBlue">لا توجد دورات في الكتالوج</h3>
          <p className="max-w-md text-sm leading-7 text-muted-500">
            لم يُعثر على برامج منشورة. يُحدَّث الكتالوج تلقائياً عند نشر دورات جديدة من لوحة الإدارة.
          </p>
        </>
      ) : (
        <>
          <h3 className="mb-2 text-xl font-black text-deepBlue">لا برامج تطابق فلاترك</h3>
          <p className="max-w-xs text-sm leading-7 text-muted-500">
            جرّب تعديل البحث أو إعادة ضبط الفلاتر.
          </p>
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-brand-500/25 transition-colors duration-200 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
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

/** Full responsive grid: all filtered courses, first 12 up front + «عرض المزيد» appending 12 more. */
function AllCoursesGrid({
  courses,
  viewMode,
}: {
  courses: CourseItem[]
  viewMode: 'grid' | 'list'
}) {
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
      <div className={gridClassFor(viewMode)}>
        {visible.map((course, i) => (
          <CourseCard key={course.id} course={course} index={i} viewMode={viewMode} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-9 flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-7 py-3 text-sm font-black text-navy shadow-emc-xs transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
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
  viewMode,
  embedded = false,
  sectionId = 'catalog-courses',
  onResetFilters,
}: CoursesGridProps) {
  const gridBody = (
    <>
      {loading && <CourseGridSkeleton count={6} />}

      {!loading && courses.length === 0 && (
        <div className={gridClassFor(viewMode)}>
          <EmptyState apiEmpty={totalFromApi === 0} onResetFilters={onResetFilters} />
        </div>
      )}

      {!loading && courses.length > 0 && (
        embedded ? (
          /* /programs and other embedded contexts: flat grid of all results */
          <>
            <div className={gridClassFor(viewMode)}>
              <AnimatePresence>
                {courses.map((course, i) => (
                  <CourseCard key={course.id} course={course} index={i} viewMode={viewMode} />
                ))}
              </AnimatePresence>
            </div>
            <p className="mt-4 text-center text-xs text-muted-500">
              عرض {courses.length.toLocaleString('en-US')} دورة
            </p>
          </>
        ) : (
          /* /courses discovery page: every filtered course, load-more past 12 */
          <AllCoursesGrid courses={courses} viewMode={viewMode} />
        )
      )}
    </>
  )

  if (embedded) {
    return <div className="mx-auto max-w-7xl px-4 sm:px-6">{gridBody}</div>
  }

  return (
    <section id={sectionId} className="scroll-mt-28 bg-white py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8">
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-accent-700">
            جميع الدورات
          </span>
          <h2 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue md:text-3xl">الدورات المتاحة</h2>
        </div>

        {gridBody}
      </div>
    </section>
  )
}

export default memo(CoursesGrid)

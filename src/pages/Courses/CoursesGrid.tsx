import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
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
}

function useItemsPerPage() {
  const [n, setN] = useState(3)
  useEffect(() => {
    const update = () =>
      setN(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3)
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])
  return n
}

function EmptyState({ apiEmpty }: { apiEmpty: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-inner">
        <Search className="h-8 w-8 text-muted-300" />
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
          <h3 className="mb-2 text-xl font-black text-deepBlue">لا توجد نتائج مطابقة</h3>
          <p className="max-w-xs text-sm text-muted-500">
            جرّب تعديل البحث أو إعادة ضبط الفلاتر في الشريط أعلاه.
          </p>
        </>
      )}
    </div>
  )
}

function CoursesCarousel({
  courses,
  viewMode,
}: {
  courses: CourseItem[]
  viewMode: 'grid' | 'list'
}) {
  const itemsPerPage = useItemsPerPage()
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [courses, itemsPerPage])

  const totalPages = Math.max(1, Math.ceil(courses.length / itemsPerPage))
  const clamped = Math.min(page, totalPages - 1)
  const visible = courses.slice(clamped * itemsPerPage, (clamped + 1) * itemsPerPage)

  const gridClass =
    viewMode === 'grid'
      ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
      : 'flex flex-col gap-5'

  const from = clamped * itemsPerPage + 1
  const to = Math.min((clamped + 1) * itemsPerPage, courses.length)

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${clamped}-${itemsPerPage}`}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={gridClass}
        >
          {visible.map((course, i) => (
            <CourseCard key={course.id} course={course} index={i} viewMode={viewMode === 'list' ? 'list' : 'grid'} />
          ))}
        </motion.div>
      </AnimatePresence>

      {totalPages > 1 && (
        <div className="mt-7 flex items-center justify-center gap-3" dir="ltr">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={clamped === 0}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-deepBlue shadow-sm transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="السابق"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`صفحة ${String(i + 1)}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === clamped
                    ? 'w-7 bg-brand-500'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={clamped === totalPages - 1}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-deepBlue shadow-sm transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="التالي"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <p className="mt-3 text-center text-xs text-muted-500" dir="rtl">
        عرض {from}–{to} من {courses.length} دورة
      </p>
    </div>
  )
}

export default function CoursesGrid({
  courses,
  totalFromApi,
  loading,
  viewMode,
  embedded = false,
  sectionId = 'catalog-courses',
}: CoursesGridProps) {
  const gridClass =
    viewMode === 'grid'
      ? 'grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3'
      : 'flex flex-col gap-6'

  const gridBody = (
    <>
      {loading && <CourseGridSkeleton count={6} />}

      {!loading && courses.length === 0 && (
        <div className={gridClass}>
          <EmptyState apiEmpty={totalFromApi === 0} />
        </div>
      )}

      {!loading && courses.length > 0 && (
        embedded ? (
          /* /programs and other embedded contexts: flat grid of all results */
          <>
            <div className={gridClass}>
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
          /* /courses discovery page: carousel + link to /programs */
          <>
            <CoursesCarousel courses={courses} viewMode={viewMode} />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6 flex justify-center"
            >
              <Link
                to="/programs"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-deepBlue shadow-sm transition hover:border-brand-400 hover:bg-brand-50"
              >
                <LayoutGrid className="h-4 w-4 text-brand-500" />
                عرض الكل ({courses.length.toLocaleString('en-US')} دورة)
              </Link>
            </motion.div>
          </>
        )
      )}
    </>
  )

  if (embedded) {
    return <div className="mx-auto max-w-7xl px-4 sm:px-6">{gridBody}</div>
  }

  return (
    <section id={sectionId} className="scroll-mt-28 bg-white py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-7">
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-accent-500">
            جميع الدورات
          </span>
          <h2 className="text-2xl font-black text-deepBlue md:text-3xl">الدورات المتاحة</h2>
          <div className="mt-2 h-1 w-12 rounded-full bg-brand-500" />
        </div>

        {gridBody}
      </div>
    </section>
  )
}

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import CourseCard from './CourseCard'
import type { CourseItem } from '@/services/coursesApi'

type CoursesGridProps = {
  courses: CourseItem[]
  /** Total courses returned from API (before client-side filters) */
  totalFromApi: number
  loading: boolean
  viewMode: 'grid' | 'list'
}

const INITIAL_VISIBLE = 9

function CourseSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-emc-md">
      <div className="h-52 bg-gradient-to-br from-slate-200 to-slate-100" />
      <div className="space-y-4 p-6">
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full bg-slate-100" />
          <div className="h-6 w-16 rounded-full bg-slate-100" />
        </div>
        <div className="h-6 w-4/5 rounded-lg bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-3/4 rounded bg-slate-100" />
        <div className="flex gap-2 pt-2">
          <div className="h-8 flex-1 rounded-xl bg-slate-100" />
          <div className="h-8 flex-1 rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ apiEmpty }: { apiEmpty: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 py-24 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-inner">
        <Search className="h-9 w-9 text-muted-300" />
      </div>
      {apiEmpty ? (
        <>
          <h3 className="mb-2 text-xl font-black text-deepBlue">لا توجد دورات في الكتالوج</h3>
          <p className="max-w-md text-sm leading-7 text-muted-500">
            لم يُعثر على برامج منشورة. يُحدَّث الكتالوج تلقائياً عند نشر دورات جديدة من لوحة الإدارة.
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

export default function CoursesGrid({ courses, totalFromApi, loading, viewMode }: CoursesGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)

  const visibleCourses = courses.slice(0, visibleCount)
  const hasMore = visibleCount < courses.length

  const gridClass =
    viewMode === 'grid'
      ? 'grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3'
      : 'flex flex-col gap-6'

  return (
    <section id="catalog-courses" className="scroll-mt-28 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10">
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-accent-500">
            جميع الدورات
          </span>
          <h2 className="text-2xl font-black text-deepBlue md:text-3xl">الدورات المتاحة</h2>
          <div className="mt-2 h-1 w-12 rounded-full bg-brand-500" />
        </div>

        {loading && (
          <div className={gridClass}>
            {Array.from({ length: INITIAL_VISIBLE }).map((_, i) => (
              <CourseSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && courses.length === 0 && (
          <div className={gridClass}>
            <EmptyState apiEmpty={totalFromApi === 0} />
          </div>
        )}

        {!loading && courses.length > 0 && (
          <>
            <div className={gridClass}>
              <AnimatePresence>
                {visibleCourses.map((course, i) => (
                  <CourseCard key={course.id} course={course} index={i} viewMode={viewMode} />
                ))}
              </AnimatePresence>
            </div>

            {hasMore && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 flex flex-col items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + INITIAL_VISIBLE)}
                  className="rounded-2xl bg-deepBlue px-10 py-3.5 text-sm font-bold text-white transition hover:bg-ink-800"
                >
                  تحميل المزيد
                </button>
                <p className="text-xs text-muted-500">
                  عرض {visibleCourses.length.toLocaleString('ar-EG')} من{' '}
                  {courses.length.toLocaleString('ar-EG')} دورة
                </p>
              </motion.div>
            )}

            {!hasMore && courses.length > INITIAL_VISIBLE && (
              <p className="mt-10 text-center text-xs text-muted-500">
                تم عرض جميع النتائج ({courses.length.toLocaleString('ar-EG')})
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

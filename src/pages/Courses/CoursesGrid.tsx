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
    <div className="bg-white rounded-xl border-2 border-slate-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 bg-slate-100 rounded-full w-24" />
          <div className="h-4 bg-slate-100 rounded w-10" />
        </div>
        <div className="h-5 bg-slate-200 rounded w-4/5" />
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="flex gap-2 items-center">
          <div className="w-7 h-7 bg-slate-200 rounded-full" />
          <div className="h-4 bg-slate-100 rounded w-32" />
        </div>
        <div className="flex gap-4">
          <div className="h-4 bg-slate-100 rounded w-28" />
          <div className="h-4 bg-slate-100 rounded w-16" />
        </div>
        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
          <div className="h-5 bg-slate-200 rounded w-20" />
          <div className="h-9 bg-slate-200 rounded-lg w-28" />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ apiEmpty }: { apiEmpty: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
        <Search className="w-9 h-9 text-slate-400" />
      </div>
      {apiEmpty ? (
        <>
          <h3 className="text-xl font-bold text-deepBlue mb-2">لا توجد برامج منشورة حالياً</h3>
          <p className="text-[#73777B] text-sm max-w-md leading-7">
            لم يتم العثور على دورات أو ورش في الكتالوج الحالي. يمكنك العودة لاحقاً، أو
            التواصل معنا لطلب برنامج مخصص أو ورشة للفريق.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-xl font-bold text-deepBlue mb-2">لا توجد نتائج مطابقة للفلتر</h3>
          <p className="text-[#73777B] text-sm max-w-xs">
            جرّب تعديل كلمة البحث أو اختر فئة أو فلتر مختلف.
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

  const gridClass = viewMode === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
    : 'flex flex-col gap-4'

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section label */}
        <div className="mb-8">
          <span className="text-xs font-bold text-customOrange uppercase tracking-widest mb-2 block">
            جميع الدورات
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-deepBlue">
            الدورات المتاحة
          </h2>
          <div className="w-12 h-1 bg-customOrange rounded-full mt-2" />
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className={gridClass}>
            {Array.from({ length: INITIAL_VISIBLE }).map((_, i) => (
              <CourseSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && courses.length === 0 && (
          <div className={gridClass}>
            <EmptyState apiEmpty={totalFromApi === 0} />
          </div>
        )}

        {/* Courses grid */}
        {!loading && courses.length > 0 && (
          <>
            <div className={gridClass}>
              <AnimatePresence>
                {visibleCourses.map((course, i) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    index={i}
                    viewMode={viewMode}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Load more */}
            {hasMore && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center mt-12 gap-3"
              >
                <button
                  onClick={() => setVisibleCount(c => c + INITIAL_VISIBLE)}
                  className="bg-deepBlue text-white font-bold px-10 py-3.5 rounded-xl hover:bg-deepBlue/90 transition-colors duration-200 text-sm"
                >
                  تحميل المزيد
                </button>
                <p className="text-xs text-[#73777B]">
                  عرض {visibleCourses.length} من {courses.length} دورة
                </p>
              </motion.div>
            )}

            {!hasMore && courses.length > INITIAL_VISIBLE && (
              <p className="text-center text-xs text-[#73777B] mt-10">
                تم عرض جميع الدورات ({courses.length})
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

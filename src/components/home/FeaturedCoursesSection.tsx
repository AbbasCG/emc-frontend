import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import HomeCourseCard from './HomeCourseCard'
import type { Course } from '../../types'
import { fetchCoursesFromApi } from '../../api/coursesApi.public'
import { staggerContainer } from '@/utils/animations'

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

function sortByPopularity(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => {
    const get = (c: Course) =>
      Number(
        (c as Record<string, unknown>).enrollments_count ??
          (c as Record<string, unknown>).students_count ??
          c.registrations_count ??
          0,
      )
    return get(b) - get(a)
  })
}

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[1.375rem] border border-deepBlue/[0.06] bg-white shadow-emc">
      <div className="aspect-[16/10] bg-gradient-to-br from-slate-200 to-slate-100" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-4/5 rounded-lg bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-3/5 rounded bg-slate-100" />
        <div className="mt-2 h-3 w-2/5 rounded bg-slate-100" />
        <div className="mt-3 h-11 rounded-xl bg-slate-200" />
      </div>
    </div>
  )
}

export default function FeaturedCoursesSection() {
  const { t } = useTranslation()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' })
  const itemsPerPage = useItemsPerPage()
  const [page, setPage] = useState(0)

  useEffect(() => {
    let active = true
    fetchCoursesFromApi()
      .then((list) => {
        if (!active) return
        setCourses(sortByPopularity(list).slice(0, 6))
      })
      .catch(() => {
        if (active) setCourses([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Reset to the first page during render when the page size changes (react.dev
  // "adjusting state when a prop changes"). On mount the effect only re-set the
  // already-initial 0, so seeding `seen` with the current value keeps behaviour identical.
  const [seenItemsPerPage, setSeenItemsPerPage] = useState(itemsPerPage)
  if (seenItemsPerPage !== itemsPerPage) {
    setSeenItemsPerPage(itemsPerPage)
    setPage(0)
  }

  const totalPages = Math.max(1, Math.ceil(courses.length / itemsPerPage))
  const clamped = Math.min(page, totalPages - 1)
  const visible = courses.slice(clamped * itemsPerPage, (clamped + 1) * itemsPerPage)
  const from = clamped * itemsPerPage + 1
  const to = Math.min((clamped + 1) * itemsPerPage, courses.length)

  return (
    <section
      ref={sectionRef}
      dir="rtl"
      className="border-y border-deepBlue/[0.05] bg-white px-4 py-12 sm:px-6 lg:px-10 lg:py-16"
    >
      <div className="mx-auto max-w-[1540px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-10 flex items-end justify-between gap-4"
        >
          <div className="text-right">
            <span className="emc-eyebrow">{t('home.featured.eyebrow')}</span>
            <h2 className="emc-title-arc mt-4 font-display text-2xl font-black tracking-tight text-deepBlue sm:text-3xl">
              {t('home.featured.title')}
            </h2>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="shrink-0">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-2xl bg-deepBlue px-5 py-2.5 text-sm font-black text-white shadow-emc transition hover:brightness-105"
            >
              {t('home.featured.viewAll')}
              <ArrowLeft size={15} aria-hidden />
            </Link>
          </motion.div>
        </motion.div>

        {/* Body */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${clamped}-${itemsPerPage}`}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visible.map((course, i) => (
                  <HomeCourseCard key={course.id} course={course} index={i} />
                ))}
              </motion.div>
            </AnimatePresence>

            {totalPages > 1 && (
              <>
                <div className="mt-8 flex items-center justify-center gap-3" dir="ltr">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={clamped === 0}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-deepBlue shadow-sm transition hover:border-customBlue/40 hover:bg-customBlue/5 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={t('home.featured.aria.prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex gap-1.5">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPage(i)}
                        aria-label={t('home.featured.aria.page', { num: i + 1 })}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === clamped
                            ? 'w-7 bg-customBlue'
                            : 'w-2 bg-slate-300 hover:bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={clamped === totalPages - 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-deepBlue shadow-sm transition hover:border-customBlue/40 hover:bg-customBlue/5 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={t('home.featured.aria.next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-center text-[11px] text-foreground/40" dir="rtl">
                  {t('home.featured.range', { from, to, total: courses.length })}
                </p>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-deepBlue/[0.1] bg-slate-50 py-16 text-center">
            <BookOpen size={40} className="text-customBlue/30" aria-hidden />
            <p className="text-sm font-black text-deepBlue">{t('home.featured.emptyTitle')}</p>
            <Link to="/courses" className="text-xs font-black text-customBlue hover:underline">
              {t('home.featured.emptyCta')}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

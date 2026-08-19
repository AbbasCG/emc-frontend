import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import HomeCourseCard from './HomeCourseCard'
import type { Course } from '../../types'
import { fetchCoursesFromApi } from '../../api/coursesApi.public'
import { staggerContainer } from '@/utils/animations'

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

// Editorial skeleton — hairline-seated row placeholders (no card boxes)
function RowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 border-b border-line py-5 ps-3 sm:gap-6 sm:py-6 sm:ps-4">
      <div className="emc-page-clip-sm aspect-[16/10] w-24 shrink-0 bg-slate-200 sm:w-36" />
      <div className="flex-1 space-y-3">
        <div className="h-4 w-3/5 rounded bg-slate-200" />
        <div className="h-3 w-2/5 rounded bg-slate-100" />
        <div className="h-3 w-1/4 rounded bg-slate-100" />
      </div>
    </div>
  )
}

// Design Language 2.0 — the card grid + pager became a single editorial list:
// every course is an emc-row on a hairline seat, so all six read in one scan
// (fewer clicks between landing and «تفاصيل الدورة»).
export default function FeaturedCoursesSection() {
  const { t } = useTranslation()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden border-y border-deepBlue/[0.05] bg-paper px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
    >
      {/* V3 decorative layer — one sea orb (light from the top-right) + ghost numeral */}
      <div
        aria-hidden
        className="animate-soft-float pointer-events-none absolute -right-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-customBlue/10 blur-3xl"
      />
      <span aria-hidden className="emc-ghost-num absolute -top-5 left-4 text-[7rem] sm:text-[10rem]">
        01
      </span>

      <div className="relative mx-auto max-w-[1540px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-10 flex items-end justify-between gap-4"
        >
          <div className="text-right">
            <span className="emc-eyebrow">{t('home.featured.eyebrow')}</span>
            <h2 className="emc-title-arc mt-4 font-display text-2xl font-black tracking-tight text-deepBlue sm:text-3xl">
              {t('home.featured.title')}
            </h2>
          </div>
          {/* De-boxed view-all — line CTA instead of a navy pill */}
          <Link to="/courses" className="emc-cta-line shrink-0 text-sm">
            {t('home.featured.viewAll')}
            <ArrowLeft size={15} aria-hidden />
          </Link>
        </motion.div>

        {/* Body — editorial list */}
        {loading ? (
          <div>
            <div aria-hidden className="emc-hairline" />
            {Array.from({ length: 3 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            <div aria-hidden className="emc-hairline" />
            {courses.map((course, i) => (
              <HomeCourseCard key={course.id} course={course} index={i} />
            ))}
          </motion.div>
        ) : (
          <div className="py-14 text-center">
            <div aria-hidden className="emc-hairline mb-10" />
            <BookOpen size={36} className="mx-auto text-customBlue/30" aria-hidden />
            <p className="mt-3 text-sm font-black text-deepBlue">{t('home.featured.emptyTitle')}</p>
            <Link to="/courses" className="emc-cta-line mt-4 text-xs">
              {t('home.featured.emptyCta')}
            </Link>
            <div aria-hidden className="emc-hairline mt-10" />
          </div>
        )}
      </div>
    </section>
  )
}

import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, BookOpen, Calendar, Clock, GraduationCap } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import type { CourseItem } from '@/services/coursesApi'
import { formatEuroInteger } from '@/utils/currency'
import { toLatinDigits } from '@/utils/publicDetailFormat'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { useAuth } from '@/contexts/AuthContext'
import { ENDED_COURSE_LABEL_AR } from '@/utils/courseEnded'
import {
  buildCourseDetailEnrollHref,
  gatePublicEnrollClick,
} from '@/utils/publicEnrollAuth'

type CourseCardProps = {
  course: CourseItem
  viewMode?: 'grid' | 'list'
  index?: number
}

const startDateFormatter = new Intl.DateTimeFormat('ar-SA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  numberingSystem: 'latn',
})

function formatStartAr(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return startDateFormatter.format(d)
}

function deliveryLabelAr(course: CourseItem): string {
  switch (course.delivery_key) {
    case 'online':
      return 'عن بُعد'
    case 'offline':
      return 'حضوري'
    case 'hybrid':
      return 'هجين'
    default:
      return course.delivery_label_ar
  }
}

function CourseCard({ course, viewMode = 'grid', index = 0 }: CourseCardProps) {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const isList = viewMode === 'list'

  const imgSrc = course.thumbnail
    ? resolvePublicAssetUrl(course.thumbnail) ?? course.thumbnail
    : course.cover_placeholder

  const startLabel = formatStartAr(course.start_date)
  const priceLabel = course.is_free ? 'مجاناً' : toLatinDigits(formatEuroInteger(course.price, 'ar'))

  const seatsFull =
    !course.is_ended &&
    course.seats_count != null &&
    course.seats_count > 0 &&
    course.registrations_count >= course.seats_count
  const registerDisabled = course.is_ended || seatsFull

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="h-full"
    >
      <article
        className={`group flex h-full overflow-hidden rounded-3xl bg-white ring-1 ring-line shadow-emc-xs transition-all duration-300 ease-emc-out hover:-translate-y-1 hover:shadow-emc-md ${
          isList ? 'flex-row-reverse' : 'flex-col'
        }`}
      >
        {/* Cover */}
        <div
          className={`relative shrink-0 overflow-hidden ${
            isList ? 'w-56 md:w-64' : 'aspect-video w-full rounded-t-3xl'
          }`}
        >
          <img
            src={imgSrc}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/45 via-navy/5 to-transparent"
          />

          {/* Max two overlay chips: price + delivery */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <span
              dir={course.is_free ? undefined : 'ltr'}
              className={`rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums text-white shadow-emc-xs ${
                course.is_free ? 'bg-success' : 'bg-navy/90'
              }`}
            >
              {priceLabel}
            </span>
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-navy shadow-emc-xs backdrop-blur">
              {deliveryLabelAr(course)}
            </span>
          </div>

          {/* Availability state — subtle scrim, no internal status copy */}
          {(seatsFull || course.is_ended) && (
            <div className="absolute inset-0 flex items-end justify-center bg-night/45 pb-3 backdrop-blur-[1px]">
              <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-black text-navy shadow-emc-xs">
                {course.is_ended ? ENDED_COURSE_LABEL_AR : 'اكتملت المقاعد'}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col p-5 text-right">
          <h3 className="line-clamp-2 font-display text-lg font-black leading-snug tracking-tight text-ink-900 transition-colors duration-200 group-hover:text-brand-600">
            {course.title}
          </h3>

          {course.short_description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-600">
              {course.short_description}
            </p>
          )}

          {/* Single meta row: instructor · duration · start date */}
          <div className="mb-5 mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs font-medium text-ink-400">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{course.trainer.name}</span>
            </span>
            <span aria-hidden className="text-ink-200">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {course.duration_label}
            </span>
            {startLabel && (
              <>
                <span aria-hidden className="text-ink-200">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {startLabel}
                </span>
              </>
            )}
          </div>

          {/* Footer pinned to bottom so buttons align across the row */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p
              dir={course.is_free ? undefined : 'ltr'}
              className={`font-latin text-base font-black tabular-nums ${
                course.is_free ? 'text-success' : 'text-navy'
              }`}
            >
              {priceLabel}
            </p>

            <div className="flex items-center gap-2">
              <Link
                to={`/courses/${course.slug}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-black text-navy transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1"
              >
                تفاصيل
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <button
                type="button"
                disabled={registerDisabled}
                onClick={() => {
                  if (registerDisabled) return
                  gatePublicEnrollClick({
                    isAuthenticated,
                    role: user?.role,
                    redirectPath: buildCourseDetailEnrollHref(course.slug),
                    navigate,
                    onStudent: () => navigate(buildCourseDetailEnrollHref(course.slug)),
                  })
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-1 ${
                  registerDisabled
                    ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                    : 'bg-accent-500 text-white shadow-md shadow-accent-500/25 hover:brightness-[1.07]'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                سجل الآن
              </button>
            </div>
          </div>
        </div>
      </article>
    </motion.div>
  )
}

export default memo(CourseCard)

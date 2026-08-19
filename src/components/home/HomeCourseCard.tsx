import { memo } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { BookOpen, Clock, MapPin, Monitor } from 'lucide-react'
import type { Course } from '../../types'
import { formatPrice } from '../../utils/course'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import CourseStatusBadge from '@/components/shared/CourseStatusBadge'
import { resolveCourseIsEnded } from '@/utils/courseEnded'
import { resolveCourseSeatMetrics } from '@/utils/courseDetailPageData'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { OPEN_ENROLLMENT_LABEL, seatsLine } from '@/data/webSpec'
import { staggerItem } from '@/utils/animations'

type Props = { course: Course; index?: number }

// Design Language 2.0 — the featured course is an editorial ROW, not a card:
// flying-page thumbnail (emc-page-clip-sm) · serif title · one meta line ·
// price at the baseline with «تفاصيل الدورة» as a drawing-arc line CTA.
// The row sits on an emc-row hairline seat (hover: paper tint + sky bar).
function HomeCourseCard({ course }: Props) {
  const rawImg =
    course.course_image ||
    course.image_url ||
    course.thumbnail ||
    course.image ||
    course.cover_image

  const imgSrc = rawImg ? (resolvePublicAssetUrl(rawImg) ?? rawImg) : null

  const isFree = course.type === 'free' || Boolean(course.is_free) || Number(course.price) === 0
  const isOnline = Boolean(course.is_online)

  const instructorName = course.instructor?.name || course.instructor_name || null

  const hours = course.training_hours ? Math.round(Number(course.training_hours)) : null

  const isEnded = resolveCourseIsEnded(course)

  // §1.3 — no start date on a product row. «تسجيل مفتوح» takes its place, and the
  // seats line renders only when the API actually reports remaining seats.
  const seatsUrgency = isEnded ? null : seatsLine(resolveCourseSeatMetrics(course).remaining)

  return (
    <motion.article variants={staggerItem} aria-label={course.title} className="emc-row group relative">
      {/* Invisible cover link — the whole row navigates while the CTA keeps focus semantics */}
      <Link
        to={`/courses/${course.slug}`}
        className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue focus-visible:ring-offset-2"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="relative flex items-center gap-4 py-5 ps-3 sm:gap-6 sm:py-6 sm:ps-4">
        {/* Thumbnail — flying-page mask instead of a rounded box */}
        <div className="emc-page-clip-sm relative aspect-[16/10] w-24 shrink-0 sm:w-36">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={course.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-deepBlue to-customBlue">
              <BookOpen className="h-7 w-7 text-white/25 sm:h-9 sm:w-9" aria-hidden />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 text-right">
          {course.certificate && (
            <p className="mb-1 hidden text-[10px] font-bold tracking-wide text-customBlue sm:block">
              {course.certificate}
            </p>
          )}

          {!isEnded && (
            <p className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-bold sm:text-[11px]">
              <span className="rounded-full border border-line px-2 py-0.5 text-ocean">
                {OPEN_ENROLLMENT_LABEL}
              </span>
              {seatsUrgency && <span className="text-ink-400">{seatsUrgency}</span>}
            </p>
          )}

          {/* Serif title */}
          <h3 className="line-clamp-2 font-display text-base font-black leading-snug text-deepBlue transition group-hover:text-customBlue sm:line-clamp-1 sm:text-xl">
            {course.title}
          </h3>

          {/* One meta line */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-ink-400 sm:text-xs">
            {instructorName && <span className="truncate">مع {instructorName}</span>}
            {hours != null && (
              <span className="hidden items-center gap-1.5 sm:flex">
                <Clock className="h-3 w-3 shrink-0 text-customBlue" aria-hidden />
                {String(hours)} ساعة تدريبية
              </span>
            )}
            <span className="flex items-center gap-1.5">
              {isOnline ? (
                <Monitor className="h-3 w-3 shrink-0 text-customBlue" aria-hidden />
              ) : (
                <MapPin className="h-3 w-3 shrink-0 text-customBlue" aria-hidden />
              )}
              {isOnline ? 'عن بُعد' : course.location || 'حضوري في المركز'}
            </span>
          </div>

          {/* Baseline: price + line CTA */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="flex items-center gap-2.5">
              {isFree ? (
                <span className="text-sm font-black text-customBlue sm:text-base">مجاناً</span>
              ) : (
                <span className="font-latin text-base font-black tabular-nums text-deepBlue sm:text-lg" dir="ltr">
                  {formatPrice(course.price)}
                </span>
              )}
              {isEnded && <CourseStatusBadge isEnded placement="inline" />}
            </span>
            <Link
              to={`/courses/${course.slug}`}
              className="emc-cta-line relative z-10 text-xs sm:text-sm"
            >
              تفاصيل الدورة
              <ArrowLeftIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

// Memoized: rendered in a list by FeaturedCoursesSection, which re-renders on
// fetch/in-view state changes while individual course props stay stable.
export default memo(HomeCourseCard)

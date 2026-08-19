import { memo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router'
import type { CourseItem } from '@/services/coursesApi'
import { formatEuroInteger } from '@/utils/currency'
import { toLatinDigits } from '@/utils/publicDetailFormat'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { useAuth } from '@/contexts/AuthContext'
import { ENDED_COURSE_LABEL_AR } from '@/utils/courseEnded'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { OPEN_ENROLLMENT_LABEL, seatsLine } from '@/data/webSpec'
import {
  buildCourseDetailEnrollHref,
  gatePublicEnrollClick,
} from '@/utils/publicEnrollAuth'

type CourseCardProps = {
  course: CourseItem
  /** Kept for call-site compatibility (/programs passes it) — the editorial row is the one view. */
  viewMode?: 'grid' | 'list'
  index?: number
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

/** Design Language 2.0 — the course entry is an editorial list row (emc-row), not a boxed card.
 *  One hairline seat below, hover = paper tint + sliding sky bar; the ONLY box-like element is
 *  the money action «سجل الآن». */
function CourseCard({ course, index = 0 }: CourseCardProps) {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const imgSrc = course.thumbnail
    ? resolvePublicAssetUrl(course.thumbnail) ?? course.thumbnail
    : course.cover_placeholder

  const priceLabel = course.is_free ? 'مجاناً' : toLatinDigits(formatEuroInteger(course.price, 'ar'))

  // seats_count from the API means REMAINING seats (cards have always rendered
  // «registrations / seats_count متبقٍ») — full is when none remain, never when
  // registrations exceed it.
  const seatsFull = !course.is_ended && course.seats_count != null && course.seats_count <= 0
  const registerDisabled = course.is_ended || seatsFull

  // §1.3 — a paid product never shows a start date. Enrollment is open, and the
  // only urgency is the real remaining-seat count (hidden when the API omits it).
  const enrollmentOpen = !course.is_ended && !seatsFull
  const seatsUrgency = enrollmentOpen ? seatsLine(course.seats_count) : null

  const metaParts: string[] = [
    `مع ${course.trainer.name}`,
    course.duration_label,
    deliveryLabelAr(course),
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
      transition={{ duration: 0.4, delay: (index % 4) * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <article className="emc-row group">
        <div className="flex flex-col gap-4 py-6 pe-1 ps-3 text-start sm:flex-row sm:items-stretch sm:gap-6 sm:py-7 sm:ps-4">
          {/* Cover flying-page clip, not a rounded box */}
          <div className="emc-page-clip-sm relative aspect-video w-full shrink-0 sm:w-40 md:w-56">
            <img
              src={imgSrc}
              alt={course.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 ease-emc-out group-hover:scale-[1.03]"
            />
            {(seatsFull || course.is_ended) && (
              <div className="absolute inset-0 flex items-end bg-night/55">
                <p className="w-full pb-2.5 text-center text-xs font-black text-white">
                  {course.is_ended ? ENDED_COURSE_LABEL_AR : 'اكتملت المقاعد'}
                </p>
              </div>
            )}
          </div>

          {/* Content column title + one calm meta line */}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            {enrollmentOpen && (
              <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold">
                <span className="rounded-full border border-line px-2.5 py-0.5 text-ocean">
                  {OPEN_ENROLLMENT_LABEL}
                </span>
                {seatsUrgency && <span className="text-ink-400">{seatsUrgency}</span>}
              </p>
            )}
            <h3 className="line-clamp-2 font-display text-xl font-black leading-snug tracking-tight text-ink-900 transition-colors duration-200 group-hover:text-brand-600 sm:text-2xl">
              {course.title}
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-400">
              {metaParts.map((part, i) => (
                <span key={part + i}>
                  {i > 0 && (
                    <span aria-hidden className="mx-2 text-ink-200">
                      ·
                    </span>
                  )}
                  {part}
                </span>
              ))}
            </p>
          </div>

          {/* End column price above, actions seated on the row baseline */}
          <div className="flex items-end justify-between gap-4 sm:w-52 sm:shrink-0 sm:flex-col sm:items-end sm:justify-end">
            <p
              dir={course.is_free ? undefined : 'ltr'}
              className={`emc-stat-num font-display text-2xl ${course.is_free ? 'text-success' : ''}`}
            >
              {priceLabel}
            </p>

            <div className="flex items-center gap-5">
              <Link
                to={`/courses/${course.slug}`}
                className="emc-cta-line text-sm focus-visible:outline-none"
              >
                تفاصيل
                <ArrowLeftIcon className="h-3.5 w-3.5" />
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
                    // In-context QuickJoin: guests get the 3-field modal instead of leaving the page.
                    intent: {
                      kind: 'course',
                      slug: course.slug,
                      title: course.title,
                      isFree: course.is_free,
                      id: course.id,
                      price: typeof course.price === 'number' ? course.price : undefined,
                    },
                    onStudent: () => navigate(buildCourseDetailEnrollHref(course.slug)),
                  })
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-black transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-1 ${
                  registerDisabled
                    ? 'cursor-not-allowed bg-paper2 text-ink-300'
                    : 'bg-accent-500 text-white hover:bg-accent-600'
                }`}
              >
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

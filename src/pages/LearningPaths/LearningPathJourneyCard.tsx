import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Award, BadgeCheck, Route } from 'lucide-react'
import type { LearningPath } from '@/api/learningPathsApi'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { OPEN_ENROLLMENT_LABEL, seatsLine } from '@/data/webSpec'
import {
  courseDurationLabel,
  coursesCountLabel,
  formatPathDuration,
  formatPathPrice,
  journeyStations,
  levelLabelAr,
} from './learningPathDisplay'

type Props = {
  path: LearningPath
  index: number
  enrolled: boolean
}

/**
 * §1.3 — remaining seats for the next batch, read from the API only when it is
 * actually sent as a number. Nothing is inferred, so the urgency line simply
 * disappears rather than showing an invented count.
 */
function remainingSeats(path: LearningPath): number | null {
  const raw = path as unknown as Record<string, unknown>
  const value = raw.seats_remaining ?? raw.remaining_seats ?? raw.available_seats
  return typeof value === 'number' ? value : null
}

/**
 * Design 2.0: each path is a FULL-WIDTH editorial band (paper / brand tint
 * alternating), not a card in a grid — image masked with the flying-page clip
 * at the inline-start, serif title, the journey-stations rail drawn directly
 * on the band, a typographic price block, and a text CTA + one solid action.
 */
export default function LearningPathJourneyCard({ path, index, enrolled }: Props) {
  const href = `/learning-paths/${path.slug}`
  const cover = resolvePublicAssetUrl(path.featured_image) ?? null
  const duration = formatPathDuration(path)
  const price = formatPathPrice(path)
  const level = levelLabelAr(path.level)
  const { items: stations, extra } = journeyStations(path, 4)
  const fallbackCount = coursesCountLabel(path)
  const tinted = index % 2 === 1
  const seatsUrgency = path.enrollment_open ? seatsLine(remainingSeats(path)) : null

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={tinted ? 'bg-brand-50/30' : 'bg-paper'}
    >
      <div className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-14 lg:px-8 lg:py-16">
        {/* Image — flying-page mask, floated inline-start */}
        <Link to={href} aria-label={path.title} className="group block">
          <div className="emc-page-clip relative aspect-[4/3]">
            {cover ?
              <img
                src={cover}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            : <div className="flex h-full w-full items-center justify-center bg-navy">
                <Route className="h-12 w-12 text-ice/40" aria-hidden />
              </div>
            }
          </div>
        </Link>

        {/* Editorial body */}
        <div className="text-right">
          {/* Kicker — plain text meta */}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-muted-500">
            <span>مسار تعليمي</span>
            {path.is_featured && (
              <>
                <span aria-hidden>·</span>
                <span className="text-accent-700">مسار مميز</span>
              </>
            )}
            {level && (
              <>
                <span aria-hidden>·</span>
                <span>مستوى {level}</span>
              </>
            )}
            {path.language && (
              <>
                <span aria-hidden>·</span>
                <span>{path.language}</span>
              </>
            )}
            {enrolled ?
              <span className="ms-auto inline-flex items-center gap-1 font-black text-customBlue">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                مسجل في هذا المسار
              </span>
            : !path.enrollment_open ?
              <span className="ms-auto font-black text-accent-700">التسجيل مغلق حالياً</span>
            : <span className="ms-auto rounded-full border border-line px-2.5 py-0.5 text-ocean">
                {OPEN_ENROLLMENT_LABEL}
              </span>
            }
          </p>

          {/* §1.3 — seats, never dates, carry the urgency. Hidden when unknown. */}
          {seatsUrgency && !enrolled && (
            <p className="mt-1.5 text-xs font-bold text-ink-400">{seatsUrgency}</p>
          )}

          <h2 className="mt-2.5 font-display text-3xl font-black leading-snug tracking-tight text-deepBlue">
            <Link to={href} className="transition-colors duration-200 hover:text-customBlue">
              {path.title}
            </Link>
          </h2>

          {path.short_description && (
            <p className="mt-3 max-w-2xl text-[15px] leading-8 text-foreground/70">
              {path.short_description}
            </p>
          )}

          {/* Journey rail — the loved numbered stations, drawn on the band itself */}
          <div className="mt-7">
            <p className="mb-3 text-[11px] font-black tracking-wide text-muted-400">محطات المسار</p>
            {stations.length > 0 ?
              <ol className="relative space-y-3">
                <span
                  className="absolute bottom-3 top-3 start-[13px] w-[2px] rounded-full bg-sky/50"
                  aria-hidden
                />
                {stations.map((course, i) => {
                  const stationDuration = courseDurationLabel(course)
                  return (
                    <li key={course.id} className="flex items-center gap-3.5">
                      <span className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black tabular-nums text-deepBlue ring-2 ring-navy">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-600">
                        {course.title}
                      </span>
                      {stationDuration && (
                        <span
                          dir="ltr"
                          className="shrink-0 text-xs font-semibold tabular-nums text-muted-400"
                        >
                          {stationDuration}
                        </span>
                      )}
                    </li>
                  )
                })}
                {extra > 0 && (
                  <li className="flex items-center gap-3.5">
                    <span className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-300 bg-white text-[11px] font-black tabular-nums text-muted-500">
                      <span dir="ltr">+{String(extra)}</span>
                    </span>
                    <span className="truncate text-[13px] font-semibold text-muted-500">
                      دورات إضافية ضمن المسار
                    </span>
                  </li>
                )}
                {path.certificate_name && (
                  <li className="flex items-center gap-3.5">
                    <span className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
                      <Award className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-black text-deepBlue">الشهادة المعتمدة</span>
                      <span className="block truncate text-xs font-semibold text-accent-700">
                        {path.certificate_name}
                      </span>
                    </span>
                  </li>
                )}
              </ol>
            : <p className="flex items-center gap-2.5 text-sm font-bold text-deepBlue">
                <Route className="h-4 w-4 shrink-0 text-customBlue" aria-hidden />
                {fallbackCount ?? 'دورات مترابطة ضمن المسار'}
              </p>
            }
          </div>

          {/* Meta — plain text, no chips */}
          {(path.students_count > 0 || duration) && (
            <p className="mt-6 flex flex-wrap items-center gap-x-2 text-sm font-semibold text-muted-500">
              {path.students_count > 0 && (
                <span>
                  <span dir="ltr" className="tabular-nums">{path.students_count.toLocaleString('en-US')}</span>
                  {' '}متعلم
                </span>
              )}
              {path.students_count > 0 && duration && <span aria-hidden>·</span>}
              {duration && <span>{duration}</span>}
            </p>
          )}

          {/* Price + actions — seated at the band foot */}
          <div className="mt-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div className="min-w-0">
              {price.hasPrice ?
                price.isFree ?
                  <p className="emc-stat-num text-3xl">مجاناً</p>
                : <div>
                    {price.original && (
                      <p dir="ltr" className="text-right text-sm font-semibold tabular-nums text-muted-400 line-through">
                        {price.original}
                      </p>
                    )}
                    <p dir="ltr" className="emc-stat-num text-right text-4xl">
                      {price.label}
                    </p>
                  </div>
              : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              <Link to={href} className="emc-cta-line text-sm">
                عرض المسار
                <ArrowLeftIcon className="h-4 w-4" />
              </Link>
              {enrolled ?
                <Link
                  to={`/dashboard/student/learning-paths/${path.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white transition-colors duration-200 hover:bg-emerald-700"
                >
                  متابعة المسار
                </Link>
              : path.enrollment_open ?
                <Link
                  to={href}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-3 text-sm font-black text-white transition duration-200 hover:brightness-[1.03]"
                >
                  سجّل في المسار
                </Link>
              : null}
            </div>
          </div>
        </div>
      </div>

      {/* Seam between bands */}
      <div className="emc-hairline" aria-hidden />
    </motion.article>
  )
}

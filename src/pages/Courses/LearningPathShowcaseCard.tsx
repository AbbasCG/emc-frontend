import { memo } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Award, BadgeCheck, ChevronLeft, Clock, Route, Users } from 'lucide-react'
import type { LearningPath } from '@/api/learningPathsApi'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import {
  courseDurationLabel,
  coursesCountLabel,
  formatPathDuration,
  formatPathPrice,
  journeyStations,
  levelLabelAr,
} from '@/pages/LearningPaths/learningPathDisplay'

const PLACEHOLDER_GRADIENT = 'bg-gradient-to-br from-[#0C2A4B] to-[#0077B6]'

type Props = {
  path: LearningPath
  index: number
  enrolled: boolean
}

function LearningPathShowcaseCard({ path, index, enrolled }: Props) {
  const href = `/learning-paths/${path.slug}`
  const cover = resolvePublicAssetUrl(path.featured_image) ?? null
  const duration = formatPathDuration(path)
  const price = formatPathPrice(path)
  const level = levelLabelAr(path.level)
  const { items: stations, extra } = journeyStations(path, 4)
  const fallbackCount = coursesCountLabel(path)

  const primaryHref = enrolled ? `/dashboard/student/learning-paths/${path.id}` : href
  const primaryLabel = enrolled ? 'متابعة المسار' : 'عرض المسار'

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group overflow-hidden rounded-3xl border border-line bg-white transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-brand-200"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,280px)_1fr_minmax(0,230px)]">
        {/* Cover */}
        <div className="relative aspect-video overflow-hidden lg:aspect-auto lg:min-h-full">
          {cover ?
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            />
          : <div className={`flex h-full min-h-[180px] w-full items-center justify-center ${PLACEHOLDER_GRADIENT}`}>
              <Route className="h-14 w-14 text-white/30" aria-hidden />
            </div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C2A4B]/75 via-[#0C2A4B]/20 to-transparent" />

          {path.is_featured && (
            <span className="absolute start-3 top-3 rounded-md bg-[#F28C00] px-2 py-1 text-[10px] font-black text-white">
              مميز
            </span>
          )}
        </div>

        {/* Journey content */}
        <div className="flex min-w-0 flex-col p-5 text-right sm:p-6 lg:border-s lg:border-slate-100">
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500">
            {level && <span>مستوى {level}</span>}
            {level && path.language && <span className="text-slate-300">·</span>}
            {path.language && <span>{path.language}</span>}
            {enrolled ?
              <span className="ms-auto inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 font-black text-customBlue ring-1 ring-sky-100">
                <BadgeCheck className="h-3 w-3" aria-hidden />
                مسجل
              </span>
            : !path.enrollment_open ?
              <span className="ms-auto rounded-md bg-amber-50 px-2 py-0.5 font-black text-accent-700 ring-1 ring-amber-100">
                التسجيل مغلق
              </span>
            : null}
          </div>

          <h3 className="line-clamp-2 font-display text-xl font-black leading-snug tracking-tight text-deepBlue transition-colors duration-200 group-hover:text-customBlue sm:text-2xl">
            {path.title}
          </h3>

          {path.short_description && (
            <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{path.short_description}</p>
          )}

          {/* Journey rail */}
          <div className="mt-4">
            <p className="mb-2.5 text-[11px] font-black tracking-wide text-slate-400">محطات المسار</p>
            {stations.length > 0 ?
              <ol className="relative space-y-2.5">
                <span
                  className="absolute bottom-3 top-3 start-[11px] w-[2px] rounded-full bg-[#089FE0]/50"
                  aria-hidden
                />
                {stations.map((course, i) => {
                  const stationDuration = courseDurationLabel(course)
                  return (
                    <li key={course.id} className="flex items-center gap-3">
                      <span className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-black tabular-nums text-deepBlue ring-2 ring-navy">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-600">
                        {course.title}
                      </span>
                      {stationDuration && (
                        <span
                          dir="ltr"
                          className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400"
                        >
                          {stationDuration}
                        </span>
                      )}
                    </li>
                  )
                })}
                {extra > 0 && (
                  <li className="flex items-center gap-3">
                    <span className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-white text-[10px] font-black tabular-nums text-slate-500">
                      <span dir="ltr">+{String(extra)}</span>
                    </span>
                    <span className="truncate text-[12px] font-semibold text-slate-500">
                      دورات إضافية ضمن المسار
                    </span>
                  </li>
                )}
                {path.certificate_name && (
                  <li className="flex items-center gap-3">
                    <span className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
                      <Award className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-black text-deepBlue">الشهادة المعتمدة</span>
                      <span className="block truncate text-[11px] font-semibold text-accent-700">
                        {path.certificate_name}
                      </span>
                    </span>
                  </li>
                )}
              </ol>
            : <div className="flex items-center gap-2.5 rounded-xl bg-sky-50/70 px-3.5 py-3 ring-1 ring-sky-100">
                <Route className="h-4 w-4 shrink-0 text-customBlue" aria-hidden />
                <span className="text-[13px] font-bold text-deepBlue">
                  {fallbackCount ?? 'دورات مترابطة ضمن المسار'}
                </span>
              </div>
            }
          </div>
        </div>

        {/* Price + CTA — pinned */}
        <div className="flex flex-col border-t border-slate-100 bg-slate-50/60 p-5 text-right lg:border-t-0 lg:border-s lg:border-slate-100">
          <div>
            {price.hasPrice &&
              (price.isFree ?
                <p className="text-2xl font-black text-customBlue">مجاناً</p>
              : <div>
                  {price.original && (
                    <p dir="ltr" className="text-right text-[11px] font-semibold tabular-nums text-slate-400 line-through">
                      {price.original}
                    </p>
                  )}
                  <p dir="ltr" className="text-right text-2xl font-black tabular-nums text-deepBlue">
                    {price.label}
                  </p>
                </div>)}
            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-600">
              {path.students_count > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 ring-1 ring-slate-100">
                  <Users className="h-3 w-3 text-customBlue" aria-hidden />
                  <span dir="ltr" className="tabular-nums">
                    {path.students_count.toLocaleString('en-US')}
                  </span>
                  متعلم
                </span>
              )}
              {duration && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 ring-1 ring-slate-100">
                  <Clock className="h-3 w-3 text-customBlue" aria-hidden />
                  {duration}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 lg:mt-auto lg:pt-5">
            <Link
              to={primaryHref}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white transition-colors duration-200 ${
                enrolled ?
                  'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-customBlue hover:bg-brand-600'
              }`}
            >
              {primaryLabel}
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export default memo(LearningPathShowcaseCard)

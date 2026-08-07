import { Link, useNavigate } from 'react-router'
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
} from './learningPathDisplay'

const PLACEHOLDER_GRADIENT = 'bg-gradient-to-br from-[#0C2A4B] to-[#0077B6]'

type Props = {
  path: LearningPath
  index: number
  enrolled: boolean
}

export default function LearningPathJourneyCard({ path, index, enrolled }: Props) {
  const navigate = useNavigate()
  const href = `/learning-paths/${path.slug}`
  const cover = resolvePublicAssetUrl(path.featured_image) ?? null
  const duration = formatPathDuration(path)
  const price = formatPathPrice(path)
  const level = levelLabelAr(path.level)
  const { items: stations, extra } = journeyStations(path, 4)
  const fallbackCount = coursesCountLabel(path)

  const ctaLabel = enrolled ? 'متابعة المسار' : 'عرض المسار'
  const ctaHref = enrolled ? `/dashboard/student/learning-paths/${path.id}` : href

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: (index % 3) * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      role="link"
      tabIndex={0}
      onClick={() => navigate(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(href)
        }
      }}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-emc transition-[transform,box-shadow,border-color,background-color] duration-300 hover:-translate-y-1 hover:border-brand-200 hover:bg-sky-50/30 hover:shadow-emc-lg"
    >
      {/* Cover — 16:9 */}
      <div className="relative aspect-video w-full shrink-0 overflow-hidden">
        {cover ?
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
          />
        : <div className={`flex h-full w-full items-center justify-center ${PLACEHOLDER_GRADIENT}`}>
            <Route className="h-12 w-12 text-white/30" aria-hidden />
          </div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C2A4B]/70 via-[#0C2A4B]/15 to-transparent" />

        {path.is_featured && (
          <span className="absolute start-3 top-3 rounded-md bg-[#F28C00] px-2 py-1 text-[10px] font-black text-white shadow-sm">
            مميز
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5 text-right">
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

        <h2 className="line-clamp-2 font-display text-lg font-black leading-snug tracking-tight text-deepBlue transition-colors duration-200 group-hover:text-customBlue">
          {path.title}
        </h2>

        {path.short_description && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-6 text-slate-500">
            {path.short_description}
          </p>
        )}

        {/* Journey rail — the centerpiece */}
        <div className="mt-4 flex-1">
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
                  <span className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white shadow-sm">
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

        {/* Footer — pinned */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              {price.hasPrice ?
                price.isFree ?
                  <p className="text-lg font-black text-customBlue">مجاناً</p>
                : <div>
                    {price.original && (
                      <p dir="ltr" className="text-right text-[11px] font-semibold tabular-nums text-slate-400 line-through">
                        {price.original}
                      </p>
                    )}
                    <p dir="ltr" className="text-right text-lg font-black tabular-nums text-deepBlue">
                      {price.label}
                    </p>
                  </div>
              : null}
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5 text-[11px] font-bold text-slate-600">
              {path.students_count > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-100">
                  <Users className="h-3 w-3 text-customBlue" aria-hidden />
                  <span dir="ltr" className="tabular-nums">
                    {path.students_count.toLocaleString('en-US')}
                  </span>
                  متعلم
                </span>
              )}
              {duration && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-100">
                  <Clock className="h-3 w-3 text-customBlue" aria-hidden />
                  {duration}
                </span>
              )}
            </div>
          </div>

          <Link
            to={ctaHref}
            onClick={(e) => e.stopPropagation()}
            className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white shadow-md transition-colors duration-200 ${
              enrolled ?
                'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'
              : 'bg-customBlue shadow-customBlue/25 hover:bg-brand-600'
            }`}
          >
            {ctaLabel}
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

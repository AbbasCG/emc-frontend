import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Award,
  BadgeCheck,
  BookOpen,
  ChevronLeft,
  Clock,
  GraduationCap,
  Route,
  Star,
} from 'lucide-react'
import type { LearningPath } from '@/api/learningPathsApi'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import {
  coursesCountLabel,
  curriculumPreview,
  formatPathDuration,
  formatPathPrice,
  levelLabelAr,
} from './learningPathDisplay'

const PLACEHOLDER_GRADIENT = 'bg-gradient-to-br from-[#22334A] to-[#2691C2]'

type Props = {
  path: LearningPath
  index: number
  enrolled: boolean
}

function LevelPill({ level }: { level: string | null }) {
  const label = levelLabelAr(level)
  if (!label) return null
  const key = level?.toLowerCase() ?? ''
  const colors: Record<string, string> = {
    beginner: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    intermediate: 'bg-amber-50 text-amber-800 ring-amber-100',
    advanced: 'bg-rose-50 text-rose-800 ring-rose-100',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${colors[key] ?? 'bg-slate-50 text-slate-700 ring-slate-100'}`}>
      {label}
    </span>
  )
}

export default function LearningPathJourneyCard({ path, index, enrolled }: Props) {
  const navigate = useNavigate()
  const href = `/learning-paths/${path.slug}`
  const cover = resolvePublicAssetUrl(path.featured_image) ?? null
  const duration = formatPathDuration(path)
  const coursesLabel = coursesCountLabel(path)
  const price = formatPathPrice(path)
  const preview = curriculumPreview(path)
  const extraCount =
    path.courses_count > preview.length ? path.courses_count - preview.length : 0

  const ctaLabel = enrolled ? 'متابعة المسار' : 'عرض المسار'
  const ctaHref =
    enrolled ? `/dashboard/student/learning-paths/${path.id}` : href

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      role="link"
      tabIndex={0}
      onClick={() => navigate(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(href)
        }
      }}
      className="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:border-[#2691C2]/35 hover:shadow-xl"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,240px)_1fr_minmax(0,200px)]">
          {/* Cover + journey spine */}
          <div className="relative min-h-[180px] overflow-hidden lg:min-h-[220px]">
            {cover ?
              <img
                src={cover}
                alt=""
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
              />
            : <div className={`flex h-full min-h-[180px] items-center justify-center ${PLACEHOLDER_GRADIENT}`}>
                <Route className="h-14 w-14 text-white/35" aria-hidden />
              </div>
            }
            <div className="absolute inset-0 bg-gradient-to-t from-[#22334A]/75 via-[#22334A]/20 to-transparent" />

            {path.is_featured && (
              <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#EC943C] px-2.5 py-1 text-[10px] font-black text-white shadow">
                <Star className="h-3 w-3 fill-white" aria-hidden />
                مميز
              </span>
            )}

            <div className="absolute bottom-3 start-3 end-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-deepBlue shadow backdrop-blur">
                <Route className="h-3 w-3 text-customBlue" aria-hidden />
                مسار تعليمي
              </span>
            </div>
          </div>

          {/* Main journey content */}
          <div className="flex min-w-0 flex-col p-5 text-right sm:p-6 lg:border-s lg:border-slate-100">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <LevelPill level={path.level} />
              {path.enrollment_open ?
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-100">
                  التسجيل مفتوح
                </span>
              : <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-black text-orange-800 ring-1 ring-orange-100">
                  التسجيل مغلق
                </span>
              }
              {path.certificate_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-black text-violet-800 ring-1 ring-violet-100">
                  <Award className="h-3 w-3" aria-hidden />
                  شهادة
                </span>
              )}
              {enrolled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-black text-customBlue ring-1 ring-sky-100">
                  <BadgeCheck className="h-3 w-3" aria-hidden />
                  مسجل
                </span>
              )}
            </div>

            <h2 className="text-xl font-black leading-snug text-deepBlue transition group-hover:text-customBlue sm:text-2xl">
              {path.title}
            </h2>

            {path.short_description && (
              <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{path.short_description}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-[12px] font-semibold text-slate-600">
              {duration && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">
                  <Clock className="h-3.5 w-3.5 text-customBlue" aria-hidden />
                  {duration}
                </span>
              )}
              {coursesLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">
                  <BookOpen className="h-3.5 w-3.5 text-customOrange" aria-hidden />
                  {coursesLabel}
                </span>
              )}
              {path.language && (
                <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">{path.language}</span>
              )}
            </div>

            {path.instructor && (
              <div className="mt-4 flex items-center justify-start gap-2.5">
                {path.instructor.avatar_url ?
                  <img
                    src={resolvePublicAssetUrl(path.instructor.avatar_url) ?? path.instructor.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-sky-50"
                  />
                : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-customBlue/10 text-[11px] font-black text-customBlue">
                    {path.instructor.name.charAt(0)}
                  </div>
                }
                <div className="min-w-0 text-right">
                  <p className="truncate text-sm font-black text-deepBlue">{path.instructor.name}</p>
                  {path.instructor.title && (
                    <p className="truncate text-[11px] font-semibold text-slate-500">{path.instructor.title}</p>
                  )}
                </div>
              </div>
            )}

            {/* Timeline / curriculum preview */}
            {(preview.length > 0 || coursesLabel) && (
              <div className="mt-5 min-w-0">
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">محطات المسار</p>
                <div className="relative flex min-w-0 items-start gap-0 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {preview.length > 0 ?
                    preview.map((course, step) => (
                      <div key={course.id} className="flex min-w-0 shrink-0 items-center">
                        <div className="flex w-[7.5rem] min-w-0 flex-col items-center text-center sm:w-[8.5rem]">
                          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-customBlue text-xs font-black text-white shadow-md shadow-customBlue/25">
                            {step + 1}
                          </div>
                          <p className="mt-2 line-clamp-2 w-full px-1 text-[11px] font-bold leading-5 text-deepBlue">
                            {course.title}
                          </p>
                        </div>
                        {step < preview.length - 1 && (
                          <div
                            className="mx-1 mt-4 h-0.5 w-6 shrink-0 bg-gradient-to-l from-customBlue/20 to-customBlue sm:w-10"
                            aria-hidden
                          />
                        )}
                      </div>
                    ))
                  : coursesLabel ?
                    <div className="flex items-center gap-2 rounded-xl bg-sky-50/80 px-4 py-3 text-sm font-semibold text-deepBlue ring-1 ring-sky-100">
                      <GraduationCap className="h-4 w-4 text-customBlue" aria-hidden />
                      {coursesLabel} في هذا المسار
                    </div>
                  : null}
                  {extraCount > 0 && (
                    <div className="ms-2 shrink-0 self-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                      +{String(extraCount)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Price + CTA column */}
          <div className="flex flex-col justify-between border-t border-slate-100 bg-slate-50/50 p-5 text-right lg:border-t-0 lg:border-s lg:border-slate-100">
            <div>
              {price.hasPrice && (
                <div className="mb-1">
                  {price.original && (
                    <p className="text-[11px] font-semibold text-slate-400 line-through">{price.original}</p>
                  )}
                  <p className={`text-2xl font-black ${price.isFree ? 'text-customBlue' : 'text-customOrange'}`}>
                    {price.label}
                  </p>
                </div>
              )}
              {path.certificate_name && (
                <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-5 text-violet-700">
                  {path.certificate_name}
                </p>
              )}
            </div>

            <Link
              to={ctaHref}
              onClick={(e) => e.stopPropagation()}
              className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-black text-white shadow-md transition ${
                enrolled ?
                  'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'
                : 'bg-customBlue shadow-customBlue/25 hover:bg-[#1d7aab]'
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

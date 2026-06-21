import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Award,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronLeft,
  Clock,
  Route,
  Star,
} from 'lucide-react'
import type { LearningPath } from '@/api/learningPathsApi'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import {
  coursePreviewItems,
  formatPathDuration,
  formatPathPrice,
  includedCoursesHeading,
  levelLabelAr,
} from '@/pages/LearningPaths/learningPathDisplay'

const PLACEHOLDER_GRADIENT = 'bg-gradient-to-br from-[#0C2A4B] to-[#0077B6]'

type Props = {
  path: LearningPath
  index: number
  enrolled: boolean
}

export default function LearningPathShowcaseCard({ path, index, enrolled }: Props) {
  const href = `/learning-paths/${path.slug}`
  const cover = resolvePublicAssetUrl(path.featured_image) ?? null
  const duration = formatPathDuration(path)
  const includedHeading = includedCoursesHeading(path)
  const price = formatPathPrice(path)
  const { items: previewCourses, extra } = coursePreviewItems(path, 3)
  const level = levelLabelAr(path.level)

  const primaryHref = enrolled ? `/dashboard/student/learning-paths/${path.id}` : href
  const primaryLabel = enrolled ? 'متابعة المسار' : 'عرض المسار'

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className="group overflow-hidden rounded-3xl border border-[#0C2A4B]/10 bg-white shadow-lg transition-all duration-300 hover:border-[#0077B6]/30 hover:shadow-xl"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,260px)_1fr_minmax(0,220px)]">
        {/* Cover */}
        <div className="relative min-h-[200px] overflow-hidden lg:min-h-full">
          {cover ?
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            />
          : <div className={`flex h-full min-h-[200px] items-center justify-center ${PLACEHOLDER_GRADIENT}`}>
              <Route className="h-16 w-16 text-white/30" aria-hidden />
            </div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C2A4B]/80 via-[#0C2A4B]/25 to-transparent" />

          {path.is_featured && (
            <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#F28C00] px-2.5 py-1 text-[10px] font-black text-white shadow">
              <Star className="h-3 w-3 fill-white" aria-hidden />
              مميز
            </span>
          )}

          <div className="absolute bottom-3 start-3 end-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-deepBlue shadow backdrop-blur">
              <Route className="h-3 w-3 text-customBlue" aria-hidden />
              رحلة احترافية
            </span>
            {price.hasPrice && (
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black shadow backdrop-blur ${
                  price.isFree ? 'bg-customBlue/95 text-white' : 'bg-[#F28C00]/95 text-white'
                }`}
              >
                {price.label}
              </span>
            )}
          </div>
        </div>

        {/* Main info */}
        <div className="flex min-w-0 flex-col p-5 text-right sm:p-6 lg:border-s lg:border-slate-100">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {level && (
              <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-black text-deepBlue ring-1 ring-slate-100">
                {level}
              </span>
            )}
            {path.enrollment_open ?
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-100">
                التسجيل مفتوح
              </span>
            : <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-black text-orange-800 ring-1 ring-orange-100">
                التسجيل مغلق
              </span>
            }
            {enrolled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-black text-customBlue ring-1 ring-sky-100">
                <BadgeCheck className="h-3 w-3" aria-hidden />
                مسجل
              </span>
            )}
          </div>

          <h3 className="text-xl font-black leading-snug text-deepBlue transition group-hover:text-customBlue sm:text-2xl">
            {path.title}
          </h3>

          {path.short_description && (
            <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{path.short_description}</p>
          )}

          {path.instructor && (
            <div className="mt-4 flex items-center justify-start gap-2.5">
              {path.instructor.avatar_url ?
                <img
                  src={resolvePublicAssetUrl(path.instructor.avatar_url) ?? path.instructor.avatar_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-sky-50"
                />
              : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-customBlue/10 text-xs font-black text-customBlue">
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

          {(includedHeading || previewCourses.length > 0) && (
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-sky-50/90 to-white p-4 ring-1 ring-sky-100/80">
              {includedHeading && (
                <p className="mb-3 flex items-center gap-2 text-sm font-black text-deepBlue">
                  <BookOpen className="h-4 w-4 shrink-0 text-customOrange" aria-hidden />
                  {includedHeading}
                </p>
              )}
              {previewCourses.length > 0 ?
                <ul className="space-y-2">
                  {previewCourses.map((course) => (
                    <li key={course.id} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      <span className="line-clamp-1">{course.title}</span>
                    </li>
                  ))}
                  {extra > 0 && (
                    <li className="ps-6 text-xs font-black text-customBlue">+{String(extra)} المزيد</li>
                  )}
                </ul>
              : includedHeading ?
                <p className="text-xs font-semibold text-slate-500">محتوى متكامل من دورات مترابطة</p>
              : null}
            </div>
          )}
        </div>

        {/* Stats + CTA */}
        <div className="flex flex-col justify-between border-t border-slate-100 bg-gradient-to-br from-[#0C2A4B]/[0.03] to-white p-5 text-right lg:border-t-0 lg:border-s lg:border-slate-100">
          <div className="space-y-3">
            {duration && (
              <div className="flex items-center justify-start gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-100">
                <Clock className="h-4 w-4 shrink-0 text-customBlue" aria-hidden />
                <div>
                  <p className="text-[10px] font-bold text-slate-400">المدة</p>
                  <p className="text-sm font-black text-deepBlue">{duration}</p>
                </div>
              </div>
            )}
            {includedHeading && (
              <div className="flex items-center justify-start gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-100">
                <BookOpen className="h-4 w-4 shrink-0 text-customOrange" aria-hidden />
                <div>
                  <p className="text-[10px] font-bold text-slate-400">الدورات</p>
                  <p className="text-sm font-black text-deepBlue">{includedHeading}</p>
                </div>
              </div>
            )}
            {path.certificate_name && (
              <div className="flex items-center justify-start gap-2 rounded-xl bg-violet-50/80 px-3 py-2.5 ring-1 ring-violet-100">
                <Award className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-violet-500">الشهادة</p>
                  <p className="line-clamp-2 text-xs font-black leading-5 text-violet-900">
                    {path.certificate_name}
                  </p>
                </div>
              </div>
            )}
            {price.hasPrice && (
              <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-100">
                {price.original && (
                  <p className="text-[11px] font-semibold text-slate-400 line-through">{price.original}</p>
                )}
                <p className={`text-xl font-black ${price.isFree ? 'text-customBlue' : 'text-accent-700'}`}>
                  {price.label}
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-2.5">
            <Link
              to={primaryHref}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-black text-white shadow-md transition ${
                enrolled ?
                  'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'
                : 'bg-customBlue shadow-customBlue/25 hover:bg-[#1d7aab]'
              }`}
            >
              {primaryLabel}
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to={href}
              className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-[#F28C00]/40 px-4 py-2.5 text-xs font-black text-accent-700 transition hover:border-[#F28C00] hover:bg-[#F28C00]/5"
            >
              استكشف المسار
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

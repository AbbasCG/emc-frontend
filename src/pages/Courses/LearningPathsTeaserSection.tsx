import { memo, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Award, BookOpen, ChevronLeft, Clock, Route } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import type { LearningPath } from '@/api/learningPathsApi'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import {
  coursesCountLabel,
  formatPathDuration,
  formatPathPrice,
  journeyStations,
} from '@/pages/LearningPaths/learningPathDisplay'

const PLACEHOLDER = 'bg-gradient-to-br from-deepBlue to-customBlue'
const MAX_PATHS = 3

type Props = {
  paths: LearningPath[]
  loading: boolean
}

function TeaserSkeleton() {
  return (
    <div className="grid overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-[140px_1fr_auto]">
      <Skeleton className="min-h-[120px] rounded-none sm:min-h-full" />
      <div className="p-4">
        <Skeleton variant="text" className="h-3 w-20" />
        <Skeleton variant="text" className="mt-2.5 h-4 w-3/5" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 2 }).map((_, s) => (
            <div key={s} className="flex items-center gap-2.5">
              <Skeleton variant="circular" width={20} height={20} />
              <Skeleton variant="text" className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
      <div className="hidden w-28 flex-col items-center justify-center gap-2 border-s border-slate-100 sm:flex">
        <Skeleton variant="text" className="h-4 w-12" />
        <Skeleton variant="text" className="h-3 w-16" />
      </div>
    </div>
  )
}

function TeaserCard({ path }: { path: LearningPath }) {
  const cover = resolvePublicAssetUrl(path.featured_image) ?? null
  const duration = formatPathDuration(path)
  const coursesLabel = coursesCountLabel(path)
  const price = formatPathPrice(path)
  const { items: stations, extra } = journeyStations(path, 2)

  return (
    <Link
      to={`/learning-paths/${path.slug}`}
      className="group grid overflow-hidden rounded-2xl border border-line bg-white transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand-200 sm:grid-cols-[140px_1fr_auto]"
    >
      <div className="relative min-h-[120px] overflow-hidden sm:min-h-full">
        {cover ?
          <img src={cover} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        : <div className={`flex h-full min-h-[120px] items-center justify-center ${PLACEHOLDER}`}>
            <Route className="h-10 w-10 text-white/30" aria-hidden />
          </div>
        }
        {path.is_featured && (
          <span className="absolute start-2 top-2 rounded-md bg-customOrange px-1.5 py-0.5 text-[10px] font-black text-white">
            مميز
          </span>
        )}
      </div>

      <div className="min-w-0 p-4 text-right sm:py-4 sm:pe-4 sm:ps-3">
        <span className="mb-2 inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-black text-customBlue ring-1 ring-sky-100">
          <Route className="h-3 w-3" aria-hidden />
          مسار احترافي
        </span>
        <h3 className="line-clamp-1 font-display text-base font-black tracking-tight text-deepBlue transition group-hover:text-customBlue sm:text-lg">
          {path.title}
        </h3>

        {stations.length > 0 ?
          <ol className="relative mt-2.5 space-y-1.5">
            <span
              className="absolute bottom-2.5 top-2.5 start-[9px] w-[2px] rounded-full bg-sky/50"
              aria-hidden
            />
            {stations.map((course, i) => (
              <li key={course.id} className="flex items-center gap-2.5">
                <span className="relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black tabular-nums text-deepBlue ring-2 ring-navy">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-ink-600">
                  {course.title}
                </span>
              </li>
            ))}
            {path.certificate_name ?
              <li className="flex items-center gap-2.5">
                <span className="relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
                  <Award className="h-3 w-3" aria-hidden />
                </span>
                <span className="truncate text-[12px] font-black text-deepBlue">
                  {extra > 0 ?
                    <>
                      <span dir="ltr" className="tabular-nums">+{String(extra)}</span>
                      {' دورات ثم الشهادة المعتمدة'}
                    </>
                  : 'الشهادة المعتمدة'}
                </span>
              </li>
            : extra > 0 ?
              <li className="flex items-center gap-2.5">
                <span className="relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-white text-[9px] font-black tabular-nums text-slate-500">
                  <span dir="ltr">+{String(extra)}</span>
                </span>
                <span className="truncate text-[12px] font-semibold text-slate-500">
                  دورات إضافية ضمن المسار
                </span>
              </li>
            : null}
          </ol>
        : <>
            {path.short_description && (
              <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-600 sm:text-sm">{path.short_description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
              {duration && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3 text-customBlue" aria-hidden />
                  {duration}
                </span>
              )}
              {coursesLabel && (
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-ember" aria-hidden />
                  {coursesLabel}
                </span>
              )}
            </div>
          </>
        }
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-col sm:justify-center sm:border-t-0 sm:border-s sm:px-4">
        {price.hasPrice &&
          (price.isFree ?
            <p className="text-sm font-black text-customBlue">مجاناً</p>
          : <p dir="ltr" className="text-sm font-black tabular-nums text-accent-700">{price.label}</p>)}
        <span className="inline-flex items-center gap-1 text-xs font-black text-customBlue">
          عرض المسار
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}

function LearningPathsTeaserSection({ paths, loading }: Props) {
  const [active, setActive] = useState(0)

  const featured = useMemo(
    () =>
      [...paths]
        .sort((a, b) => {
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
          return b.id - a.id
        })
        .slice(0, MAX_PATHS),
    [paths],
  )

  if (!loading && featured.length === 0) return null

  const current = featured[active] ?? featured[0]

  return (
    <section id="learning-paths-teaser" className="scroll-mt-28 border-b border-slate-100 bg-brand-50/60 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-4 flex flex-col gap-3 text-right sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-accent-700">
              المسارات الاحترافية
            </span>
            <h2 className="font-display text-xl font-black tracking-tight text-deepBlue sm:text-2xl">رحلة تعليمية متكاملة</h2>
          </div>
          <Link
            to="/learning-paths"
            className="inline-flex items-center gap-2 self-start rounded-xl border-2 border-deepBlue px-5 py-2.5 text-sm font-bold text-deepBlue transition hover:bg-deepBlue hover:text-white sm:self-auto"
          >
            عرض كل المسارات
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {loading ?
          <TeaserSkeleton />
        : <>
            {featured.length === 1 && current ?
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <TeaserCard path={current} />
              </motion.div>
            : current ?
              <div>
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <TeaserCard path={current} />
                </motion.div>
                {featured.length > 1 && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    {featured.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        aria-label={`مسار ${String(i + 1)}`}
                        onClick={() => setActive(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === active ? 'w-6 bg-customBlue' : 'w-2 bg-slate-300 hover:bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            : null}
          </>
        }
      </div>
    </section>
  )
}

export default memo(LearningPathsTeaserSection)

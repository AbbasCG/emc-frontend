import { useMemo, useRef } from 'react'
import { Link } from 'react-router'
import { motion, useInView } from 'framer-motion'
import { ChevronLeft, Route, Sparkles } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import type { LearningPath } from '@/api/learningPathsApi'
import LearningPathShowcaseCard from './LearningPathShowcaseCard'

type Props = {
  paths: LearningPath[]
  loading: boolean
  enrolledIds: Set<number>
}

function ShowcaseSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
          <div className="grid lg:grid-cols-[minmax(0,280px)_1fr_minmax(0,230px)]">
            <Skeleton className="aspect-video rounded-none lg:aspect-auto lg:h-full" />
            <div className="p-6">
              <Skeleton variant="text" className="h-3 w-1/4" />
              <Skeleton variant="text" className="mt-3 h-6 w-3/5" />
              <div className="mt-6 space-y-3">
                {Array.from({ length: 3 }).map((_, s) => (
                  <div key={s} className="flex items-center gap-3">
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="text" className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden flex-col justify-between border-s border-slate-100 p-5 lg:flex">
              <div>
                <Skeleton variant="text" className="h-7 w-24" />
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-lg" />
                  <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LearningPathsShowcaseSection({ paths, loading, enrolledIds }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-40px' })

  const sortedPaths = useMemo(
    () =>
      [...paths].sort((a, b) => {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
        return b.id - a.id
      }),
    [paths],
  )

  if (!loading && paths.length === 0) return null

  return (
    <section
      id="learning-paths-showcase"
      ref={sectionRef}
      className="scroll-mt-28 border-y border-slate-100 bg-gradient-to-b from-[#e8f2f9] via-[#f4f8fc] to-white py-10 md:py-12"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col gap-4 text-right md:mb-10 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              رحلة تعليمية متكاملة
            </span>
            <h2 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue md:text-3xl">المسارات الاحترافية</h2>
            <p className="mt-5 text-sm leading-7 text-slate-600 md:text-base">
              الدورة = تدريب واحد · المسار = رحلة مهنية كاملة دورات مترابطة، شهادة معتمدة، ومسار واضح من
              البداية إلى الاحتراف.
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-3 rounded-2xl border border-customBlue/15 bg-white/80 px-5 py-4 md:flex">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-customBlue/10">
              <Route className="h-5 w-5 text-customBlue" aria-hidden />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400">عرض مميز</p>
              <p className="text-sm font-black text-deepBlue">
                {loading ? '…' : (
                  <>
                    <span dir="ltr" className="tabular-nums">
                      {sortedPaths.length.toLocaleString('en-US')}
                    </span>
                    {' مسار متاح'}
                  </>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {loading ?
          <ShowcaseSkeleton />
        : <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-1">
            {sortedPaths.map((path, i) => (
              <LearningPathShowcaseCard
                key={path.id}
                path={path}
                index={i}
                enrolled={enrolledIds.has(path.id)}
              />
            ))}
          </div>
        }

        {!loading && sortedPaths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.25 }}
            className="mt-8 flex justify-center"
          >
            <Link
              to="/learning-paths"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#F28C00] px-8 py-3.5 text-sm font-black text-white transition hover:bg-accent-600"
            >
              ابدأ رحلتك التعليمية
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  )
}

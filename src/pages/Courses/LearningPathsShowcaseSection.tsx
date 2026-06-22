import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { ChevronLeft, Route, Sparkles } from 'lucide-react'
import type { LearningPath } from '@/api/learningPathsApi'
import LearningPathShowcaseCard from './LearningPathShowcaseCard'

type Props = {
  paths: LearningPath[]
  loading: boolean
  enrolledIds: Set<number>
}

function ShowcaseSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-1">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="h-[420px] animate-pulse overflow-hidden rounded-3xl border border-slate-100 bg-white lg:h-[260px]"
        />
      ))}
    </div>
  )
}

export default function LearningPathsShowcaseSection({ paths, loading, enrolledIds }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-40px' })

  if (!loading && paths.length === 0) return null

  const sortedPaths = [...paths].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
    return b.id - a.id
  })

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
              الدورة = تدريب واحد · المسار = رحلة مهنية كاملة — دورات مترابطة، شهادة معتمدة، ومسار واضح من
              البداية إلى الاحتراف.
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-3 rounded-2xl border border-customBlue/15 bg-white/80 px-5 py-4 shadow-sm md:flex">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-customBlue/10">
              <Route className="h-5 w-5 text-customBlue" aria-hidden />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400">عرض مميز</p>
              <p className="text-sm font-black text-deepBlue">
                {loading ? '…' : `${sortedPaths.length.toLocaleString('ar-EG')} مسار متاح`}
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
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link
              to="/learning-paths"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#F28C00] px-8 py-3.5 text-sm font-black text-white shadow-emc-glow-accent transition hover:bg-accent-600"
            >
              ابدأ رحلتك التعليمية
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/learning-paths"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-deepBlue px-8 py-3.5 text-sm font-bold text-deepBlue transition hover:bg-deepBlue hover:text-white"
            >
              استكشف جميع المسارات
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  )
}

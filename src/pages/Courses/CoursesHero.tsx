import { useRef, useState, useEffect, memo, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { motion, useInView } from 'framer-motion'
import { Search } from 'lucide-react'

export type HeroCategoryOption = { value: string; label: string }

export type CoursesHeroStats = {
  totalCourses: number
  totalRegistrations: number
  instructors: number
  learningPathsCount: number
}

type CoursesHeroProps = {
  onSearch: (query: string) => void
  /** Controlled search value — lets page-level «مسح الفلاتر» clear the hero input too. */
  searchValue?: string
  activeCategory: string
  onCategoryChange: (category: string) => void
  categoryOptions: HeroCategoryOption[]
  stats: CoursesHeroStats
}

/**
 * Visible by default (no IntersectionObserver — the band is above the fold);
 * the count-up starts in a mount effect and re-runs when live stats arrive.
 * Design Language 2.0: the stat is a typographic statement (emc-stat-num),
 * seated between thin vertical hairlines — no chips, no cards.
 */
const StatCounter = memo(function StatCounter({
  value,
  label,
  suffix,
}: {
  value: number
  label: string
  suffix: string
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Async by design (effect-patterns.md): jump straight to the final value on the next frame.
      const id = requestAnimationFrame(() => setCount(value))
      return () => cancelAnimationFrame(id)
    }
    let frame = 0
    const totalFrames = 60
    const timer = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * value))
      if (frame >= totalFrames) clearInterval(timer)
    }, 20)
    return () => clearInterval(timer)
  }, [value])

  return (
    <div className="px-5 text-center md:px-10 md:first:border-s-0 md:border-s md:border-white/10">
      <p className="emc-stat-num font-display text-4xl text-white md:text-5xl" dir="ltr">
        {suffix}
        {count.toLocaleString('en-US')}
      </p>
      <p className="mt-2 text-xs font-medium text-ice/80 md:text-sm">{label}</p>
    </div>
  )
})

const easing: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

function CoursesHero({
  onSearch,
  searchValue,
  activeCategory,
  onCategoryChange,
  categoryOptions,
  stats,
}: CoursesHeroProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-40px' })

  function handleSearch(e: ChangeEvent<HTMLInputElement>) {
    onSearch(e.target.value)
  }

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 32 },
    animate: isInView ? { opacity: 1, y: 0 } : {},
    transition: { duration: 0.6, delay, ease: easing },
  })

  const statsRow = [
    { value: stats.totalCourses, label: 'برنامج في الكتالوج', suffix: '' },
    { value: stats.totalRegistrations, label: 'تسجيل مُسجَّل', suffix: '+' },
    { value: stats.instructors, label: 'مدرّب ومدرّبة', suffix: '+' },
    { value: stats.learningPathsCount, label: 'مسار متاح للتسجيل', suffix: '' },
  ]

  return (
    <section ref={sectionRef} className="emc-dawn emc-corner-pages emc-corner-pages-white relative overflow-hidden pt-28 pb-16">
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        {/* Eyebrow plain typography, no badge chrome */}
        <motion.p {...fadeUp(0)} className="mb-5 flex items-center justify-center gap-2 text-xs font-bold tracking-wide text-brand-200">
          <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />
          EMC · Educational Mastar Central
        </motion.p>

        <motion.h1
          {...fadeUp(0.1)}
          className="mb-4 text-center font-display text-4xl font-black leading-[1.1] tracking-tight text-white md:text-6xl"
        >
          استكشف برامجنا
        </motion.h1>
        <motion.p {...fadeUp(0.18)} className="mb-10 text-center text-lg leading-relaxed text-ice/80 md:text-xl">
          ورش عمل · دورات · مسارات مصممة لتأخذك من الصفر إلى الشهادة الاحترافية
        </motion.p>

        {/* Search a form field is functional chrome; kept light, no heavy shadow */}
        <motion.div {...fadeUp(0.26)} className="relative mx-auto mb-7 max-w-2xl">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-400" aria-hidden />
          <input
            type="search"
            value={searchValue ?? ''}
            onChange={handleSearch}
            placeholder="ابحث عن دورة أو مدرّب…"
            className="h-12 w-full rounded-xl bg-white/95 pe-4 ps-12 text-base font-medium text-deepBlue outline-none transition-colors duration-200 placeholder:text-muted-400/80 focus:bg-white focus:ring-2 focus:ring-brand-400"
          />
        </motion.div>

        {/* Category tabs text with the drawn arc under the active one, no pills */}
        <motion.div {...fadeUp(0.34)} className="mb-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          {categoryOptions.map((cat) => {
            const active = activeCategory === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                aria-pressed={active}
                onClick={() => onCategoryChange(cat.value)}
                className={`emc-cta-line text-sm transition-colors duration-200 focus-visible:outline-none ${
                  active ? 'text-white after:scale-x-100' : 'text-ice/70 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </motion.div>

        <motion.div {...fadeUp(0.42)} className="mb-16 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => document.getElementById('catalog-courses')?.scrollIntoView({ behavior: 'smooth' })}
            className="rounded-xl bg-brand-500 px-7 py-3.5 text-sm font-bold text-white transition-colors duration-200 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            تصفح الدورات
          </motion.button>
          <Link
            to="/workshops"
            className="emc-cta-line text-sm text-ice/80 transition-colors duration-200 hover:text-white focus-visible:outline-none"
          >
            استكشف الورش
          </Link>
          <Link
            to="/learning-paths"
            className="emc-cta-line text-sm text-ice/80 transition-colors duration-200 hover:text-white focus-visible:outline-none"
          >
            اختر مساراً متكاملاً
          </Link>
        </motion.div>

        {/* Stats band typographic numbers over a single hairline; only the numbers animate (count-up). */}
        <div className="grid grid-cols-2 gap-y-8 border-t border-white/10 pt-10 md:flex md:items-start md:justify-center">
          {statsRow.map((stat) => (
            <StatCounter key={stat.label} value={stat.value} label={stat.label} suffix={stat.suffix} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default memo(CoursesHero)

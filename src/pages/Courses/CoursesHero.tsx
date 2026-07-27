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
  activeCategory: string
  onCategoryChange: (category: string) => void
  categoryOptions: HeroCategoryOption[]
  stats: CoursesHeroStats
}

const StatCounter = memo(function StatCounter({
  value,
  label,
  suffix,
  delay,
}: {
  value: number
  label: string
  suffix: string
  delay: number
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    let frame = 0
    const totalFrames = 80
    const timer = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * value))
      if (frame >= totalFrames) clearInterval(timer)
    }, 20)
    return () => clearInterval(timer)
  }, [isInView, value])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="text-center px-4"
    >
      <p className="text-3xl md:text-4xl font-black text-white tabular-nums">
        {count.toLocaleString('en-US')}
        {suffix}
      </p>
      <p className="text-xs md:text-sm text-brand-300/90 mt-1 font-medium">{label}</p>
    </motion.div>
  )
})

const easing: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

function CoursesHero({
  onSearch,
  activeCategory,
  onCategoryChange,
  categoryOptions,
  stats,
}: CoursesHeroProps) {
  const [query, setQuery] = useState('')
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-40px' })

  function handleSearch(e: ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    onSearch(e.target.value)
  }

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 32 },
    animate: isInView ? { opacity: 1, y: 0 } : {},
    transition: { duration: 0.6, delay, ease: easing },
  })

  const statsRow = [
    { value: stats.totalCourses, label: 'برنامج في الكتالوج', suffix: '' },
    { value: stats.totalRegistrations, label: 'تسجيل مُسجَّل', suffix: '+' },
    { value: stats.instructors, label: 'مدرّب ومدرّبة', suffix: '+' },
    { value: stats.learningPathsCount, label: 'مسار تعليمي', suffix: '' },
  ]

  return (
    <section ref={sectionRef} className="emc-dawn emc-corner-pages emc-corner-pages-white relative overflow-hidden pt-28 pb-16">
      <div className="absolute inset-0 pointer-events-none select-none">
        <svg className="absolute inset-0 h-full w-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-dots-courses" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#0077B6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots-courses)" />
        </svg>

        <div className="absolute top-0 right-0 h-[600px] w-[600px] -translate-y-1/3 translate-x-1/4 rounded-full bg-brand-500/10 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, #0077B6, #0077B6 1px, transparent 1px, transparent 40px)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div {...fadeUp(0)} className="mb-5 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-brand-200 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />
            EMC · Educational Mastar Central
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(0.1)}
          className="mb-4 text-center font-display text-4xl font-black leading-[1.1] tracking-tight text-white md:text-6xl"
        >
          استكشف برامجنا
        </motion.h1>
        <motion.p {...fadeUp(0.18)} className="mb-10 text-center text-lg leading-relaxed text-ice/80 md:text-xl">
          ورش عمل · دورات · مسارات — مصممة لتأخذك من الصفر إلى الشهادة الاحترافية
        </motion.p>

        <motion.div {...fadeUp(0.26)} className="relative mx-auto mb-6 max-w-2xl">
          <Search className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-400" />
          <input
            type="search"
            value={query}
            onChange={handleSearch}
            placeholder="ابحث عن دورة أو مدرّب…"
            className="h-14 w-full rounded-2xl border-2 border-transparent bg-white/95 pr-14 pl-5 text-base font-medium text-deepBlue shadow-xl backdrop-blur-sm placeholder:text-muted-400/80 outline-none transition-all duration-200 focus:border-brand-400"
          />
        </motion.div>

        <motion.div {...fadeUp(0.34)} className="mb-12 flex flex-wrap justify-center gap-2">
          {categoryOptions.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => onCategoryChange(cat.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat.value
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/35'
                  : 'border border-white/10 bg-white/10 text-white/85 hover:bg-white/20'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </motion.div>

        <motion.div {...fadeUp(0.42)} className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => document.getElementById('catalog-courses')?.scrollIntoView({ behavior: 'smooth' })}
            className="rounded-xl bg-brand-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
          >
            تصفح جميع الدورات
          </motion.button>
          <Link
            to="/programs"
            className="rounded-xl border-2 border-accent-500 px-7 py-3.5 text-sm font-bold text-accent-400 transition hover:bg-accent-500 hover:text-white"
          >
            جميع البرامج
          </Link>
        </motion.div>

        <motion.div {...fadeUp(0.5)}>
          <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-10 md:grid-cols-4">
            {statsRow.map((stat, i) => (
              <StatCounter
                key={stat.label}
                value={stat.value}
                label={stat.label}
                suffix={stat.suffix}
                delay={0.5 + i * 0.08}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default memo(CoursesHero)

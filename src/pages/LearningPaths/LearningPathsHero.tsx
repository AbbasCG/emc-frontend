import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { Route, Search } from 'lucide-react'

type Props = {
  onSearch: (query: string) => void
  totalPaths: number
  openCount: number
  featuredCount: number
}

export default function LearningPathsHero({ onSearch, totalPaths, openCount, featuredCount }: Props) {
  const [query, setQuery] = useState('')
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-40px' })

  function handleSearch(e: ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    onSearch(e.target.value)
  }

  const easing: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 32 },
    animate: isInView ? { opacity: 1, y: 0 } : {},
    transition: { duration: 0.6, delay, ease: easing },
  })

  const stats = [
    { value: totalPaths, label: 'مسار متاح' },
    { value: openCount, label: 'التسجيل مفتوح' },
    { value: featuredCount, label: 'مسار مميز' },
  ]

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-to-b from-ink-900 via-deepBlue to-[#1a2a3f] pt-28 pb-16"
    >
      <div className="pointer-events-none absolute inset-0 select-none">
        <svg className="absolute inset-0 h-full w-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-dots-paths" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#2691C2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots-paths)" />
        </svg>
        <div className="absolute top-0 right-0 h-[600px] w-[600px] -translate-y-1/3 translate-x-1/4 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] translate-y-1/2 rounded-full bg-accent-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div {...fadeUp(0)} className="mb-5 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-brand-200 backdrop-blur-sm">
            <Route className="h-3.5 w-3.5" aria-hidden />
            مسارات تعليمية · EMC
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(0.1)}
          className="mb-4 text-center text-4xl font-black leading-tight text-white md:text-6xl"
        >
          رحلات تعليمية متكاملة
        </motion.h1>
        <motion.p {...fadeUp(0.18)} className="mb-10 text-center text-lg leading-relaxed text-white/65 md:text-xl">
          مسارات مرتبة خطوة بخطوة — دورات، شهادات، وتوجيه مهني في رحلة واحدة
        </motion.p>

        <motion.div {...fadeUp(0.26)} className="relative mx-auto mb-8 max-w-2xl">
          <Search className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-400" />
          <input
            type="search"
            value={query}
            onChange={handleSearch}
            placeholder="ابحث عن مسار، وصف، أو مدرب..."
            className="h-14 w-full rounded-2xl border-2 border-transparent bg-white/95 pr-14 pl-5 text-base font-medium text-deepBlue shadow-xl backdrop-blur-sm placeholder:text-muted-400/80 outline-none transition-all duration-200 focus:border-brand-400"
          />
        </motion.div>

        <motion.div {...fadeUp(0.34)} className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => document.getElementById('paths-catalog')?.scrollIntoView({ behavior: 'smooth' })}
            className="rounded-xl bg-brand-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
          >
            استكشف المسارات
          </motion.button>
          <Link
            to="/courses"
            className="rounded-xl border-2 border-accent-500 px-7 py-3.5 text-sm font-bold text-accent-400 transition hover:bg-accent-500 hover:text-white"
          >
            تصفح الدورات
          </Link>
        </motion.div>

        <motion.div {...fadeUp(0.42)}>
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-10 md:gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center px-2">
                <p className="text-2xl font-black text-white tabular-nums md:text-3xl">{String(stat.value)}</p>
                <p className="mt-1 text-xs font-medium text-brand-300/90 md:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

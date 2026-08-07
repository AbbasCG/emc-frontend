import { useRef, useState, type ChangeEvent } from 'react'
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
    initial: { opacity: 0, y: 24 },
    animate: isInView ? { opacity: 1, y: 0 } : {},
    transition: { duration: 0.55, delay, ease: easing },
  })

  const stats = [
    { value: totalPaths, label: 'مسار متاح' },
    { value: openCount, label: 'التسجيل مفتوح' },
    { value: featuredCount, label: 'مسار مميز' },
  ]

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-to-b from-ink-900 via-deepBlue to-[#1a2a3f] pt-24 pb-12 md:pt-28"
    >
      <div className="pointer-events-none absolute inset-0 select-none">
        <svg className="absolute inset-0 h-full w-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-dots-paths" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#0077B6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots-paths)" />
        </svg>
        <div className="absolute top-0 right-0 h-[500px] w-[500px] -translate-y-1/3 translate-x-1/4 rounded-full bg-brand-500/15 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div {...fadeUp(0)} className="mb-5 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-brand-200 backdrop-blur-sm">
            <Route className="h-3.5 w-3.5" aria-hidden />
            مسارات تعليمية · EMC
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(0.08)}
          className="mb-4 text-center font-display text-4xl font-black leading-tight text-white [text-wrap:balance] md:text-5xl"
        >
          رحلات تعليمية متكاملة
        </motion.h1>
        <motion.p
          {...fadeUp(0.16)}
          className="mb-8 text-center text-lg leading-relaxed text-white/65 [text-wrap:balance]"
        >
          مسارات مرتبة خطوة بخطوة — دورات، شهادات، وتوجيه مهني في رحلة واحدة
        </motion.p>

        <motion.div {...fadeUp(0.24)} className="relative mx-auto mb-10 max-w-2xl">
          <Search className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-400" />
          <input
            type="search"
            value={query}
            onChange={handleSearch}
            placeholder="ابحث عن مسار، وصف، أو مدرب..."
            className="h-14 w-full rounded-2xl border-2 border-transparent bg-white/95 pr-14 pl-5 text-base font-medium text-deepBlue shadow-xl backdrop-blur-sm placeholder:text-muted-400/80 outline-none transition-all duration-200 focus:border-brand-400"
          />
        </motion.div>

        <motion.div {...fadeUp(0.32)}>
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-8 md:gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="px-2 text-center">
                <p dir="ltr" className="text-2xl font-black tabular-nums text-white md:text-3xl">
                  {String(stat.value)}
                </p>
                <p className="mt-1 text-xs font-medium text-brand-300/90 md:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

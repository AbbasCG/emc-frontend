import { useRef, useState, useEffect, type ChangeEvent } from 'react'
import { motion, useInView } from 'framer-motion'
import { Search } from 'lucide-react'
import { PLATFORM_STATS } from '@/services/coursesApi'

type CoursesHeroProps = {
  onSearch: (query: string) => void
  activeCategory: string
  onCategoryChange: (category: string) => void
}

const categories = [
  { value: 'all',          label: 'الكل' },
  { value: 'AI & Tech',   label: 'ذكاء اصطناعي وتقنية' },
  { value: 'Languages',   label: 'لغات' },
  { value: 'Business',    label: 'أعمال' },
  { value: 'Academic',    label: 'أكاديمي' },
  { value: 'Personal Dev',label: 'تطوير شخصي' },
]

const statsData = [
  { value: PLATFORM_STATS.totalCourses,       label: 'دورة وورشة',        suffix: '+' },
  { value: PLATFORM_STATS.activeStudents,     label: 'طالب نشط',          suffix: '+' },
  { value: PLATFORM_STATS.certifiedGraduates, label: 'خريج حاصل على شهادة', suffix: '+' },
  { value: PLATFORM_STATS.partnerUniversities,label: 'جامعة شريكة',       suffix: '+' },
]

function StatCounter({ value, label, suffix, delay }: { value: number; label: string; suffix: string; delay: number }) {
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
        {count.toLocaleString('ar-EG')}{suffix}
      </p>
      <p className="text-xs md:text-sm text-customBlue/80 mt-1 font-medium">{label}</p>
    </motion.div>
  )
}

export default function CoursesHero({ onSearch, activeCategory, onCategoryChange }: CoursesHeroProps) {
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

  return (
    <section ref={sectionRef} className="relative bg-deepBlue overflow-hidden pt-28 pb-16">
      {/* Background: geometric dot grid */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#2691C2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots)" />
        </svg>

        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-customBlue/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-customOrange/8 rounded-full blur-3xl translate-y-1/2" />

        {/* Diagonal accent lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(-45deg, #2691C2, #2691C2 1px, transparent 1px, transparent 40px)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        {/* Eyebrow */}
        <motion.div {...fadeUp(0)} className="flex justify-center mb-5">
          <span className="inline-flex items-center gap-2 bg-white/8 border border-white/10 text-customBlue text-xs font-bold px-4 py-2 rounded-full backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-customOrange animate-pulse" />
            EMC · Educational Mastar Central
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 {...fadeUp(0.1)} className="text-4xl md:text-6xl font-black text-white text-center leading-tight mb-4">
          استكشف برامجنا
        </motion.h1>
        <motion.p {...fadeUp(0.18)} className="text-lg md:text-xl text-white/65 text-center mb-10 leading-relaxed">
          ورش عمل · دورات · مسارات — مصممة لتأخذك من الصفر إلى الشهادة الاحترافية
        </motion.p>

        {/* Search */}
        <motion.div {...fadeUp(0.26)} className="relative mb-6 max-w-2xl mx-auto">
          <Search className="absolute top-1/2 right-5 -translate-y-1/2 w-5 h-5 text-[#73777B] pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={handleSearch}
            placeholder="ابحث عن دورة، مسار، أو مهارة..."
            className="w-full h-14 bg-white/95 backdrop-blur-sm text-deepBlue pr-14 pl-5 rounded-xl border-2 border-transparent focus:border-customBlue outline-none text-base font-medium shadow-xl placeholder-[#73777B]/70 transition-all duration-200"
          />
        </motion.div>

        {/* Category pills */}
        <motion.div {...fadeUp(0.34)} className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat.value
                  ? 'bg-customBlue text-white shadow-lg shadow-customBlue/30'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div {...fadeUp(0.42)} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="bg-customBlue text-white font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-customBlue/30 hover:bg-customBlue/90 transition-all duration-200 text-sm"
          >
            تصفح جميع الدورات
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="border-2 border-customOrange text-customOrange hover:bg-customOrange hover:text-white font-bold px-7 py-3.5 rounded-xl transition-all duration-200 text-sm"
          >
            عرض المسارات
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeUp(0.5)}>
          <div className="border-t border-white/10 pt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
            {statsData.map((stat, i) => (
              <StatCounter
                key={stat.label}
                value={stat.value}
                label={stat.label}
                suffix={stat.suffix}
                delay={0.5 + i * 0.1}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

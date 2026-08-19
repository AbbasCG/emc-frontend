import { useRef, useState, type ChangeEvent } from 'react'
import { motion, useInView } from 'framer-motion'
import { Search } from 'lucide-react'
import { toLatinDigits } from '@/utils/publicDetailFormat'

type Props = {
  onSearch: (query: string) => void
  totalPaths: number
  openCount: number
  featuredCount: number
}

/**
 * §6.1 hero — dawn field + typography only: no pill badges, no chip boxes, and
 * (identity law §1) no drop shadow anywhere, no orange outside a primary action.
 *
 * The three statistics are real counts read from the API. A count of zero is a
 * fact the page has nothing to say about, so it is simply absent rather than
 * rendered as a hollow «0». All digits go through `toLatinDigits`.
 */
export default function LearningPathsHero({ onSearch, totalPaths, openCount, featuredCount }: Props) {
  const [query, setQuery] = useState('')
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 })

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
    { value: openCount, label: 'تسجيل مفتوح' },
    { value: featuredCount, label: 'مسار مميز' },
  ].filter((stat) => Number.isFinite(stat.value) && stat.value > 0)

  return (
    <section ref={sectionRef} className="emc-dawn relative overflow-hidden pt-24 pb-12 md:pt-28">
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <motion.p
          {...fadeUp(0)}
          className="mb-5 text-center text-xs font-bold tracking-wide text-brand-200"
        >
          مسارات تعليمية · EMC
        </motion.p>

        <motion.h1
          {...fadeUp(0.08)}
          className="mb-4 text-center font-display text-4xl font-black leading-tight tracking-tight text-white [text-wrap:balance] md:text-5xl"
        >
          رحلات تعليمية متكاملة
        </motion.h1>
        <motion.p
          {...fadeUp(0.16)}
          className="mb-8 text-center text-lg leading-relaxed text-white/65 [text-wrap:balance]"
        >
          اختر مسارك وتقدّم فيه خطوة بخطوة — دورات مرتبة وتوجيه مهني في رحلة واحدة
        </motion.p>

        <motion.div {...fadeUp(0.24)} className="relative mx-auto mb-10 max-w-2xl">
          <Search
            className="pointer-events-none absolute end-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={handleSearch}
            aria-label="ابحث في المسارات"
            placeholder="ابحث عن مسار، وصف، أو مدرب"
            className="h-14 w-full rounded-2xl border-2 border-line bg-white/95 pe-14 ps-5 text-base font-medium text-deepBlue backdrop-blur-sm outline-none transition-colors duration-200 placeholder:text-muted-400/80 focus:border-brand-400"
          />
        </motion.div>

        {stats.length > 0 && (
          <motion.div {...fadeUp(0.32)}>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 border-t border-white/10 pt-8">
              {stats.map((stat) => (
                <div key={stat.label} className="min-w-[6.5rem] px-2 text-center">
                  <p
                    dir="ltr"
                    className="font-display text-3xl font-black tabular-nums tracking-tight text-white md:text-4xl"
                  >
                    {toLatinDigits(stat.value)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-brand-200/90 md:text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}

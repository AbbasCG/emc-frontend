import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { BookOpen, LayoutGrid, TrendingUp, Users } from 'lucide-react'
import StatCard from '@/components/shared/StatCard'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

function AnimatedNumber({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const [display, setDisplay] = useState(0)

  const digits = value.replace(/\D/g, '')
  const numeric = digits ? parseInt(digits, 10) : NaN
  const isCountUp = !Number.isNaN(numeric) && value.includes('+')

  useEffect(() => {
    if (!isInView || !isCountUp) return
    const start = performance.now()
    const duration = 1100
    let frame: number
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - t) ** 3
      setDisplay(Math.round(eased * numeric))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isInView, isCountUp, numeric])

  if (!isCountUp) {
    return (
      <span ref={ref} className="tabular-nums">
        {value}
      </span>
    )
  }

  return (
    <span ref={ref} className="tabular-nums">
      +{display}
    </span>
  )
}

export default function HomeStatsBand() {
  const { t } = useTranslation()

  const bandStats = [
    { raw: '+25', label: t('home.statsPrograms'), icon: LayoutGrid },
    { raw: '+500', label: t('home.statsBeneficiaries'), icon: TrendingUp },
    { raw: '+10', label: t('home.statsFields'), icon: Users },
    { raw: '✓', label: t('home.statsPartnerships'), icon: BookOpen },
  ] as const

  return (
    <section className="bg-deepBlue px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <motion.div
        className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {bandStats.map((item) => {
          const Icon = item.icon
          return (
            <motion.div key={item.label} variants={staggerItem}>
              <StatCard number={<AnimatedNumber value={item.raw} />} label={item.label} icon={Icon} />
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}

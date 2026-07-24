import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { BookOpen, Globe2, TrendingUp, Users } from 'lucide-react'
import StatCard from '@/components/shared/StatCard'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

// أرقام معتمدة (V3) — لا تُعرض أي أرقام أخرى على الواجهات العامّة.
const bandStats = [
  { raw: '+13,000', label: 'مستفيد ومستفيدة', icon: Users },
  { raw: '+9,000', label: 'مسجّل في المخيمات', icon: TrendingUp },
  { raw: '+50', label: 'دولة', icon: Globe2 },
  { raw: '✓', label: 'ورش ودورات ومسارات', icon: BookOpen },
] as const

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
      <span ref={ref} className="tabular-nums" dir="ltr">
        {value}
      </span>
    )
  }

  return (
    <span ref={ref} className="tabular-nums" dir="ltr">
      +{display.toLocaleString('en-US')}
    </span>
  )
}

export default function HomeStatsBand() {
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

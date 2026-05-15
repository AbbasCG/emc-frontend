import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { BookOpen, GraduationCap, Users, Video } from 'lucide-react'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const metrics = [
  { raw: '+850', label: 'متعلّم في المنظومة', icon: Users },
  { raw: '+32', label: 'مسار وبرنامج مكثّف', icon: BookOpen },
  { raw: '+420', label: 'خريج معتمد', icon: GraduationCap },
  { raw: '+95', label: 'ورشة وتجربة مباشرة', icon: Video },
] as const

function AnimatedFigure({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.45 })
  const [display, setDisplay] = useState(0)
  const digits = value.replace(/\D/g, '')
  const numeric = digits ? parseInt(digits, 10) : NaN
  const animate = !Number.isNaN(numeric)

  useEffect(() => {
    if (!isInView || !animate) return
    const start = performance.now()
    const duration = 1200
    let frame = 0
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - t) ** 3
      setDisplay(Math.round(eased * numeric))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isInView, animate, numeric])

  if (!animate) {
    return (
      <span ref={ref} className="font-latin emc-display-num">
        {value}
      </span>
    )
  }

  return (
    <span ref={ref} className="font-latin emc-display-num">
      +{display}
    </span>
  )
}

export default function HomeImpactMetrics() {
  return (
    <section className="relative overflow-hidden bg-deepBlue px-4 py-16 text-white sm:px-6 lg:px-10 lg:py-24" dir="rtl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-[0.07] [mask-image:linear-gradient(180deg,rgba(255,255,255,0.9),transparent_85%)]"
      />
      <div aria-hidden className="pointer-events-none absolute right-[-20%] top-[-40%] h-[32rem] w-[32rem] rounded-full bg-customBlue/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-[-30%] left-[-10%] h-[28rem] w-[28rem] rounded-full bg-customOrange/15 blur-3xl" />

      <div className="relative mx-auto max-w-[1540px]">
        <div className="mb-12 max-w-2xl text-right">
          <p className="text-xs font-black text-customOrange">مؤشرات الأثر</p>
          <h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">أرقام تعكس نضج المنصة</h2>
          <p className="mt-4 text-base font-semibold leading-8 text-white/70">
            مؤشرات تشغيلية معتمدة على نشاط البرامج والمجتمع — وليست زينة بصرية.
          </p>
        </div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {metrics.map(({ raw, label, icon: Icon }) => (
            <motion.div key={label} variants={staggerItem}>
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] p-8 shadow-emc-xl backdrop-blur-xl transition-colors hover:bg-white/[0.1]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-customBlue/20 blur-2xl transition-opacity group-hover:opacity-90"
                />
                <Icon className="relative text-customOrange" size={26} strokeWidth={2} aria-hidden />
                <p className="relative mt-6 font-latin text-4xl font-black tabular-nums text-white sm:text-[2.65rem]">
                  <AnimatedFigure value={raw} />
                </p>
                <p className="relative mt-3 text-sm font-black text-white/72">{label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

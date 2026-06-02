import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const metrics = [
  { raw: 850, suffix: '+', label: 'متعلّم نشط', sub: 'في المنظومة الآن' },
  { raw: 420, suffix: '+', label: 'خريج معتمد', sub: 'شهادات موثّقة' },
  { raw: 95, suffix: '+', label: 'ورشة تنفيذية', sub: 'حضورية وعن بُعد' },
  { raw: 32, suffix: '+', label: 'مسار وبرنامج', sub: 'متخصص ومنظّم' },
] as const

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    const dur = 1400
    const id = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / dur, 1)
      setVal(Math.round((1 - (1 - t) ** 3) * target))
      if (t < 1) requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [inView, target])

  return (
    <span ref={ref} className="font-latin">
      {suffix}{val}
    </span>
  )
}

export default function HomeImpactMetrics() {
  return (
    <section dir="rtl" className="relative overflow-hidden bg-[#0d1b2a] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-[0.05]"
      />
      {/* Glows */}
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-20 h-[28rem] w-[28rem] rounded-full bg-customBlue/20 blur-[100px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 left-0 h-80 w-80 rounded-full bg-customOrange/10 blur-[80px]" />

      <div className="relative mx-auto max-w-[1540px]">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] p-6 text-right backdrop-blur-sm transition-colors hover:border-customBlue/30 hover:bg-white/[0.07] sm:p-8"
            >
              <div aria-hidden className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-customBlue/15 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
              {/* Big number */}
              <p className="text-[2.6rem] font-black tabular-nums leading-none text-white sm:text-[3.2rem] lg:text-[3.6rem]">
                <Counter target={m.raw} suffix={m.suffix} />
              </p>
              {/* Label */}
              <p className="mt-4 text-base font-black text-white/80 sm:text-lg">{m.label}</p>
              <p className="mt-1 text-xs font-semibold text-white/40">{m.sub}</p>
              {/* Bottom accent line */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[2px] origin-right scale-x-0 bg-gradient-to-l from-customBlue to-transparent transition-transform duration-500 group-hover:scale-x-100"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// أرقام معتمدة (V3) — لا تُعرض أي أرقام أخرى على الواجهات العامّة.
const metrics = [
  { raw: 13000, suffix: '+', label: 'مستفيد ومستفيدة', sub: 'في المنظومة الآن' },
  { raw: 9000, suffix: '+', label: 'مسجّل في المخيمات', sub: 'حضورية وعن بُعد' },
  { raw: 50, suffix: '+', label: 'دولة', sub: 'توزيع جغرافي للمشاركين' },
  { raw: null, suffix: '', label: 'ورش ودورات ومسارات', sub: 'متخصص ومنظّم' },
] as const

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [val, setVal] = useState(0)

  // Mount-started count-up. framer's useInView proved unreliable in this app
  // (same failure fixed in CoursesHero): observers never fired and the values
  // sat at 0 forever. The strip is near the fold, so animating on mount reads
  // identically — and can never strand a «+0».
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = requestAnimationFrame(() => setVal(target))
      return () => cancelAnimationFrame(id)
    }
    // setInterval (not rAF): rAF stalls in hidden/non-composited tabs and the
    // count would freeze at 0 until the tab is shown.
    const start = performance.now()
    const dur = 1400
    const id = setInterval(() => {
      const t = Math.min((performance.now() - start) / dur, 1)
      setVal(Math.round((1 - (1 - t) ** 3) * target))
      if (t >= 1) clearInterval(id)
    }, 20)
    return () => clearInterval(id)
  }, [target])

  return (
    <span className="font-latin tabular-nums" dir="ltr">
      {suffix}{val.toLocaleString('en-US')}
    </span>
  )
}

export default function HomeImpactMetrics() {
  return (
    <section dir="rtl" className="emc-dawn relative overflow-hidden px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-[0.05]"
      />
      {/* Glows — sea from the top-right, a separate fire ember from the bottom-left */}
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-20 h-[28rem] w-[28rem] rounded-full bg-customBlue/[0.08] blur-[100px]" />
      <div
        aria-hidden
        className="animate-slow-pulse pointer-events-none absolute -bottom-32 -left-32 h-[22rem] w-[22rem] rounded-full bg-customOrange/[0.07] blur-[100px]"
      />

      <div className="relative mx-auto max-w-[1540px]">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] p-6 text-right backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sky/30 hover:bg-white/[0.07] sm:p-8"
            >
              <div aria-hidden className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-customBlue/15 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
              {/* Big number (or qualitative check for non-numeric slots) */}
              <p className="text-[2.6rem] font-black tabular-nums leading-none tracking-tight text-white sm:text-[3.2rem] lg:text-[3.6rem]">
                {m.raw !== null ? <Counter target={m.raw} suffix={m.suffix} /> : <span aria-hidden>✓</span>}
              </p>
              {/* Label */}
              <p className="mt-4 text-base font-black text-ice sm:text-lg">{m.label}</p>
              <p className="mt-1 text-xs font-semibold text-white/45">{m.sub}</p>
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

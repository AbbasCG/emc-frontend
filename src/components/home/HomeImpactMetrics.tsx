import { Fragment, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

// أرقام معتمدة (V3) — لا تُعرض أي أرقام أخرى على الواجهات العامّة.
const metrics = [
  { raw: 20000, suffix: '+', label: 'مستفيد ومستفيدة', sub: 'في المنظومة الآن' },
  { raw: 17000, suffix: '+', label: 'مسجّل في المخيمات', sub: 'حضورية وعن بُعد' },
  { raw: 65, suffix: '+', label: 'دولة', sub: 'توزيع جغرافي للمشاركين' },
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
    <span className="tabular-nums" dir="ltr">
      {suffix}{val.toLocaleString('en-US')}
    </span>
  )
}

// Design Language 2.0 — the four glass cards became ONE typographic line-up:
// huge serif numbers (emc-stat-num) on the dark field, separated by thin
// white/15 vertical hairlines. No boxes; the numbers carry the scene.
export default function HomeImpactMetrics() {
  return (
    <section dir="rtl" className="emc-dawn relative overflow-hidden px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-[0.05]"
      />
      {/* Glows sea from the top-right, a separate fire ember from the bottom-left */}
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-20 h-[28rem] w-[28rem] rounded-full bg-customBlue/[0.08] blur-[100px]" />
      <div
        aria-hidden
        className="animate-slow-pulse pointer-events-none absolute -bottom-32 -left-32 h-[22rem] w-[22rem] rounded-full bg-customOrange/[0.07] blur-[100px]"
      />

      <div className="relative mx-auto max-w-[1540px]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:flex sm:items-stretch sm:justify-between sm:gap-0">
          {metrics.map((m, i) => (
            <Fragment key={m.label}>
              {i > 0 && (
                <div aria-hidden className="hidden w-px self-stretch bg-white/15 sm:block" />
              )}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-center sm:flex-1 sm:px-6"
              >
                {/* Huge serif number white overrides the utility's light-surface navy */}
                <p className="emc-stat-num font-display text-5xl text-white sm:text-6xl">
                  {m.raw !== null ? <Counter target={m.raw} suffix={m.suffix} /> : <Check className="mx-auto h-[0.9em] w-[0.9em]" strokeWidth={2.5} aria-hidden />}
                </p>
                <p className="mt-4 text-sm font-black text-ice sm:text-base">{m.label}</p>
                <p className="mt-1 text-xs font-semibold text-white/45">{m.sub}</p>
              </motion.div>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

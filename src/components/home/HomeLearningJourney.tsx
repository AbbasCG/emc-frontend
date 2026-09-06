import { motion } from 'framer-motion'
import { Award } from 'lucide-react'
import { Link } from 'react-router'

// Design Language 2.0 — the journey is the purchase story, drawn as a single
// hairline rail with four stations: «ورشة → دورة → مسار → شهادة معتمدة».
// Sky dots mark the first three stations; the final station is a solid amber
// Award — the destination the whole page sells toward. Each station links to
// its catalog surface so the reader can enter the funnel at any depth.
const stations = [
  { title: 'ورشة', desc: 'تجربة عملية مركّزة تبدأ منها', to: '/workshops', final: false },
  { title: 'دورة', desc: 'أساس منهجي يبني المهارة', to: '/courses', final: false },
  { title: 'مسار', desc: 'تخصّص متكامل بمشاريع تطبيقية', to: '/learning-paths', final: false },
  { title: 'شهادة معتمدة', desc: 'اعتماد رسمي يوثّق ما أنجزته', to: '/learning-paths', final: true },
] as const

function StationMarker({ final }: { final: boolean }) {
  if (final) {
    return (
      <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-amber text-deepBlue transition-transform duration-300 group-hover:scale-110">
        <Award size={18} aria-hidden />
      </span>
    )
  }
  return (
    <span className="relative z-10 flex h-10 w-10 items-center justify-center">
      <span className="block h-3 w-3 rounded-full bg-sky ring-4 ring-white transition-transform duration-300 group-hover:scale-125" />
    </span>
  )
}

export default function HomeLearningJourney() {
  return (
    <section dir="rtl" className="relative overflow-hidden bg-white px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
      <div className="relative mx-auto max-w-[1540px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
          className="text-right"
        >
          <span className="emc-eyebrow">مسيرة التعلّم</span>
          <h2 className="emc-title-arc mt-4 font-display text-3xl font-black leading-tight tracking-tight text-deepBlue sm:text-4xl">
            أربع محطات إلى الاعتماد
          </h2>
          <p className="mt-4 max-w-xl text-base font-semibold leading-8 text-foreground/60">
            تبدأ بورشة واحدة، وتنتهي بشهادة معتمدة كل محطة تبني على السابقة.
          </p>
        </motion.div>

        {/* Desktop rail one fading hairline with the stations seated on it */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative mt-14 hidden lg:block"
        >
          <div aria-hidden className="emc-hairline absolute inset-x-0 top-5" />
          <div className="relative grid grid-cols-4 gap-6">
            {stations.map((s) => (
              <Link
                key={s.title}
                to={s.to}
                className="group flex flex-col items-center text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue focus-visible:ring-offset-2"
              >
                <StationMarker final={s.final} />
                <span className="mt-4 font-display text-xl font-black text-deepBlue transition group-hover:text-customBlue">
                  {s.title}
                </span>
                <span className="mt-1.5 text-xs font-semibold leading-6 text-ink-400">{s.desc}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Mobile rail the same flow, vertical along the inline-start edge */}
        <div className="relative mt-10 lg:hidden">
          <div aria-hidden className="absolute inset-y-2 start-5 w-px bg-line" />
          <ul className="space-y-7">
            {stations.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <Link
                  to={s.to}
                  className="group relative flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue"
                >
                  <StationMarker final={s.final} />
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-black text-deepBlue transition group-hover:text-customBlue">
                      {s.title}
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold leading-6 text-ink-400">{s.desc}</span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

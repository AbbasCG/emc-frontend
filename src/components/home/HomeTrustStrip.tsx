import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const partners = [
  'كليات ومؤسسات تعليمية',
  'هيئات حكومية ومجتمعية',
  'منظمات دولية ومبادرات مهنية',
  'شركات تقنية ومزودون للتعلّم عن بُعد',
] as const

export default function HomeTrustStrip() {
  return (
    <section className="relative overflow-hidden border-y border-deepBlue/[0.06] bg-emcBg px-4 py-10 sm:px-6 lg:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-customBlue/35 to-transparent"
      />
      <div className="mx-auto flex max-w-[1540px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4 text-right" dir="rtl">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-emc-sm ring-1 ring-deepBlue/[0.06]">
            <Building2 className="text-customBlue" size={24} aria-hidden />
          </span>
          <div>
            <p className="text-xs font-black text-customBlue">مساحة الثقة</p>
            <h2 className="font-display text-xl font-black text-deepBlue sm:text-2xl">
              شبكة شراكات مؤثّرة بالتعليم والتطوير
            </h2>
          </div>
        </div>

        <motion.ul
          className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-[58%]"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {partners.map((label) => (
            <motion.li key={label} variants={staggerItem}>
              <div className="group flex items-center gap-4 rounded-2xl border border-white/80 bg-white/90 px-4 py-3.5 shadow-emc-xs backdrop-blur-md transition-colors hover:border-customBlue/20 hover:shadow-emc-sm">
                <span className="h-10 w-[3px] rounded-full bg-accent-gradient opacity-90 transition-opacity group-hover:opacity-100" />
                <p className="text-right text-sm font-extrabold text-foreground/90">{label}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* Marquee logos — illustrative partner presence without fake brand marks */}
      <div className="mx-auto mt-10 max-w-[1540px] overflow-hidden rounded-2xl border border-deepBlue/[0.05] bg-white/60 py-5 shadow-[inset_0_2px_12px_rgba(34,51,74,0.06)] backdrop-blur-sm">
        <motion.div
          className="flex w-max gap-12 whitespace-nowrap px-6 opacity-85"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
          aria-hidden
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="text-sm font-black tracking-wide text-foreground/[0.42]"
            >
              جامعات · أجهزة عامة · مؤسسات مجتمعية · مختبرات أبحاث · شركات تقنية · برامج دولية
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

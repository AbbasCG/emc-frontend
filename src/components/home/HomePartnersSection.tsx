import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/utils/animations'

// Partner marks — styled placeholder wordmarks since real logos aren't available
const partners = [
  { name: 'جامعة الأولى', abbr: 'UNV' },
  { name: 'هيئة التطوير', abbr: 'HTA' },
  { name: 'مختبر الابتكار', abbr: 'LAB' },
  { name: 'مؤسسة البحث', abbr: 'RES' },
  { name: 'شركة تقنية رائدة', abbr: 'TEC' },
  { name: 'برنامج دولي', abbr: 'INT' },
  { name: 'منظمة الريادة', abbr: 'ENT' },
  { name: 'مجلس المهنيين', abbr: 'PRO' },
] as const

// Design Language 2.0 — the chip grid became a plain logo/name row between two
// fading hairlines. The wordmarks and whitespace carry the scene; no boxes.
export default function HomePartnersSection() {
  return (
    <section
      dir="rtl"
      className="emc-corner-pages relative overflow-hidden border-y border-deepBlue/[0.06] bg-emcBg px-4 py-20 sm:px-6 lg:px-10 lg:py-24"
    >
      {/* Ghost numeral anchored opposite the corner-pages badge */}
      <span aria-hidden className="emc-ghost-num absolute -top-5 left-4 text-[7rem] sm:text-[10rem]">
        04
      </span>

      <div className="relative mx-auto max-w-[1540px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5 }}
          className="mb-6 text-right"
        >
          <span className="emc-eyebrow">الشراكات</span>
          <h2 className="emc-title-arc mt-4 font-display text-2xl font-black tracking-tight text-deepBlue sm:text-3xl">
            شبكة شركاء تُعزّز كل خطوة في مسيرتك
          </h2>
          <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-foreground/60">
            من جامعات معتمدة إلى شركات تقنية رائدة نبني علاقات مؤسسية تُضيف قيمة حقيقية للمتعلّم.
          </p>
        </motion.div>

        {/* Partner wordmark row seated between two fading hairlines */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          <div aria-hidden className="emc-hairline" />
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-8 py-12 sm:gap-x-16">
            {partners.map((p) => (
              <motion.div key={p.abbr} variants={staggerItem} className="group text-center">
                <p className="font-latin text-xl font-black tracking-[0.2em] text-deepBlue/25 transition-colors group-hover:text-customBlue/50 sm:text-2xl">
                  {p.abbr}
                </p>
                <p className="mt-1 text-[11px] font-bold text-ink-400">{p.name}</p>
              </motion.div>
            ))}
            <motion.p variants={staggerItem} className="text-xs font-black text-ink-400">
              والمزيد
            </motion.p>
          </div>
          <div aria-hidden className="emc-hairline" />
        </motion.div>

        {/* Partnership CTA line CTA, no boxed button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="mt-10 flex justify-center"
        >
          <Link to="/partnerships" className="emc-cta-line text-sm">
            انضم كشريك مؤسسي
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

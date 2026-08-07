import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

// Partner tiles — styled placeholder blocks since real logos aren't available
const partners = [
  { name: 'جامعة الأولى', abbr: 'UNV', w: 'wide' as const },
  { name: 'هيئة التطوير', abbr: 'HTA', w: 'normal' as const },
  { name: 'مختبر الابتكار', abbr: 'LAB', w: 'normal' as const },
  { name: 'مؤسسة البحث', abbr: 'RES', w: 'wide' as const },
  { name: 'شركة تقنية رائدة', abbr: 'TEC', w: 'normal' as const },
  { name: 'برنامج دولي', abbr: 'INT', w: 'normal' as const },
  { name: 'منظمة الريادة', abbr: 'ENT', w: 'wide' as const },
  { name: 'مجلس المهنيين', abbr: 'PRO', w: 'normal' as const },
] as const

export default function HomePartnersSection() {
  return (
    <section
      dir="rtl"
      className="emc-corner-pages relative overflow-hidden border-y border-deepBlue/[0.06] bg-emcBg px-4 py-20 sm:px-6 lg:px-10 lg:py-24"
    >
      {/* Ghost numeral — anchored opposite the corner-pages badge */}
      <span aria-hidden className="emc-ghost-num absolute -top-5 left-4 text-[7rem] sm:text-[10rem]">
        04
      </span>

      <div className="relative mx-auto max-w-[1540px]">
        {/* Seam divider — tricolor hairline marking the light→light transition */}
        <div aria-hidden className="emc-tricolor mx-auto mb-12 h-1 w-24 rounded-full" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-right"
        >
          <span className="emc-eyebrow">الشراكات</span>
          <h2 className="emc-title-arc mt-4 font-display text-2xl font-black tracking-tight text-deepBlue sm:text-3xl">
            شبكة شركاء تُعزّز كل خطوة في مسيرتك
          </h2>
          <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-foreground/60">
            من جامعات معتمدة إلى شركات تقنية رائدة — نبني علاقات مؤسسية تُضيف قيمة حقيقية للمتعلّم.
          </p>
        </motion.div>

        {/* Partner logos grid */}
        <motion.div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {partners.map((p) => (
            <motion.div
              key={p.abbr}
              variants={staggerItem}
              className={`group flex items-center justify-center rounded-2xl border border-deepBlue/[0.07] bg-white/80 px-6 py-7 shadow-emc-xs backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-customBlue/20 hover:shadow-emc-sm ${
                p.w === 'wide' ? 'sm:col-span-2' : ''
              }`}
            >
              <div className="text-center">
                <p className="font-latin text-lg font-black tracking-widest text-deepBlue/20 transition-colors group-hover:text-customBlue/40">
                  {p.abbr}
                </p>
                <p className="mt-0.5 text-xs font-black text-foreground/40">{p.name}</p>
              </div>
            </motion.div>
          ))}

          {/* "More" tile */}
          <motion.div
            variants={staggerItem}
            className="flex items-center justify-center rounded-2xl border border-dashed border-deepBlue/10 bg-white/40 px-6 py-7"
          >
            <p className="text-center text-xs font-black text-foreground/30">
              و<br />
              المزيد
            </p>
          </motion.div>
        </motion.div>

        {/* Partnership CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="mt-10 flex justify-center"
        >
          <Link
            to="/partnerships"
            className="inline-flex items-center gap-2 rounded-xl border border-deepBlue/10 bg-white px-6 py-3 text-sm font-black text-deepBlue shadow-emc-xs transition hover:border-customBlue/30 hover:text-customBlue"
          >
            انضم كشريك مؤسسي
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

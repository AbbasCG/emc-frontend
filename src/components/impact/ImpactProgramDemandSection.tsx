import { motion } from 'framer-motion'
import SectionHeader from '@/components/sections/SectionHeader'
import { impactProgramDemand } from '@/data/impactDashboard'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

export default function ImpactProgramDemandSection() {
  const max = Math.max(...impactProgramDemand.map((p) => p.demand), 1)

  return (
    <section className="py-16 lg:py-20" dir="rtl">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionHeader
          align="right"
          eyebrow="الطلب"
          title="الطلب الفعلي على برامجنا"
          description="قياس تجريبي لتفضيلات التسجيل والاستفسار حسب عنوان البرنامج يمكن مزامنته لاحقاً مع استعلام Laravel."
        />

        <motion.div
          className="mt-10 space-y-1 rounded-3xl border border-deepBlue/[0.075] bg-white/[0.88] p-6 shadow-emc-md shadow-deepBlue/[0.05] ring-1 ring-white backdrop-blur-md"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {impactProgramDemand.map((row, idx) => {
            const pct = Math.round((row.demand / max) * 100)
            const alt = idx % 3 === 1
            return (
              <motion.article
                key={row.titleAr}
                variants={staggerItem}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className="flex min-h-[3.66rem] flex-col justify-center gap-2 rounded-lg px-1 py-3 text-right sm:min-h-[4.125rem]"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 sm:flex-nowrap sm:items-center">
                  <h3 className="flex-1 text-sm font-black leading-snug text-deepBlue sm:text-base">{row.titleAr}</h3>
                  <span className="shrink-0 rounded-full bg-emcBg px-2.5 py-0.5 text-xs font-black tabular-nums text-customBlue ring-1 ring-customBlue/12">
                    {new Intl.NumberFormat('ar').format(row.demand)} طلبًا
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-deepBlue/[0.06] shadow-inner ring-1 ring-deepBlue/[0.04]">
                  <motion.span
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
                    className={`absolute inset-y-0 right-0 block rounded-full ${
                      alt
                        ? 'bg-gradient-to-l from-deepBlue to-customBlue shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                        : 'bg-gradient-to-l from-customOrange to-[#c96b26]'
                    }`}
                  />
                </div>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

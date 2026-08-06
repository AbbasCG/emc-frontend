import { motion } from 'framer-motion'
import SectionHeader from '@/components/sections/SectionHeader'
import { fadeUp } from '@/utils/animations'

const placeholders = ['شريك استراتيجي', 'قطاع تأهيل مهني', 'مؤسسة تعليمية', 'تقنية لخدمات التعلم', 'قطاع مجتمعي']

export default function ImpactPartnersSection() {
  return (
    <section className="border-y border-deepBlue/[0.06] bg-gradient-to-l from-deepBlue/[0.03] via-white to-brand-50/40 px-4 py-20 sm:px-6 lg:px-10" dir="rtl">
      <div className="mx-auto max-w-[1540px]">
        <SectionHeader
          align="right"
          eyebrow="الشراكات والداعمون"
          title="أثر يتجدّد مع شبكة الموثوقية"
          description="نعمل مع جهات تشاركنا قيم الوضوح والجودة؛ الشعارات أدناه للعرض الشكلي حتى توثيق الهويات البصرية للشركاء الفعليين."
        />

        <motion.div
          className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-6"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {placeholders.map((label) => (
            <motion.div
              key={label}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="flex aspect-[5/3] items-center justify-center rounded-3xl border border-deepBlue/[0.08] bg-white/[0.75] px-4 text-center text-xs font-black text-deepBlue/65 shadow-emc-sm backdrop-blur-sm ring-1 ring-white hover:border-customBlue/[0.22] lg:text-sm lg:leading-snug"
            >
              {label}
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="mt-12 rounded-3xl border border-deepBlue/[0.07] bg-white/[0.9] p-8 text-right text-[15px] font-semibold leading-[1.9] text-foreground/74 shadow-inner ring-1 ring-white backdrop-blur-sm sm:p-10"
        >
          الشراكة عند EMC ليست شعاراً فقط؛ نربط كل تعاون بأهداف أثر متفقاً عليها، تقاسم أدوار واضحة، ومخرجات يمكن تنظيم تقاريرها بشكل دوري لمتابعة القيمة المضافة.
        </motion.p>
      </div>
    </section>
  )
}

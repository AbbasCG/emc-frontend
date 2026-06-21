import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/utils/motion'

const milestones = [
  { phase: 'المرحلة ١', title: 'تأسيس الهيكل', desc: 'تعريف الإدارات والمسؤوليات وربطها بالرسالة.' },
  { phase: 'المرحلة ٢', title: 'توحيد الجودة', desc: 'اعتماد معايير محتوى وتشغيل وتوثيق للإجراءات.' },
  { phase: 'المرحلة ٣', title: 'التكامل الرقمي', desc: 'ربط التسجيل والمتابعة والتقارير في تجربة واحدة.' },
  { phase: 'المرحلة ٤', title: 'توسيع الأثر', desc: 'شراكات مؤسسية وبرامج موسمية بضوابط واضحة.' },
]

export default function DepartmentsTimelineStrip() {
  return (
    <section className="border-y border-deepBlue/[0.08] bg-deepBlue px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="mb-12 max-w-3xl text-right"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <span className="mb-3 inline-block rounded-full border border-customOrange/35 bg-customOrange/15 px-3 py-1 text-xs font-black text-customOrange">
            مسار التطور
          </span>
          <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">خط زمني للنضج المؤسسي</h2>
          <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
          <p className="mt-5 text-base font-medium leading-8 text-white/75 sm:text-lg sm:leading-9">
            صورة تخطيطية لكيفية نضج المنظومة — دون تواريخ ثابتة في الواجهة حتى تتوفر بيانات رسمية من الإدارة.
          </p>
        </motion.div>

        <motion.div
          role="list"
          className="relative mr-0 border-r-2 border-customBlue/35 pr-10 text-right md:pr-14"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
        >
          <div className="pointer-events-none absolute right-[-6px] top-2 bottom-8 w-[3px] rounded-full bg-gradient-to-b from-customBlue/50 via-customBlue/40 to-customBlue/30 blur-[2px]" />
          {milestones.map((m) => (
            <motion.div key={m.title} role="listitem" variants={staggerItem} className="relative pb-12 last:pb-2">
              <span className="absolute -right-[22px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-4 border-deepBlue bg-customOrange shadow-[0_0_14px_rgba(247,148,29,0.65)]" />
              <span className="text-xs font-black text-customBlue">{m.phase}</span>
              <h3 className="mt-2 text-lg font-black text-white">{m.title}</h3>
              <p className="mt-2 max-w-xl text-sm leading-8 text-white/75">{m.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <p className="mt-8 text-center text-xs font-semibold text-white/45">
          يمكن ربط هذا القسم لاحقاً ببيانات Laravel عند اعتماد milestones رسمية.
        </p>
      </div>
    </section>
  )
}

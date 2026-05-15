import { motion } from 'framer-motion'
import { Briefcase, Cpu, Globe2, HeartHandshake, School } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const categories = [
  {
    title: 'الأثر التعليمي',
    body: 'تصميم مسارات تجمع الأساسيات والتطبيق، مع متابعة تعلّم ومخرجات واضحة لكل مستوى.',
    icon: School,
    className:
      'md:col-span-2 xl:col-span-2 min-h-[200px] border-deepBlue/[0.08] bg-gradient-to-bl from-brand-50/95 via-white to-white',
  },
  {
    title: 'الأثر المهني',
    body: 'تمكين المهارات المعتمدة في سوق العمل من السيرة إلى المقابلة وإدارة المشاريع.',
    icon: Briefcase,
    className:
      'md:col-span-1 border-deepBlue/[0.06] bg-white/[0.9] backdrop-blur-sm md:min-h-[200px]',
  },
  {
    title: 'الأثر المجتمعي',
    body: 'مبادرات تدعم المجتمعات والمجموعات المتنوعة بتجربة آمنة ومحترمة.',
    icon: HeartHandshake,
    className:
      'md:col-span-2 xl:col-span-3 border-deepBlue/[0.06] bg-white/[0.9] backdrop-blur-sm md:min-h-[180px]',
  },
  {
    title: 'الأثر التقني',
    body: 'منصّة تحترم وقت المتعلّم: وصول إلى الموارد والجلسات وتقارير تقدّم منظورة.',
    icon: Cpu,
    className:
      'md:col-span-1 xl:col-span-2 min-h-[200px] border-deepBlue/[0.07] bg-deepBlue/[0.03]',
  },
  {
    title: 'أثر الشراكات',
    body: 'تكامل ضمن اتفاقيات واضحة: أدوار، مخرجات، وأثر مشترك يُراجع دورياً مع الشركاء.',
    icon: Globe2,
    className:
      'md:col-span-1 xl:col-span-1 min-h-[200px] border-customOrange/[0.2] bg-gradient-to-br from-accent-50/90 via-white to-white',
  },
]

export default function ImpactBentoCategories() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-10" dir="rtl">
      <div className="mx-auto max-w-[1540px]">
        <SectionHeader
          align="right"
          eyebrow="محاور الأثر"
          title="مجالات تأثيرنا"
          description="لم نعدّ المحتوى قطعاً منفصلة؛ بل شبكة واحدة تجمع التعليم، المهنية، المجتمع، التقنية والشراكات."
        />

        <motion.div
          className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {categories.map((c) => (
            <motion.article
              key={c.title}
              variants={staggerItem}
              whileHover={{ y: -4, transition: { duration: 0.22, ease: 'easeOut' } }}
              className={`group rounded-3xl border p-8 text-right shadow-emc-md shadow-deepBlue/[0.05] ring-1 ring-white transition-shadow hover:shadow-emc-lg ${c.className}`}
            >
              <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-deepBlue/[0.04] text-customBlue ring-1 ring-customBlue/12 transition duration-300 group-hover:scale-[1.03]">
                <c.icon size={24} strokeWidth={2} aria-hidden />
              </span>
              <h3 className="font-display text-xl font-black text-deepBlue">{c.title}</h3>
              <p className="mt-4 text-[15px] font-semibold leading-relaxed text-foreground/72">{c.body}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

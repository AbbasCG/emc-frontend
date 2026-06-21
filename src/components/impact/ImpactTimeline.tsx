import { motion } from 'framer-motion'
import SectionHeader from '@/components/sections/SectionHeader'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const milestones = [
  { year: 'البداية', title: 'تأسيس الرؤية', body: 'تشكيل هوية EMC كمنصّة تعليمية تربط الأكاديمي بالمهني والمجتمعي.' },
  { year: 'الفريق', title: 'بناء الفريق', body: 'تجميع خبرات تعليمية وتشغيلية وتقنية ضمن هيكل واضح للجودة.' },
  { year: 'البرامج', title: 'إطلاق البرامج', body: 'ورش ودورات ومسارات أولى مع معايير متابعة وتغذية راجعة.' },
  { year: 'المنصّة', title: 'تطوير المنصّة', body: 'استثمار في تجربة رقمية تدعم التعلّم والتوثيق والتشغيل.' },
  { year: 'التوسّع', title: 'التوسّع والشراكات', body: 'نمو تدريجي في الشراكات المؤسسية وخدمات أوسع للمجتمع.' },
]

export default function ImpactTimeline() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-10" dir="rtl">
      <div className="mx-auto max-w-[900px]">
        <SectionHeader
          align="right"
          eyebrow="مسار النمو"
          title="رحلة EMC"
          description="محطات مختصرة تعكس اتجاه التطور — يمكن ربطها لاحقاً بتواريخ رسمية عند نشرها."
        />

        <motion.ol
          className="relative mt-16 list-none space-y-10 pe-12 sm:pe-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <span
            aria-hidden
            className="absolute right-8 top-2 bottom-12 w-px bg-gradient-to-b from-customBlue/45 via-deepBlue/[0.12] to-transparent sm:right-12"
          />
          {milestones.map((m) => (
            <motion.li key={m.title} variants={staggerItem} className="relative text-right">
              <span className="absolute right-[1.65rem] top-5 z-[1] h-4 w-4 rounded-full border-4 border-white bg-customOrange shadow-emc-xs ring-2 ring-customOrange/45 sm:right-[2.75rem]" />
              <div className="rounded-3xl border border-deepBlue/[0.07] bg-white/[0.95] p-6 shadow-emc-md shadow-deepBlue/[0.05] ring-1 ring-white backdrop-blur-sm">
                <p className="text-xs font-black text-customBlue">{m.year}</p>
                <h3 className="mt-2 text-lg font-black text-deepBlue">{m.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-foreground/72">{m.body}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  )
}

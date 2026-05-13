import { motion } from 'framer-motion'
import { BookOpen, Brain, GraduationCap, LayoutGrid } from 'lucide-react'
import IconCard from '@/components/shared/IconCard'
import SectionHeader from '@/components/shared/SectionHeader'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const offers = [
  {
    icon: BookOpen,
    title: 'دورات اللغات',
    desc: 'الإنجليزية، الهولندية، العربية، والألمانية بأسلوب عملي مناسب للمبتدئين والمتقدمين.',
  },
  {
    icon: Brain,
    title: 'التدريب المهني والتقني',
    desc: 'برامج في الذكاء الاصطناعي، تحليل البيانات، إدارة المشاريع، التسويق، والمهارات الرقمية.',
  },
  {
    icon: GraduationCap,
    title: 'الاستشارات التعليمية',
    desc: 'إرشاد لاختيار التخصص، القبول الجامعي، تطوير السيرة الذاتية، والاستعداد لسوق العمل.',
  },
  {
    icon: LayoutGrid,
    title: 'الورش والبرامج القصيرة',
    desc: 'ورش عملية موجهة للطلاب، الفرق، المؤسسات، والمجتمعات التعليمية.',
  },
]

export default function OffersSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="ماذا تقدم EMC؟"
          subtitle="منظومة متكاملة من الخدمات التعليمية والتطويرية تناسب مختلف الاحتياجات والمراحل."
          centered
        />

        <motion.div
          className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {offers.map((offer) => {
            const Icon = offer.icon
            return (
              <motion.div key={offer.title} variants={staggerItem}>
                <IconCard icon={Icon} title={offer.title} description={offer.desc} />
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

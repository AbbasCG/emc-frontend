import { motion } from 'framer-motion'
import { Eye, Target } from 'lucide-react'
import SectionHeader from '@/components/shared/SectionHeader'
import { fadeUp, viewportOnce } from '@/utils/animations'

const items = [
  {
    icon: Eye,
    tag: 'الرؤية',
    title: 'الريادة في بناء المسارات',
    body: 'أن تكون EMC منصة رائدة في بناء المسارات التعليمية والمهنية للأفراد والمؤسسات.',
    accentText: 'text-customBlue',
    accentBorder: 'border-customBlue',
    iconBg: 'bg-sky-50',
    iconColor: 'text-customBlue',
  },
  {
    icon: Target,
    tag: 'الرسالة',
    title: 'من الطموح إلى الإنجاز',
    body: 'تقديم تعليم عملي، إرشاد واضح، وبرامج تطوير تساعد المتعلم على الانتقال من الطموح إلى الإنجاز.',
    accentText: 'text-customOrange',
    accentBorder: 'border-customOrange',
    iconBg: 'bg-orange-50',
    iconColor: 'text-customOrange',
  },
]

export default function VisionMissionSection() {
  return (
    <section className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="رؤيتنا ورسالتنا"
          subtitle="نبني منصة تعليمية ومهنية تجمع بين الرؤية الواضحة والرسالة العملية."
          centered
        />

        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.tag}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className={`rounded-3xl border-t-4 bg-white p-8 text-right ring-1 ring-line ${item.accentBorder}`}
              >
                <div
                  className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${item.iconBg} ${item.iconColor}`}
                >
                  <Icon size={28} />
                </div>
                <span className={`text-xs font-black uppercase tracking-widest ${item.accentText}`}>
                  {item.tag}
                </span>
                <h3 className="mt-2 text-2xl font-black text-deepBlue">{item.title}</h3>
                <p className="mt-4 text-base leading-8 text-slate-600">{item.body}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

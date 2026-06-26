import { motion } from 'framer-motion'
import { Activity, Cpu, ShieldCheck, UsersRound } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { staggerContainer, staggerItem } from '@/utils/motion'

const tiles = [
  {
    icon: UsersRound,
    label: 'تنسيق مؤسسي',
    value: '١٠',
    hint: 'إدارات متخصصة',
    span: 'lg:col-span-2',
    bg: 'from-customBlue/[0.12] via-white to-emcBg',
    ring: 'ring-customBlue/20',
  },
  {
    icon: Activity,
    label: 'دورة تحسين',
    value: 'مستمر',
    hint: 'جودة وتغذية راجعة',
    span: '',
    bg: 'from-customOrange/[0.1] to-white',
    ring: 'ring-customOrange/25',
  },
  {
    icon: Cpu,
    label: 'البنية الرقمية',
    value: 'آمنة',
    hint: 'تجربة منصة موحدة',
    span: '',
    bg: 'from-deepBlue/[0.06] to-white',
    ring: 'ring-deepBlue/15',
  },
  {
    icon: ShieldCheck,
    label: 'الحوكمة',
    value: 'مفعّلة',
    hint: 'سياسات ووثائق',
    span: 'lg:col-span-4',
    bg: 'from-deepBlue/[0.08] via-emcBg to-customBlue/[0.08]',
    ring: 'ring-deepBlue/12',
  },
]

export default function DepartmentsBentoMetrics() {
  return (
    <section className="relative overflow-hidden border-y border-deepBlue/[0.06] bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[120%] -translate-x-1/2 bg-gradient-to-b from-customBlue/[0.06] to-transparent blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <SectionHeader
          align="right"
          className="!mr-0 !max-w-3xl !text-right"
          eyebrow="لوحة مؤشرات"
          title="مؤشرات تشغيلية — أسلوب منصات التعلم الراقية"
          description="بنية bento تعرض أهم محاور التشغيل دون أرقام وهمية: تركيز على الجودة، الأمان، والتنسيق بين الفرق."
        />

        <motion.div
          className="mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
        >
          {tiles.map((t) => {
            const Icon = t.icon
            return (
              <motion.div
                key={t.label}
                variants={staggerItem}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
                className={[
                  'relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br p-6 text-right shadow-emc-md ring-1 backdrop-blur-sm',
                  t.span,
                  t.bg,
                  t.ring,
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-deepBlue/45">{t.label}</p>
                    <p className="mt-2 font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">{t.value}</p>
                    <p className="mt-2 text-sm font-semibold text-deepBlue/60">{t.hint}</p>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-customBlue shadow-inner ring-1 ring-deepBlue/[0.06]">
                    <Icon size={22} strokeWidth={2.25} />
                  </span>
                </div>
                <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-customOrange/[0.12] blur-2xl" />
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Compass, Gauge, Network } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'

const tabs = [
  {
    id: 'strategy',
    label: 'الطبقة الاستراتيجية',
    icon: Compass,
    body: 'الإدارة العليا والجودة تضع الإطار: الأولويات، المخاطر، والتزام الرسالة. هنا تُحوَّل الرؤية إلى قرارات برامج قابلة للتنفيذ.',
    bullets: ['اعتماد السياسات', 'مؤشرات الجودة', 'تمثيل المؤسسة'],
  },
  {
    id: 'ops',
    label: 'الطبقة التشغيلية',
    icon: Gauge,
    body: 'البرامج والتشغيل والتسويق يشكّلون محرك التسليم اليومي: جداول، تجربة مشارك، ومحتوى يصل بشفافية.',
    bullets: ['تصميم المسارات', 'تشغيل الفعاليات', 'الحملات والإعلام'],
  },
  {
    id: 'mesh',
    label: 'الطبقة الداعمة',
    icon: Network,
    body: 'المالية والتقنية والموارد البشرية والشراكات تربط الموارد بالأثر: استدامة، أمان، وشبكة علاقات مهنية.',
    bullets: ['موارد مالية منضبطة', 'بنية تقنية آمنة', 'شراكات مؤسسية'],
  },
] as const

export default function DepartmentsLayerTabs() {
  const [active, setActive] = useState<(typeof tabs)[number]['id']>('strategy')

  const current = tabs.find((t) => t.id === active)!

  return (
    <section className="bg-gradient-to-b from-emcBg to-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          align="right"
          className="!mr-0 !max-w-3xl !text-right"
          eyebrow="طبقات التشغيل"
          title="ثلاث طبقات — تفاعل منظم"
          description="اختر طبقة لرؤية كيف تتراكب الأدوار: ليست صناديق معزولة، بل شبكة مسؤوليات متصلة بالإدارة العليا."
        />

        <div className="mt-10 flex flex-wrap justify-end gap-2 border-b border-deepBlue/[0.08] pb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const on = active === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={[
                  'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition-all duration-200',
                  on
                    ? 'bg-deepBlue text-white shadow-[0_12px_28px_-12px_rgba(15,42,67,0.45)] ring-2 ring-customBlue/40'
                    : 'bg-white text-deepBlue ring-1 ring-deepBlue/10 hover:ring-customBlue/30',
                ].join(' ')}
              >
                <Icon size={17} strokeWidth={2.25} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="relative mt-8 min-h-[200px] overflow-hidden rounded-3xl border border-deepBlue/10 bg-white/90 p-8 text-right shadow-emc-lg backdrop-blur-md sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-customBlue/[0.04] via-transparent to-transparent" />
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
              className="relative"
            >
              <p className="text-lg font-bold leading-9 text-deepBlue/85">{current.body}</p>
              <ul className="mt-6 flex flex-wrap justify-end gap-2">
                {current.bullets.map((b) => (
                  <li
                    key={b}
                    className="rounded-full border border-customBlue/20 bg-customBlue/[0.07] px-4 py-2 text-xs font-black text-customBlue"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

import { motion } from 'framer-motion'
import { Award, BookOpen, Handshake, Layers, Megaphone, Users } from 'lucide-react'
import ImpactStatCard from '@/components/impact/ImpactStatCard'
import SectionHeader from '@/components/sections/SectionHeader'
import { staggerContainer, viewportOnce } from '@/utils/animations'

const stats = [
  {
    icon: Users,
    label: 'عدد المستفيدين',
    end: 2840,
    suffix: '+',
    subtitle: 'مشاركون في برامج وورش ومسارات مختلفة ضمن شبكة EMC.',
    tone: 'blue' as const,
  },
  {
    icon: Megaphone,
    label: 'عدد الورش',
    end: 148,
    suffix: '+',
    subtitle: 'جلسات تطبيقية تغطي لغويّاً ومهنياً ومجتمعياً وحسب المعايير الداخلية.',
    tone: 'orange' as const,
  },
  {
    icon: Layers,
    label: 'عدد المسارات',
    end: 12,
    subtitle: 'محاور تعليمية مترابطة ضمن المنظومة الاثني عشر لـ EMC.',
    tone: 'ink' as const,
  },
  {
    icon: Handshake,
    label: 'عدد الشراكات',
    end: 36,
    suffix: '+',
    subtitle: 'اتفاقيات وتعاون مؤسسي قيد النمو مع جهات متوافقة مع الرسالة.',
    tone: 'blue' as const,
  },
  {
    icon: BookOpen,
    label: 'عدد المتطوعين',
    end: 92,
    suffix: '+',
    subtitle: 'مساهمون في الدعم التنظيمي والتعليمي ضمن أطر واضحة.',
    tone: 'orange' as const,
  },
  {
    icon: Award,
    label: 'عدد الشهادات',
    end: 810,
    suffix: '+',
    subtitle: 'شهادات إتمام واعتماد داخلي وفق سياسات الجودة الحالية للبرامج.',
    tone: 'ink' as const,
  },
]

export default function ImpactStatsSection() {
  return (
    <section className="border-t border-deepBlue/[0.06] bg-gradient-to-b from-white via-emcBg/50 to-emcBg/80 px-4 py-20 sm:px-6 lg:px-10" dir="rtl">
      <div className="mx-auto max-w-[1540px]">
        <SectionHeader
          align="right"
          eyebrow="الأثر بالأرقام"
          title="مؤشرات نمو متحركة"
          description="أرقام توضيحية تعكس اتجاه العمل؛ تُحدَّث وفق تقارير البرامج والعمليات وتُعرض بتجربة بصرية حضارية."
        />
        <motion.div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {stats.map((s) => (
            <ImpactStatCard
              key={s.label}
              icon={s.icon}
              label={s.label}
              end={s.end}
              suffix={s.suffix}
              subtitle={s.subtitle}
              tone={s.tone}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

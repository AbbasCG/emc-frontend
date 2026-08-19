import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Building2, Globe2, Sparkles, UserPlus } from 'lucide-react'
import ImpactStatCard from '@/components/impact/ImpactStatCard'
import SectionHeader from '@/components/sections/SectionHeader'
import type { ImpactMainStat } from '@/data/impactDashboard'
import { impactMainStats } from '@/data/impactDashboard'
import { staggerContainer, viewportOnce } from '@/utils/animations'

const iconFor: Record<ImpactMainStat['id'], LucideIcon> = {
  beneficiaries: UserPlus,
  'camp-registrations': Sparkles,
  countries: Globe2,
  cities: Building2,
}

const toneCycle: ('blue' | 'orange' | 'ink')[] = ['blue', 'orange', 'ink']

export default function ImpactOverviewSection() {
  return (
    <section className="border-t border-deepBlue/[0.06] bg-gradient-to-b from-white via-emcBg/65 to-emcBg py-16 lg:py-20" dir="rtl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          align="right"
          eyebrow="نظرة شاملة"
          title="مؤشرات الأثر الأساسية"
          description="بطاقات موثقة تعكس جانباً من حجم المنظومة: التسجيل، التنفيذ، التوزيع الجغرافي، والشراكات."
        />
        <motion.div
          className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {impactMainStats.map((stat, i) => (
            <ImpactStatCard
              key={stat.id}
              icon={iconFor[stat.id]}
              label={stat.labelAr}
              end={stat.value}
              suffix={stat.suffix ?? ''}
              subtitle={stat.hintAr}
              tone={toneCycle[i % toneCycle.length] ?? 'blue'}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

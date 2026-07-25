import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  Baby,
  Brain,
  Briefcase,
  Globe2,
  GraduationCap,
  Handshake,
  HeartPulse,
  Languages,
  Lightbulb,
  Map,
  Rocket,
  Wallet,
} from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { themes12 } from '@/data/publicPages'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

const iconMap = {
  GraduationCap,
  Globe2,
  Languages,
  Brain,
  Briefcase,
  Rocket,
  Lightbulb,
  HeartPulse,
  Wallet,
  Map,
  Baby,
  Handshake,
} as const

export default function TwelveThemesPreviewSection() {
  const preview = themes12.slice(0, 12)

  return (
    <section className="bg-[#f4f7fb] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="مجالات التعلم"
          title="اثنا عشر مجالاً يشكّل منظومة EMC"
          description="مجالات مترابطة تصمّم تجربة تعليمية متكاملة: من اللغة والمسار الأكاديمي إلى الذكاء الاصطناعي والوعي المجتمعي."
        />

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
        >
          {preview.map((theme) => {
            const Icon = iconMap[theme.icon as keyof typeof iconMap] ?? GraduationCap
            return (
              <motion.div key={theme.id} variants={staggerItem}>
                <Link
                  to="/tracks"
                  className="group flex h-full flex-col rounded-3xl bg-white p-6 text-right shadow-md ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-customBlue transition group-hover:bg-customBlue group-hover:text-white">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-black leading-7 text-deepBlue">{theme.title.ar}</h3>
                  <p className="mt-2 flex-1 text-sm leading-7 text-slate-600">
                    {theme.shortDescription.ar}
                  </p>
                  <span className="mt-4 text-xs font-bold text-customOrange">استكشف المجال</span>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.div
          className="mt-12 flex justify-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <Link
            to="/tracks"
            className="inline-flex items-center gap-2 rounded-xl bg-deepBlue px-8 py-4 text-sm font-black text-white shadow-lg transition hover:bg-deepBlue/90"
          >
            عرض جميع المجالات والتفاصيل
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

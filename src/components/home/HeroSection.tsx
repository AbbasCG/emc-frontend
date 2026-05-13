import { motion } from 'framer-motion'
import { BookOpen, Brain, GraduationCap, MessageCircle, Users } from 'lucide-react'
import PublicPageHero from '@/components/shared/PublicPageHero'
import { fadeUp, staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const heroCards = [
  {
    icon: BookOpen,
    title: 'دورات اللغات',
    desc: 'إنجليزي · هولندي · ألماني · عربي',
    bg: 'bg-customBlue/[0.07]',
    iconColor: 'text-customBlue',
  },
  {
    icon: Brain,
    title: 'التدريب التقني',
    desc: 'ذكاء اصطناعي · بيانات · مشاريع',
    bg: 'bg-customOrange/[0.08]',
    iconColor: 'text-customOrange',
  },
  {
    icon: GraduationCap,
    title: 'استشارات تعليمية',
    desc: 'قبول جامعي · سيرة ذاتية · توجيه',
    bg: 'bg-customBlue/[0.07]',
    iconColor: 'text-customBlue',
  },
  {
    icon: MessageCircle,
    title: 'ورش وبرامج',
    desc: 'للأفراد والمؤسسات والفرق',
    bg: 'bg-customOrange/[0.08]',
    iconColor: 'text-customOrange',
  },
]

export default function HeroSection() {
  return (
    <>
      <PublicPageHero
        badge="Educational Master Central"
        title={
          <>
            EMC — Guiding Minds, Building Futures
            <span className="mt-3 block text-xl font-black text-customOrange sm:text-2xl lg:text-[1.65rem]">
              نظام تشغيل تعليمي رقمي
            </span>
          </>
        }
        subtitle="منصة تعليمية وتشغيلية متكاملة لبناء المسارات، إدارة البرامج، وتمكين الطلاب والمدربين والشركاء."
        ctaText="استكشف البرامج"
        ctaLink="/courses"
        secondaryCtaText="سجّل الآن"
        secondaryCtaLink="/signup"
        tertiaryCtaText="اطلب ورشة"
        tertiaryCtaLink="/submit-workshop"
        statsCards={[
          { number: '+500', label: 'المتدربون' },
          { number: '+25', label: 'البرامج' },
          { number: '✓', label: 'الشراكات' },
        ]}
      />

      <section className="relative border-t border-deepBlue/[0.06] bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="relative overflow-hidden rounded-3xl border border-deepBlue/[0.08] bg-white p-6 shadow-emc-lg ring-1 ring-deepBlue/[0.04]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5 }}
          >
            {/* Subtle grid texture + brand glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-24 opacity-[0.45] [mask-image:radial-gradient(ellipse_at_center,rgba(0,0,0,0.5),transparent_75%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-customBlue/[0.10] blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-customOrange/[0.10] blur-3xl"
            />

            <div className="relative mb-5 flex items-center justify-between gap-4 border-b border-deepBlue/[0.08] pb-4">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-customBlue/80 shadow-sm ring-1 ring-customBlue/30" />
                <span className="h-3 w-3 rounded-full bg-customOrange/85 shadow-sm ring-1 ring-customOrange/35" />
                <span className="h-3 w-3 rounded-full bg-deepBlue/50 shadow-sm ring-1 ring-deepBlue/25" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-deepBlue/[0.08] bg-emcBg px-2.5 py-1 text-xs font-black text-deepBlue/55 font-latin tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-slow-pulse" />
                EMC OS · v1.0
              </span>
            </div>
            <motion.div
              className="relative grid grid-cols-2 gap-3 lg:grid-cols-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
            >
              {heroCards.map((card) => {
                const Icon = card.icon
                return (
                  <motion.div key={card.title} variants={staggerItem}>
                    <div
                      className={`group relative h-full overflow-hidden rounded-2xl ${card.bg} p-4 text-right ring-1 ring-white/80 transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:shadow-emc-md`}
                    >
                      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/85 shadow-sm ring-1 ring-white">
                        <Icon size={20} className={card.iconColor} aria-hidden />
                      </div>
                      <h3 className="text-sm font-black text-deepBlue">{card.title}</h3>
                      <p className="mt-0.5 text-xs leading-5 text-deepBlue/65">{card.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              className="relative mt-5 flex items-center gap-3 rounded-2xl border border-deepBlue/[0.08] bg-white/90 px-4 py-3 shadow-emc-xs ring-1 ring-white backdrop-blur-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-customBlue/10 text-customBlue ring-1 ring-customBlue/15">
                <Users size={18} />
              </span>
              <p className="text-right text-sm font-semibold leading-6 text-deepBlue/70">
                نخدم الطلاب، المهنيين، المهاجرين، والباحثين عن التطوير في بناء مساراتهم
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  )
}

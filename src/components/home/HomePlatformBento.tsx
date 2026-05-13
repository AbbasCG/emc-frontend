import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, LayoutDashboard, Sparkles } from 'lucide-react'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

const blocks = [
  {
    title: 'كتالوج البرامج',
    desc: 'دورات وورش ومسارات بفلترة وتجربة تصفح حديثة.',
    href: '/courses',
    icon: BookOpen,
    span: 'md:col-span-2',
    accent: 'from-customBlue/[0.14] to-white',
  },
  {
    title: 'خريطة الإدارات',
    desc: 'هيكل تشغيلي تفاعلي يربط الفرق بالإدارة العليا.',
    href: '/departments',
    icon: LayoutDashboard,
    span: '',
    accent: 'from-customOrange/[0.12] to-white',
  },
  {
    title: 'المجالات الاثنا عشر',
    desc: 'مجالات تعلم مترابطة بأسلوب منصة معرفية.',
    href: '/themes',
    icon: Sparkles,
    span: '',
    accent: 'from-deepBlue/[0.07] to-emcBg',
  },
]

export default function HomePlatformBento() {
  return (
    <section className="relative overflow-hidden border-y border-deepBlue/[0.06] bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="pointer-events-none absolute -left-32 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-customBlue/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-customOrange/[0.08] blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="mb-12 max-w-3xl text-right"
        >
          <span className="mb-3 inline-block rounded-full border border-customBlue/25 bg-customBlue/[0.08] px-3 py-1 text-xs font-black text-customBlue">
            منظومة EMC
          </span>
          <h2 className="text-3xl font-black leading-tight text-deepBlue sm:text-4xl">واجهة تشغيل — بين الـ LMS والمؤسسة</h2>
          <p className="mt-5 text-lg font-medium leading-9 text-deepBlue/72">
            تجربة بصرية تربط التعلم بالهيكل التنظيمي: انتقل بين الكتالوج، الخريطة التفاعلية، والمجالات بسلاسة.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-4 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
        >
          {blocks.map((b) => {
            const Icon = b.icon
            return (
              <motion.div
                key={b.href}
                variants={staggerItem}
                whileHover={{ y: -6, transition: { type: 'spring', stiffness: 380, damping: 20 } }}
                className={[
                  'group relative overflow-hidden rounded-3xl border border-deepBlue/10 bg-gradient-to-br p-7 text-right shadow-[0_24px_56px_-32px_rgba(15,42,67,0.22)] ring-1 ring-white/60 backdrop-blur-sm',
                  b.span,
                  b.accent,
                ].join(' ')}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tl from-white/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-customBlue shadow-sm ring-1 ring-deepBlue/[0.06]">
                      <Icon size={22} strokeWidth={2.25} />
                    </span>
                    <h3 className="mt-5 text-xl font-black text-deepBlue">{b.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-7 text-deepBlue/65">{b.desc}</p>
                  </div>
                </div>
                <Link
                  to={b.href}
                  className="relative mt-6 inline-flex items-center gap-2 text-sm font-black text-customBlue transition hover:text-customOrange"
                >
                  استكشاف
                  <ArrowLeft size={16} strokeWidth={2.5} />
                </Link>
                <div className="pointer-events-none absolute -bottom-10 left-4 h-24 w-24 rounded-full bg-customBlue/10 blur-2xl transition-opacity group-hover:opacity-80" />
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

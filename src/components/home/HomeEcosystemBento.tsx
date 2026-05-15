import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Bot,
  LayoutDashboard,
  Sparkles,
  UserRound,
  Video,
} from 'lucide-react'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const cells = [
  {
    title: 'LMS موحّد للمسارات',
    desc: 'جلسات، واجبات، تتبّع تقدّم، وتجربة متعلّم حديثة على قياس المؤسسة.',
    href: '/platform',
    icon: BookOpen,
    span: 'md:col-span-2 md:row-span-2 lg:col-span-6 lg:row-span-2',
    gradient: 'from-brand-50/95 via-white to-white',
    featured: true as const,
  },
  {
    title: 'شهادات رقمية',
    desc: 'إصدار موثّق، تتبّع، وربط بالإنجازات القابلة للتحقق.',
    href: '/courses',
    icon: Award,
    span: 'md:col-span-1 lg:col-span-3',
    gradient: 'from-customOrange/[0.08] to-white',
    featured: false as const,
  },
  {
    title: 'لوحات إدارية',
    desc: 'رؤية تشغيلية للبرامج، الفرق، والامتثال.',
    href: '/departments',
    icon: LayoutDashboard,
    span: 'md:col-span-1 lg:col-span-3',
    gradient: 'from-deepBlue/[0.06] to-white',
    featured: false as const,
  },
  {
    title: 'بوابة الطالب',
    desc: 'تسجيلات، جداول، مواد، ومراجعات موحّدة.',
    href: '/dashboard',
    icon: UserRound,
    span: 'md:col-span-1 lg:col-span-3',
    gradient: 'from-brand-50 to-white',
    featured: false as const,
  },
  {
    title: 'تحليلات وتقارير',
    desc: 'مؤشرات أداء تعليمي جاهزة للعرض القيادي.',
    href: '/impact',
    icon: BarChart3,
    span: 'md:col-span-1 lg:col-span-3',
    gradient: 'from-customBlue/[0.07] to-white',
    featured: false as const,
  },
  {
    title: 'ورش مباشرة',
    desc: 'تنسيق حضور، بث، وتسجيلات تلقائية.',
    href: '/submit-workshop',
    icon: Video,
    span: 'md:col-span-1 lg:col-span-4',
    gradient: 'from-accent-50/90 to-white',
    featured: false as const,
  },
  {
    title: 'تكاملات ذكاء اصطناعي',
    desc: 'مساعد المعرفة، تلخيص المحتوى، وأتمتة خفيفة دون كسر الجودة.',
    href: '/platform',
    icon: Bot,
    span: 'md:col-span-1 lg:col-span-4',
    gradient: 'from-brand-50/80 to-accent-50/40',
    featured: false as const,
  },
  {
    title: 'مجالات المعرفة',
    desc: 'اثنا عشر محوراً تعريفياً مع روابط ذكية للبرامج.',
    href: '/tracks',
    icon: Sparkles,
    span: 'md:col-span-2 lg:col-span-4',
    gradient: 'from-deepBlue/[0.07] via-white to-brand-50/50',
    featured: false as const,
  },
] as const

export default function HomeEcosystemBento() {
  return (
    <section className="relative overflow-hidden border-y border-deepBlue/[0.06] bg-white px-4 py-16 sm:px-6 lg:px-10 lg:py-24" dir="rtl">
      <div aria-hidden className="pointer-events-none absolute -left-40 top-24 h-[28rem] w-[28rem] rounded-full bg-customBlue/[0.06] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-customOrange/[0.07] blur-3xl" />

      <div className="relative mx-auto max-w-[1540px]">
        <div className="mb-14 max-w-3xl text-right">
          <p className="text-xs font-black text-customBlue">طبقة المنظومة الرقمية</p>
          <h2 className="mt-3 font-display text-3xl font-black leading-tight text-deepBlue sm:text-4xl xl:text-[2.65rem]">
            منظومة EMC — من LMS إلى قرارات الجودة
          </h2>
          <p className="mt-5 text-lg font-semibold leading-9 text-foreground/72">
            وحدات متكاملة تعمل كمنصّة SaaS تعليمية: هوية واحدة وجودة موحّدة وتكامل سلس مع فرقكم التقنية والتعليمية.
          </p>
        </div>

        <motion.div
          className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-12"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {cells.map((c) => {
            const Icon = c.icon
            return (
              <motion.article
                key={c.title}
                variants={staggerItem}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 420, damping: 24 } }}
                className={[
                  'group relative flex flex-col overflow-hidden rounded-[1.55rem] border border-deepBlue/[0.07] bg-gradient-to-br p-7 text-right shadow-emc-sm ring-1 ring-white/70 backdrop-blur-sm transition-shadow hover:shadow-emc-md',
                  c.span,
                  c.gradient,
                ].join(' ')}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(38,145,194,0.12),transparent_58%)] opacity-70" />
                <div className="relative flex flex-1 flex-col">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-customBlue shadow-emc-xs ring-1 ring-deepBlue/[0.05] transition-transform duration-300 group-hover:scale-105">
                    <Icon size={24} strokeWidth={2.2} aria-hidden />
                  </span>
                  <h3 className={`mt-5 font-black text-deepBlue ${c.featured ? 'text-2xl sm:text-[1.65rem]' : 'text-xl'}`}>
                    {c.title}
                  </h3>
                  <p className={`mt-3 flex-1 font-semibold leading-relaxed text-foreground/70 ${c.featured ? 'text-base lg:max-w-[94%]' : 'text-sm'}`}>
                    {c.desc}
                  </p>
                  {c.featured ? (
                    <div className="relative mt-8 overflow-hidden rounded-2xl border border-deepBlue/[0.06] bg-white/90 p-4 shadow-emc-xs">
                      <div className="mb-3 flex items-center justify-between text-xs font-black text-foreground/45">
                        <span>معاينة مسار</span>
                        <span className="text-[10px] font-black text-foreground/45">مؤشر آنٍ</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[72, 88, 64].map((n, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-brand-100 bg-brand-50/60 px-2 py-2 text-center"
                          >
                            <p className="font-latin text-lg font-black tabular-nums text-customBlue">{n}%</p>
                            <p className="mt-1 text-[10px] font-bold text-deepBlue/55">مؤشر {idx + 1}</p>
                          </div>
                        ))}
                      </div>
                      <motion.div
                        className="mt-3 h-2 overflow-hidden rounded-full bg-deepBlue/[0.06]"
                        initial={false}
                      >
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-l from-customOrange to-customBlue"
                          initial={{ width: '18%' }}
                          whileInView={{ width: '81%' }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
                        />
                      </motion.div>
                    </div>
                  ) : null}
                  <Link
                    to={c.href}
                    className="relative mt-6 inline-flex items-center gap-2 self-end text-sm font-black text-customBlue transition hover:text-deepBlue"
                  >
                    التفاصيل
                    <ArrowLeft size={16} strokeWidth={2.5} aria-hidden />
                  </Link>
                </div>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

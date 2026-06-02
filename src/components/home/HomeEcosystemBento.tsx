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

const capabilities = [
  {
    id: 'lms',
    title: 'LMS موحّد للمسارات',
    desc: 'جلسات ذكية، واجبات تفاعلية، تتبّع تقدّم آني — تجربة متعلّم مبنية على بيانات حقيقية.',
    href: '/platform',
    icon: BookOpen,
    color: '#2691C2',
    featured: true,
  },
  {
    id: 'certs',
    title: 'شهادات رقمية',
    desc: 'إصدار موثّق قابل للتحقق الفوري، مربوط بالإنجاز الفعلي لكل مسار.',
    href: '/courses',
    icon: Award,
    color: '#EC943C',
    featured: false,
  },
  {
    id: 'admin',
    title: 'لوحات إدارية',
    desc: 'رؤية تشغيلية كاملة للبرامج والفرق والامتثال — جاهزة للعرض القيادي.',
    href: '/departments',
    icon: LayoutDashboard,
    color: '#2691C2',
    featured: false,
  },
  {
    id: 'portal',
    title: 'بوابة الطالب',
    desc: 'تسجيل، جداول، مواد، واجبات — كل ما يحتاجه المتعلّم في مكان واحد.',
    href: '/dashboard',
    icon: UserRound,
    color: '#EC943C',
    featured: false,
  },
  {
    id: 'analytics',
    title: 'تحليلات وتقارير',
    desc: 'مؤشرات أداء تعليمي متقدمة — استخرج القرار من البيانات لا من التخمين.',
    href: '/impact',
    icon: BarChart3,
    color: '#2691C2',
    featured: false,
  },
  {
    id: 'workshops',
    title: 'ورش مباشرة',
    desc: 'تنسيق حضور، بث مباشر، وتسجيلات تلقائية — كل ورشة موثّقة ومتاحة.',
    href: '/submit-workshop',
    icon: Video,
    color: '#EC943C',
    featured: false,
  },
  {
    id: 'ai',
    title: 'تكاملات الذكاء الاصطناعي',
    desc: 'مساعد معرفة، تلخيص تلقائي، وتوصيات مخصصة لكل مسار متعلم.',
    href: '/platform',
    icon: Bot,
    color: '#2691C2',
    featured: false,
  },
  {
    id: 'knowledge',
    title: 'مجالات المعرفة',
    desc: 'اثنا عشر محوراً تعريفياً متصلاً بذكاء مع البرامج والمدربين والمخرجات.',
    href: '/tracks',
    icon: Sparkles,
    color: '#EC943C',
    featured: false,
  },
] as const

type Cap = (typeof capabilities)[number]

function FeaturedCard({ c }: { c: Cap }) {
  const Icon = c.icon
  return (
    <motion.article
      variants={staggerItem}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
      className="group relative col-span-1 row-span-2 flex flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.04] p-8 text-right backdrop-blur-md sm:col-span-2 lg:col-span-2 lg:row-span-2"
    >
      {/* Background glow on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.75rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(ellipse at top right, ${c.color}18, transparent 60%)` }}
      />
      {/* Top gradient line */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px rounded-t-[1.75rem]"
        style={{ background: `linear-gradient(90deg, transparent, ${c.color}60, transparent)` }}
      />

      {/* Icon */}
      <div
        className="relative mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 transition-all duration-300 group-hover:scale-105 group-hover:border-white/20"
        style={{ backgroundColor: `${c.color}20` }}
      >
        <Icon size={30} style={{ color: c.color }} aria-hidden />
        {/* Icon glow */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl blur-xl opacity-0 transition-opacity group-hover:opacity-60"
          style={{ backgroundColor: c.color }}
        />
      </div>

      <h3 className="relative text-2xl font-black text-white">{c.title}</h3>
      <p className="relative mt-4 flex-1 text-[15px] font-medium leading-8 text-white/55">{c.desc}</p>

      {/* Feature list */}
      <ul className="relative mt-8 space-y-3">
        {[
          'تتبّع تقدّم الطلاب لحظياً',
          'واجبات وتقييم متكامل',
          'شهادات إتمام موثّقة',
          'تكامل مع بوابات المدربين',
        ].map((feat) => (
          <li key={feat} className="flex items-center justify-start gap-3 text-sm font-semibold text-white/55">
            {feat}
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${c.color}20` }}
              aria-hidden
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
            </span>
          </li>
        ))}
      </ul>

      <Link
        to={c.href}
        className="relative mt-8 inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-5 py-2.5 text-sm font-black text-white/70 transition-all duration-200 hover:border-white/25 hover:text-white"
      >
        استعرض المنصة
        <ArrowLeft size={15} aria-hidden />
      </Link>
    </motion.article>
  )
}

function RegularCard({ c }: { c: Cap }) {
  const Icon = c.icon
  return (
    <motion.article
      variants={staggerItem}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
      className="group relative flex flex-col overflow-hidden rounded-[1.6rem] border border-white/[0.07] bg-white/[0.03] p-6 text-right backdrop-blur-sm transition-colors duration-300 hover:border-white/[0.14] hover:bg-white/[0.06]"
    >
      {/* Glow on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.6rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(ellipse at top right, ${c.color}12, transparent 55%)` }}
      />
      {/* Top accent line */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px rounded-t-[1.6rem] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${c.color}50, transparent)` }}
      />

      <div className="relative flex flex-col flex-1">
        {/* Icon */}
        <div
          className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 transition-all duration-300 group-hover:scale-[1.08] group-hover:border-white/20"
          style={{ backgroundColor: `${c.color}18` }}
        >
          <Icon size={22} style={{ color: c.color }} aria-hidden />
        </div>

        <h3 className="text-base font-black text-white">{c.title}</h3>
        <p className="mt-2.5 flex-1 text-sm font-medium leading-7 text-white/45">{c.desc}</p>

        <Link
          to={c.href}
          className="relative mt-5 inline-flex items-center gap-1.5 self-end text-xs font-black transition-all"
          style={{ color: `${c.color}90` }}
          onMouseEnter={(e) => { e.currentTarget.style.color = c.color }}
          onMouseLeave={(e) => { e.currentTarget.style.color = `${c.color}90` }}
        >
          التفاصيل
          <ArrowLeft size={13} aria-hidden />
        </Link>
      </div>
    </motion.article>
  )
}

export default function HomeEcosystemBento() {
  const featured = capabilities[0]!
  const rest = capabilities.slice(1)

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden bg-[#0d1b2a] px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
    >
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none absolute -right-40 top-0 h-[32rem] w-[32rem] rounded-full bg-customBlue/[0.12] blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-customOrange/[0.08] blur-[80px]" />

      {/* Subtle grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative mx-auto max-w-[1540px]">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-14 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"
        >
          <div className="text-right">
            <p className="text-xs font-black tracking-widest text-customBlue uppercase">قدرات المنصة</p>
            <h2 className="mt-4 font-display text-3xl font-black leading-tight text-white sm:text-4xl xl:text-[2.8rem]">
              كل أداة تحتاجها —{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #2691C2 30%, #EC943C 100%)' }}
              >
                في منظومة واحدة
              </span>
            </h2>
            <p className="mt-4 max-w-xl text-base font-medium leading-8 text-white/45">
              وحدات متكاملة تعمل كمنصة SaaS تعليمية — هوية واحدة، جودة موحّدة، وتكامل تقني بلا احتكاك.
            </p>
          </div>
          <Link
            to="/platform"
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.06] px-6 py-3.5 text-sm font-black text-white/70 backdrop-blur-md transition-all hover:border-white/20 hover:text-white"
          >
            استعرض المنصة
            <ArrowLeft size={15} aria-hidden />
          </Link>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto]"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {/* Featured card — spans 2 cols × 2 rows on large */}
          <FeaturedCard c={featured} />

          {/* Regular cards — 6 across remaining 2 cols */}
          {rest.slice(0, 6).map((c) => (
            <RegularCard key={c.id} c={c} />
          ))}

          {/* Last wide card — spans 2 cols on large */}
          <motion.article
            variants={staggerItem}
            whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
            className="group relative col-span-1 flex flex-col overflow-hidden rounded-[1.6rem] border border-white/[0.07] bg-white/[0.03] p-6 text-right backdrop-blur-sm transition-colors duration-300 hover:border-white/[0.14] hover:bg-white/[0.06] sm:col-span-2"
          >
            {(() => {
              const c = rest[6]!
              const Icon = c.icon
              return (
                <>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[1.6rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: `radial-gradient(ellipse at top right, ${c.color}12, transparent 55%)` }}
                  />
                  <div className="relative flex items-start gap-5">
                    <div
                      className="mb-5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 transition-all duration-300 group-hover:scale-[1.08]"
                      style={{ backgroundColor: `${c.color}18` }}
                    >
                      <Icon size={22} style={{ color: c.color }} aria-hidden />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-black text-white">{c.title}</h3>
                      <p className="mt-2 text-sm font-medium leading-7 text-white/45">{c.desc}</p>
                    </div>
                    <Link
                      to={c.href}
                      className="shrink-0 self-center text-xs font-black text-white/40 transition hover:text-white"
                    >
                      <ArrowLeft size={18} aria-hidden />
                    </Link>
                  </div>
                </>
              )
            })()}
          </motion.article>
        </motion.div>
      </div>
    </section>
  )
}

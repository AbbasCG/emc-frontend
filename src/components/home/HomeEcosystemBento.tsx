import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  Award,
  BarChart3,
  BookOpen,
  Bot,
  LayoutDashboard,
  Sparkles,
  UserRound,
  Video,
} from 'lucide-react'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { staggerContainer, staggerItem } from '@/utils/animations'

// Design Language 2.0 — the bento GRID OF GLASS TILES became an editorial
// capability list. Same eight capabilities, same dark field, same links: the
// frames (rounded-[1.6rem] + border-white/[0.07] + bg-white/[0.03] + backdrop
// blur + hover glow) are gone. Hierarchy now comes from type scale and column
// span — the lead and the closing capability run wide and large, the middle six
// run two-up — and separation comes from 1px hairline seats, not from boxes.
// Per-item hex colours are gone too: one sea accent (sky) carries every icon,
// which is also the only sea value that clears 3:1 on the navy field.
const capabilities = [
  {
    id: 'lms',
    title: 'LMS موحّد للمسارات',
    desc: 'جلسات ذكية، واجبات تفاعلية، تتبّع تقدّم آني — تجربة متعلّم مبنية على بيانات حقيقية.',
    href: '/platform',
    icon: BookOpen,
  },
  {
    id: 'certs',
    title: 'شهادات رقمية',
    desc: 'إصدار موثّق قابل للتحقق الفوري، مربوط بالإنجاز الفعلي لكل مسار.',
    href: '/courses',
    icon: Award,
  },
  {
    id: 'admin',
    title: 'لوحات إدارية',
    desc: 'رؤية تشغيلية كاملة للبرامج والفرق والامتثال — جاهزة للعرض القيادي.',
    href: '/departments',
    icon: LayoutDashboard,
  },
  {
    id: 'portal',
    title: 'بوابة الطالب',
    desc: 'تسجيل، جداول، مواد، واجبات — كل ما يحتاجه المتعلّم في مكان واحد.',
    href: '/dashboard',
    icon: UserRound,
  },
  {
    id: 'analytics',
    title: 'تحليلات وتقارير',
    desc: 'مؤشرات أداء تعليمي متقدمة — استخرج القرار من البيانات لا من التخمين.',
    href: '/impact',
    icon: BarChart3,
  },
  {
    id: 'workshops',
    title: 'ورش مباشرة',
    desc: 'تنسيق حضور، بث مباشر، وتسجيلات تلقائية — كل ورشة موثّقة ومتاحة.',
    href: '/submit-workshop',
    icon: Video,
  },
  {
    id: 'ai',
    title: 'تكاملات الذكاء الاصطناعي',
    desc: 'مساعد معرفة، تلخيص تلقائي، وتوصيات مخصصة لكل مسار متعلم.',
    href: '/platform',
    icon: Bot,
  },
  {
    id: 'knowledge',
    title: 'مجالات المعرفة',
    desc: 'اثنا عشر محوراً تعريفياً متصلاً بذكاء مع البرامج والمدربين والمخرجات.',
    href: '/tracks',
    icon: Sparkles,
  },
] as const

type Cap = (typeof capabilities)[number]

const leadHighlights = [
  'تتبّع تقدّم الطلاب لحظياً',
  'واجبات وتقييم متكامل',
  'شهادات إتمام موثّقة',
  'تكامل مع بوابات المدربين',
] as const

// Dark-field analogue of `.emc-hairline`, whose navy seam is invisible on navy.
// (src/index.css is out of scope here, so the seam is built from tokens inline.)
const DARK_SEAM = 'h-px bg-gradient-to-l from-transparent via-white/20 to-transparent'

// The sliding sky bar from `.emc-row`, rebuilt for the dark field.
const SKY_BAR =
  'absolute inset-y-[14%] start-0 w-[3px] origin-center scale-y-0 rounded-full bg-sky transition-transform duration-300 group-hover:scale-y-100'

/**
 * One capability as an editorial row: sky icon · serif title · one line of
 * description · arrow. `.emc-row` itself is a light-surface utility (cream
 * hairline, paper hover tint), so the dark field gets the same anatomy from
 * tokens — a white/10 hairline seat, a soft white hover tint, and the sky bar
 * sliding in at the inline-start edge.
 */
function CapabilityRow({ c }: { c: Cap }) {
  const Icon = c.icon
  return (
    <motion.div
      variants={staggerItem}
      className="group relative border-b border-white/10 transition-colors duration-300 hover:bg-white/[0.03]"
    >
      <span aria-hidden className={SKY_BAR} />
      <Link
        to={c.href}
        className="flex items-center gap-4 py-5 ps-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky sm:gap-5 sm:py-6 sm:ps-4"
      >
        <Icon
          size={22}
          className="shrink-0 text-sky transition-transform duration-300 group-hover:-translate-y-0.5"
          aria-hidden
        />
        <div className="min-w-0 flex-1 text-right">
          <h3 className="font-display text-base font-black leading-snug text-white transition-colors group-hover:text-ice sm:text-lg">
            {c.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-6 text-white/50 sm:text-sm">
            {c.desc}
          </p>
        </div>
        <ArrowLeftIcon
          size={16}
          className="shrink-0 text-white/25 transition-all duration-300 group-hover:-translate-x-1 group-hover:text-sky"
        />
      </Link>
    </motion.div>
  )
}

/**
 * The lead capability — what the featured 2×2 tile used to be. It keeps its
 * extra weight through type scale and a full-width span instead of a frame,
 * and its four highlights render as plain sky-dot statements, not chips.
 */
function LeadCapability({ c }: { c: Cap }) {
  const Icon = c.icon
  return (
    <motion.div variants={staggerItem} className="relative border-b border-white/10 lg:col-span-2">
      <div className="flex flex-col gap-6 py-8 ps-3 sm:ps-4 lg:flex-row lg:items-center lg:gap-12 lg:py-10">
        <div className="flex min-w-0 flex-1 items-start gap-4 text-right sm:gap-6">
          <Icon size={30} className="mt-1 shrink-0 text-sky" aria-hidden />
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-black leading-tight text-white sm:text-3xl">
              {c.title}
            </h3>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-8 text-white/55 sm:text-[15px]">
              {c.desc}
            </p>
            <ul className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2.5">
              {leadHighlights.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-xs font-bold text-white/45 sm:text-[13px]"
                >
                  <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-sky" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Link
          to={c.href}
          className="emc-cta-line shrink-0 self-start text-sm text-ice/80 transition-colors duration-200 hover:text-white focus-visible:outline-none lg:self-center"
        >
          استعرض المنصة
          <ArrowLeftIcon size={15} />
        </Link>
      </div>
    </motion.div>
  )
}

/**
 * The closing capability — what the last wide tile used to be. Runs full width
 * at a step above the two-up rows so the old bento rhythm survives without a
 * single border.
 */
function ClosingCapability({ c }: { c: Cap }) {
  const Icon = c.icon
  return (
    <motion.div
      variants={staggerItem}
      className="group relative border-b border-white/10 transition-colors duration-300 hover:bg-white/[0.03] lg:col-span-2"
    >
      <span aria-hidden className={SKY_BAR} />
      <Link
        to={c.href}
        className="flex items-center gap-4 py-6 ps-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky sm:gap-6 sm:py-7 sm:ps-4"
      >
        <Icon
          size={26}
          className="shrink-0 text-sky transition-transform duration-300 group-hover:-translate-y-0.5"
          aria-hidden
        />
        <div className="min-w-0 flex-1 text-right">
          <h3 className="font-display text-lg font-black leading-snug text-white transition-colors group-hover:text-ice sm:text-xl">
            {c.title}
          </h3>
          <p className="mt-1.5 text-xs font-semibold leading-6 text-white/50 sm:text-sm">{c.desc}</p>
        </div>
        <ArrowLeftIcon
          size={18}
          className="shrink-0 text-white/25 transition-all duration-300 group-hover:-translate-x-1 group-hover:text-sky"
        />
      </Link>
    </motion.div>
  )
}

export default function HomeEcosystemBento() {
  const lead = capabilities[0]
  const middle = capabilities.slice(1, 7)
  const closing = capabilities[7]

  return (
    <section
      dir="rtl"
      className="emc-dawn relative overflow-hidden px-4 py-24 sm:px-6 lg:px-10 lg:py-28"
    >
      {/* Ambient glows — sea from the top-right, a separate fire ember from the bottom-left */}
      <div aria-hidden className="pointer-events-none absolute -right-40 top-0 h-[32rem] w-[32rem] rounded-full bg-customBlue/[0.12] blur-[120px]" />
      <div
        aria-hidden
        className="animate-slow-pulse pointer-events-none absolute -bottom-24 -left-32 h-96 w-96 rounded-full bg-customOrange/[0.06] blur-[110px]"
      />

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
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-12 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"
        >
          <div className="text-right">
            <span className="emc-eyebrow border-sky/25 bg-sky/10 text-sky">قدرات المنصة</span>
            <h2 className="mt-4 font-display text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl xl:text-[2.8rem]">
              كل أداة تحتاجها —{' '}
              <span className="bg-gradient-to-r from-ice to-sky bg-clip-text text-transparent">
                في منظومة واحدة
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-base font-medium leading-8 text-white/55">
              وحدات متكاملة تعمل كمنصة SaaS تعليمية — هوية واحدة، جودة موحّدة، وتكامل تقني بلا احتكاك.
            </p>
          </div>
          {/* De-boxed section action — line CTA instead of a glass pill */}
          <Link
            to="/platform"
            className="emc-cta-line shrink-0 self-start text-sm text-ice/80 transition-colors duration-200 hover:text-white focus-visible:outline-none lg:self-end"
          >
            استعرض المنصة
            <ArrowLeftIcon size={15} />
          </Link>
        </motion.div>

        {/* Capability list — hairline seats, two-up from lg, no tiles */}
        <div aria-hidden className={DARK_SEAM} />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-14"
        >
          <LeadCapability c={lead} />
          {middle.map((c) => (
            <CapabilityRow key={c.id} c={c} />
          ))}
          <ClosingCapability c={closing} />
        </motion.div>
      </div>
    </section>
  )
}

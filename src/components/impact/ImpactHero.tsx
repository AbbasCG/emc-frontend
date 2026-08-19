import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { useImpactCountUp } from '@/components/impact/useImpactCountUp'

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] as const },
  },
}

function formatStat(n: number) {
  return new Intl.NumberFormat('ar').format(n)
}

function HeroPreviewStat({ label, end, suffix = '' }: { label: string; end: number; suffix?: string }) {
  const { ref, count } = useImpactCountUp(end, { duration: 1.6 })

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-white/14 bg-white/[0.08] px-4 py-3 text-right shadow-emc-lg ring-1 ring-white/[0.06] backdrop-blur-md"
    >
      <p className="font-display text-2xl font-black tabular-nums text-white sm:text-[1.65rem]">
        {formatStat(count)}
        {suffix}
      </p>
      <p className="mt-1 text-[11px] font-bold leading-snug text-sky-100/82">{label}</p>
    </div>
  )
}

export default function ImpactHero() {
  return (
    <section className="relative isolate overflow-hidden bg-deepBlue pt-[4.75rem] text-white lg:pt-[5rem]" dir="rtl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,#0C2A4B_0%,#1a2838_42%,#0f1c2b_78%),radial-gradient(ellipse_85%_60%_at_100%_-10%,rgba(0,119,182,0.45),transparent_55%),radial-gradient(ellipse_70%_50%_at_0%_100%,rgba(242,140,0,0.18),transparent_50%)]"
      />
      <div aria-hidden className="absolute -left-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-customBlue/10 blur-[100px]" />
      <div aria-hidden className="absolute right-[-10%] top-1/4 h-64 w-64 rounded-full bg-customOrange/[0.12] blur-3xl" />

      <div className="relative mx-auto max-w-[1540px] px-4 py-14 sm:px-6 lg:px-10 lg:py-16">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-8 text-right">
          <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm font-bold text-sky-100/90">
            <Link to="/" className="transition hover:text-white">
              الرئيسية
            </Link>
            <span className="text-customOrange/90">&gt;</span>
            <span className="text-white">أثر EMC</span>
          </nav>

          <span className="inline-flex items-center gap-2 rounded-full border border-customOrange/35 bg-accent-50/[0.12] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-customOrange backdrop-blur-sm ring-1 ring-white/10 sm:text-xs">
            EMC Impact · 2026
          </span>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.08 }}
            className="mt-6 font-display text-4xl font-black tracking-tight sm:text-5xl lg:text-[3.35rem]"
          >
            أثر EMC
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.14 }}
            className="mt-6 max-w-3xl text-right text-[1.05rem] font-medium leading-[1.9] text-slate-100/92 sm:text-lg"
          >
            نقيس نجاحنا بحجم الأثر الذي نصنعه في حياة المتعلّمين والمجتمع عبر برامج منضبطة، شراكات
            مهنية، ومنصّة تنمو لتفتح مسارات جديدة.
          </motion.p>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <HeroPreviewStat label="مستفيدون ومتعلّمون" end={2840} suffix="+" />
            <HeroPreviewStat label="ورش ومبادرات" end={148} suffix="+" />
            <HeroPreviewStat label="مسارات تعلّم" end={12} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-white/14 bg-white/[0.07] p-6 ring-1 ring-white/[0.08] backdrop-blur-xl lg:p-7"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(0,119,182,0.15),transparent_45%)]"
            />
            <p className="relative text-sm font-semibold leading-8 text-slate-100/88">
              نربط بين التعليم والمهنية والمجتمع بأدوات تقييم داخلية وشفافية في الطريق نحو أثر أكبر كل
              عام.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

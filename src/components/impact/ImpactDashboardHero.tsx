import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Globe2, Handshake, Languages, MapPinned, Mic2, MonitorPlay, Sparkles, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useImpactCountUp } from '@/components/impact/useImpactCountUp'
import { impactMainStats } from '@/data/impactDashboard'

const iconStrip: [LucideIcon, string][] = [
  [UserPlus, 'from-customOrange/25'],
  [MonitorPlay, 'from-customBlue/25'],
  [Globe2, 'from-customOrange/25'],
  [MapPinned, 'from-customBlue/25'],
  [Sparkles, 'from-customOrange/25'],
  [Handshake, 'from-customBlue/25'],
  [Mic2, 'from-customOrange/25'],
  [Languages, 'from-customBlue/25'],
]

const heroPeek = impactMainStats.slice(0, 4)

function QuickCounter({
  stat,
}: {
  stat: { value: number; suffix?: string; labelAr: string }
}) {
  const { ref, count } = useImpactCountUp(stat.value, { duration: 1.7 })
  const fmt = new Intl.NumberFormat('ar').format(count)
  return (
    <div
      ref={ref}
      className="rounded-xl border border-white/14 bg-white/[0.08] px-3 py-2.5 text-right shadow-inner ring-1 ring-white/[0.07] backdrop-blur-md sm:px-4 sm:py-3"
    >
      <p className="font-display text-lg font-black tabular-nums text-white sm:text-xl">
        {fmt}
        {stat.suffix ?? ''}
      </p>
      <p className="mt-1 text-xs font-bold leading-snug text-sky-100/85">{stat.labelAr}</p>
    </div>
  )
}

export default function ImpactDashboardHero() {
  return (
    <section className="relative isolate overflow-hidden bg-deepBlue pt-[4.5rem] text-white lg:pt-[4.75rem]" dir="rtl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,#0C2A4B_0%,#1a2839_38%,#0f1c28_92%),radial-gradient(ellipse_82%_55%_at_92%_-8%,rgba(0, 119, 182,0.42),transparent_52%),radial-gradient(ellipse_55%_45%_at_4%_88%,rgba(242, 140, 0,0.16),transparent_48%)]"
      />
      <div aria-hidden className="absolute -left-28 top-24 h-48 w-48 rounded-full bg-customBlue/14 blur-[80px] sm:h-56 sm:w-56" />
      <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:pb-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-8 text-right"
        >
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm font-bold text-sky-100/88">
            <Link to="/" className="transition hover:text-white">
              الرئيسية
            </Link>
            <span className="text-customOrange/90">&gt;</span>
            <span className="text-white">الأثر والإنجازات</span>
          </nav>
          <span className="inline-flex rounded-full border border-customOrange/35 bg-accent-50/[0.12] px-4 py-1.5 text-[11px] font-black text-customOrange backdrop-blur-sm ring-1 ring-white/10">
            تقارير مؤقتة معتمدة داخل EMC
          </span>
          <h1 className="mt-4 font-display text-4xl font-black tracking-tight md:text-5xl">الأثر والإنجازات</h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-100/90 md:text-lg md:leading-relaxed">
            أرقام حقيقية تعكس نمو EMC وتأثيرها التعليمي والمجتمعي.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-end">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3">
            {heroPeek.map((s) => (
              <QuickCounter key={s.id} stat={s} />
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="relative rounded-3xl border border-white/16 bg-white/[0.06] p-6 ring-1 ring-white/[0.08] backdrop-blur-xl"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl bg-[linear-gradient(165deg,rgba(0, 119, 182,0.18),transparent_48%)]"
            />
            <ul className="relative grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-2.5">
              {iconStrip.map(([Icon, grad], i) => (
                <li key={i} className="flex justify-center">
                  <Icon
                    className={`size-9 rounded-xl border border-white/18 bg-gradient-to-bl ${grad} to-white/10 p-2 text-white sm:size-[2.375rem]`}
                    aria-hidden
                  />
                </li>
              ))}
            </ul>
            <p className="relative mt-4 text-xs font-semibold leading-relaxed text-slate-100/88 sm:text-sm sm:leading-7">
              تُحدَّث البطاقات أدناه دورياً من سجلات البرامج والحضور، مع الحفاظ على شفافية التصنيف والمصدر.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

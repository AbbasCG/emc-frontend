import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
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
import PageHeader from '@/components/PageHeader'
import TracksPageContinued from '@/components/tracks/TracksPageContinued'
import { themes12 } from '@/data/publicPages'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const themeIcons = {
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

/** Icon wrap alternates EMC blue / amber accent stripes for SaaS polish */
function accentForIndex(i: number) {
  const blue = i % 2 === 0
  return blue
    ? {
        chip: 'bg-brand-50 text-customBlue ring-1 ring-customBlue/18',
        line: 'from-customBlue/22',
        badge: 'text-customBlue/35',
      }
    : {
        chip: 'bg-accent-50/90 text-accent-700 ring-1 ring-customOrange/25',
        line: 'from-customOrange/20',
        badge: 'text-customOrange/30',
      }
}

export default function Tracks() {
  return (
    <main dir="rtl" className="bg-white pt-[4.75rem] lg:pt-[5rem]">
      <PageHeader
        title="المحاور الاثنا عشر"
        subtitle="محاور EMC الرسمية — مصفوفة واحدة تجمع التعليم الأكاديمي والعالمي والرقمي والمهني ضمن تجربة عربية فاخرة."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'المحاور' },
        ]}
      />

      <section className="relative px-4 py-14 sm:px-6 lg:px-10 lg:pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-emc-radial opacity-80 [mask-image:linear-gradient(180deg,rgba(0,0,0,1),transparent)]"
        />

        <div className="relative mx-auto max-w-[1540px]">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="mb-12 max-w-3xl space-y-3 text-right"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-accent-700">المحاور</p>
            <p className="text-[1.05rem] font-medium leading-8 text-foreground/73">
              تجربة محاور حديثة ومنظمة: نفس المنظومة الاثني عشر، وبطاقات مصمّمة لتسهيل القراءة والانتقال السريع إلى
              البرامج. اختر المحور الذي ينطلق من احتياجك الحالي؛ كل بطاقة تربطك مباشرة بكتالوج البرامج والدورات دون
              مغادرة أسلوب EMC المؤسسي.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
          >
            {themes12.map((theme, index) => {
              const Icon = themeIcons[theme.icon as keyof typeof themeIcons] ?? GraduationCap
              const accents = accentForIndex(index)
              const num = String(index + 1).padStart(2, '0')
              const chipBullets = theme.bullets.slice(0, 3)

              return (
                <motion.article
                  key={theme.id}
                  variants={staggerItem}
                  whileHover={{
                    y: -6,
                    transition: { type: 'spring', stiffness: 420, damping: 28 },
                  }}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-deepBlue/[0.065] bg-white text-right shadow-emc-md shadow-deepBlue/[0.04] ring-1 ring-white transition-shadow hover:border-customBlue/[0.18] hover:shadow-emc-lg"
                >
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${accents.line} via-transparent`}
                  />

                  <div className="flex flex-1 flex-col px-7 pb-8 pt-7">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <span
                        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${accents.chip} shadow-inner transition-transform duration-300 group-hover:scale-[1.04]`}
                      >
                        <Icon size={28} strokeWidth={2} aria-hidden />
                      </span>
                      <span
                        className={`font-display text-3xl font-black tabular-nums leading-none translate-y-0.5 ${accents.badge}`}
                      >
                        {num}
                      </span>
                    </div>

                    <h3 className="min-h-[2.85rem] text-lg font-black leading-snug tracking-tight text-deepBlue sm:text-xl">
                      {theme.title.ar}
                    </h3>
                    <p className="mt-3 flex-1 text-sm font-medium leading-7 text-foreground/72 line-clamp-4">
                      {theme.shortDescription.ar}
                    </p>

                    <ul className="mt-6 flex flex-wrap justify-end gap-2">
                      {chipBullets.map((b) => (
                        <li
                          key={b.ar}
                          className="rounded-full border border-deepBlue/[0.06] bg-emcBg/90 px-3 py-1 text-[11px] font-bold text-foreground/70"
                        >
                          {b.ar.length > 32 ? `${b.ar.slice(0, 31)}…` : b.ar}
                        </li>
                      ))}
                    </ul>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-8 pt-5">
                      <Link
                        to="/courses"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-customBlue to-[#1c6f98] py-3.5 text-sm font-black text-white shadow-[0_12px_32px_-12px_rgba(0,119,182,0.55)] ring-1 ring-white/15 transition-[filter] hover:brightness-[1.05]"
                      >
                        استكشف البرامج
                        <ArrowLeft size={17} aria-hidden />
                      </Link>
                    </motion.div>
                  </div>
                </motion.article>
              )
            })}
          </motion.div>
        </div>
      </section>

      <TracksPageContinued />
    </main>
  )
}

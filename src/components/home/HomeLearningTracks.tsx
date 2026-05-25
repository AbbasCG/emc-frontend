import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, BadgeCheck, Briefcase, Brain, CircuitBoard, LineChart } from 'lucide-react'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

export default function HomeLearningTracks() {
  const { t } = useTranslation()

  const tracks = [
    {
      title: t('home.trackAiEngineer'),
      desc: t('home.trackAiEngineerDesc'),
      href: '/courses',
      accent: 'from-customBlue/[0.12] to-accent-50/70',
      icon: Brain,
    },
    {
      title: t('home.trackDataScientist'),
      desc: t('home.trackDataScientistDesc'),
      href: '/courses',
      accent: 'from-brand-50 to-customOrange/[0.08]',
      icon: CircuitBoard,
    },
    {
      title: t('home.trackDataAnalyst'),
      desc: t('home.trackDataAnalystDesc'),
      href: '/courses',
      accent: 'from-brand-50/90 to-deepBlue/[0.06]',
      icon: LineChart,
    },
    {
      title: t('home.trackAiBusinessTitle'),
      desc: t('home.trackAiBusinessDesc'),
      href: '/courses',
      accent: 'from-customOrange/[0.1] to-brand-50/80',
      icon: Briefcase,
    },
    {
      title: t('home.trackAcademic'),
      desc: t('home.trackAcademicDesc'),
      href: '/courses',
      accent: 'from-deepBlue/[0.08] to-brand-50',
      icon: BadgeCheck,
    },
  ] as const

  return (
    <section id="tracks" className="scroll-mt-28 bg-white px-4 py-16 sm:px-6 lg:px-10 lg:py-24" dir="rtl">
      <div className="mx-auto max-w-[1540px]">
        <div className="flex flex-col justify-between gap-6 text-right lg:flex-row lg:items-end">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-black text-customBlue">{t('home.learningTracks')}</p>
            <h2 className="font-display text-3xl font-black leading-tight text-deepBlue sm:text-4xl xl:text-[2.75rem]">
              {t('home.tracksSubtitle')}
            </h2>
            <p className="text-lg font-semibold leading-9 text-foreground/72">
              نصمّم تجربة متكاملة: محتوى، تمارين، تقييم مستمر، وورش تنفيذ مع مدربين رائدين.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-full border border-deepBlue/[0.1] bg-white px-6 py-3 text-sm font-black text-deepBlue shadow-emc-sm backdrop-blur-sm transition-colors hover:border-customBlue/35"
            >
              {t('home.viewAllTracks')}
              <ArrowLeft size={17} aria-hidden />
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-12"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {tracks.map((track, i) => {
            const Icon = track.icon
            const featured = i === 0 || i === 3
            return (
              <motion.article
                key={track.title}
                variants={staggerItem}
                className={`group relative overflow-hidden rounded-[1.6rem] border border-deepBlue/[0.07] bg-white p-8 shadow-emc-sm backdrop-blur-sm transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-emc-md ${
                  featured ? 'xl:col-span-7' : 'xl:col-span-5'
                }`}
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${track.accent}`}
                />
                <div className="relative flex h-full flex-col text-right">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-emc-xs ring-1 ring-deepBlue/[0.05] transition-transform duration-300 group-hover:rotate-[-3deg] group-hover:scale-105">
                      <Icon size={28} strokeWidth={2} className="text-customBlue" aria-hidden />
                    </span>
                    <Link
                      to={track.href}
                      className="text-[11px] font-black tracking-wide text-customOrange underline-offset-4 transition hover:text-deepBlue"
                    >
                      {t('home.trackDetails')}
                    </Link>
                  </div>
                  <h3 className="text-xl font-black text-deepBlue sm:text-2xl">{track.title}</h3>
                  <p className="mt-4 flex-1 text-[15px] font-semibold leading-relaxed text-foreground/68">
                    {track.desc}
                  </p>
                  <div className="mt-8 flex justify-end border-t border-deepBlue/[0.06] pt-6">
                    <Link to={track.href} className="inline-flex items-center gap-2 text-sm font-black text-deepBlue">
                      {t('home.trackDetails')}
                      <ArrowLeft size={17} aria-hidden />
                    </Link>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

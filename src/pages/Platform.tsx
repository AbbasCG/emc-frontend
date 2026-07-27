import { useMemo } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Bell, BookOpen, GraduationCap, MonitorCheck, Shield, Users, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

/** M3 i18n: copy lives in the catalogs under platform.features.items.<key>. */
const FEATURE_DEFS: readonly { key: string; icon: LucideIcon; color: string }[] = [
  { key: 'hybrid', icon: MonitorCheck, color: 'bg-sky-50 text-customBlue' },
  { key: 'trainers', icon: Users, color: 'bg-orange-50 text-customOrange' },
  { key: 'content', icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
  { key: 'certificates', icon: GraduationCap, color: 'bg-violet-50 text-violet-600' },
  { key: 'support', icon: Bell, color: 'bg-amber-50 text-amber-600' },
  { key: 'security', icon: Shield, color: 'bg-rose-50 text-rose-600' },
]

function buildFeatures(t: TFunction) {
  return FEATURE_DEFS.map(({ key, icon, color }) => ({
    key,
    icon,
    color,
    title: t(`platform.features.items.${key}.title`),
    description: t(`platform.features.items.${key}.description`),
  }))
}

/** Step numerals are display glyphs (Arabic-Indic), kept as-is across locales. */
const STEP_DEFS = [
  { key: 'account', number: '١' },
  { key: 'choose', number: '٢' },
  { key: 'learn', number: '٣' },
  { key: 'certificate', number: '٤' },
] as const

function buildSteps(t: TFunction) {
  return STEP_DEFS.map(({ key, number }) => ({
    key,
    number,
    title: t(`platform.steps.items.${key}.title`),
    desc: t(`platform.steps.items.${key}.description`),
  }))
}

const INTRO_TAG_KEYS = ['hybrid', 'support', 'trainers', 'certificates'] as const

export default function Platform() {
  const { t } = useTranslation()
  const features = useMemo(() => buildFeatures(t), [t])
  const steps = useMemo(() => buildSteps(t), [t])
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title={t('platform.header.title')}
        subtitle={t('platform.header.subtitle')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('platform.header.breadcrumbCurrent') },
        ]}
      />

      {/* Hero image + intro */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <motion.div
            className="order-2 text-right lg:order-1"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
          >
            <span className="emc-eyebrow mb-4">
              <MonitorCheck size={17} />
              {t('platform.intro.eyebrow')}
            </span>
            <h2 className="emc-title-arc font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">{t('platform.intro.title')}</h2>
            <p className="mt-7 text-lg leading-10 text-slate-600">
              {t('platform.intro.body')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {INTRO_TAG_KEYS.map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-black text-deepBlue shadow-emc ring-1 ring-line">
                  <BadgeCheck size={14} className="text-customBlue" />
                  {t(`platform.intro.tags.${tag}`)}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div
            className="order-1 overflow-hidden rounded-3xl shadow-emc-lg ring-1 ring-line lg:order-2"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
          >
            {/* Local V3 dawn-gradient panel (sea palette only) — replaces the former
                externally-hotlinked Unsplash photo, which was brand-foreign and rendered
                as a broken block when the third-party host was blocked. */}
            <div
              role="img"
              aria-label={t('platform.intro.imageAlt')}
              className="relative flex h-[420px] w-full items-center justify-center"
              style={{ background: 'linear-gradient(152deg,#06182C,#0C2A4B 52%,#10456E)' }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 end-0 h-56 w-56 rounded-full bg-[#089FE0]/15 blur-[90px]"
              />
              <MonitorCheck size={72} strokeWidth={1.25} className="relative text-[#A6D6F2]/70" aria-hidden />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="emc-title-arc is-center font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">{t('platform.features.title')}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, index) => {
              const Icon = feat.icon
              return (
                <motion.article
                  key={feat.key}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.07 }}
                  className="group rounded-2xl bg-white p-6 text-right shadow-emc ring-1 ring-line transition duration-300 ease-emc hover:-translate-y-1 hover:shadow-emc-md hover:ring-customBlue/20"
                >
                  <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl shadow-inner transition duration-300 group-hover:scale-105 ${feat.color}`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="font-display text-xl font-black tracking-tight text-deepBlue">{feat.title}</h3>
                  <p className="mt-3 leading-8 text-slate-600">{feat.description}</p>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="emc-title-arc is-center font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">{t('platform.steps.title')}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.key}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="group rounded-2xl bg-white p-6 text-right shadow-emc ring-1 ring-line transition duration-300 ease-emc hover:-translate-y-1 hover:shadow-emc-md hover:ring-customBlue/20"
              >
                <span className="emc-depth mb-4 flex h-12 w-12 items-center justify-center rounded-full font-latin text-xl font-black tabular-nums text-white shadow-emc">
                  {step.number}
                </span>
                <h3 className="font-display text-lg font-black tracking-tight text-deepBlue">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          className="emc-depth mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl p-8 text-right text-white shadow-emc-xl ring-1 ring-white/10 sm:p-10 lg:flex-row lg:items-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{t('platform.cta.title')}</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-ice/90">
              {t('platform.cta.body')}
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white shadow-emc-md transition"
            >
              {t('platform.cta.button')}
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

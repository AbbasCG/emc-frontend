import { useMemo } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Heart,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { PublicPageHero } from '@/components/public'
import PublicSeo from '@/components/public/PublicSeo'
import { departments10, volunteerLead } from '@/data/publicPages'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

/** M3 i18n: copy lives in the catalogs under volunteer.*. */
const JOURNEY_STEP_DEFS = [
  { key: 'interest', step: '01' },
  { key: 'interview', step: '02' },
  { key: 'trial', step: '03' },
  { key: 'growth', step: '04' },
] as const

function buildJourney(t: TFunction) {
  return JOURNEY_STEP_DEFS.map(({ key, step }) => ({
    key,
    step,
    title: t(`volunteer.journey.steps.${key}.title`),
    description: t(`volunteer.journey.steps.${key}.description`),
  }))
}

const WHY_ITEM_DEFS: readonly {
  key: string
  icon: LucideIcon
  accentBg: string
  accentBorder: string
  accentIcon: string
  accentBar: string
}[] = [
  {
    key: 'impact',
    icon: Heart,
    accentBg: 'bg-customOrange/10',
    accentBorder: 'border-customOrange/20',
    accentIcon: 'text-deepBlue',
    accentBar: 'bg-amber',
  },
  {
    key: 'experience',
    icon: Compass,
    accentBg: 'bg-customBlue/[0.08]',
    accentBorder: 'border-customBlue/20',
    accentIcon: 'text-customBlue',
    accentBar: 'bg-customBlue',
  },
  {
    key: 'community',
    icon: Users,
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-100',
    accentIcon: 'text-emerald-600',
    accentBar: 'bg-emerald-500',
  },
]

function buildWhyItems(t: TFunction) {
  return WHY_ITEM_DEFS.map((def) => ({
    ...def,
    title: t(`volunteer.why.items.${def.key}.title`),
    description: t(`volunteer.why.items.${def.key}.description`),
  }))
}

const SKILL_KEYS = ['communication', 'punctuality', 'privacy', 'expertise', 'learning', 'teamwork'] as const

const COMMITMENT_BLOCK_DEFS: readonly {
  key: string
  icon: LucideIcon
  accentBg: string
  accentIcon: string
  lineKeys: readonly string[]
}[] = [
  {
    key: 'time',
    icon: Clock,
    accentBg: 'bg-customOrange/10',
    accentIcon: 'text-customOrange',
    lineKeys: ['range', 'scheduling'],
  },
  {
    key: 'discipline',
    icon: Sparkles,
    accentBg: 'bg-customBlue/[0.08]',
    accentIcon: 'text-customBlue',
    lineKeys: ['deadlines', 'notice'],
  },
]

function buildCommitmentBlocks(t: TFunction) {
  return COMMITMENT_BLOCK_DEFS.map(({ key, icon, accentBg, accentIcon, lineKeys }) => ({
    key,
    icon,
    accentBg,
    accentIcon,
    title: t(`volunteer.commitment.blocks.${key}.title`),
    lines: lineKeys.map((lineKey) => t(`volunteer.commitment.blocks.${key}.lines.${lineKey}`)),
  }))
}

export default function Volunteer() {
  const { t } = useTranslation()
  const journey = useMemo(() => buildJourney(t), [t])
  const whyItems = useMemo(() => buildWhyItems(t), [t])
  const commitmentBlocks = useMemo(() => buildCommitmentBlocks(t), [t])
  return (
    <main className="bg-paper pt-20">
      <PublicSeo
        title="التطوع والانضمام للفريق"
        description="انضم لفريق EMC التطوعي وساهم في برامج تعليمية بجودة عالية — تعلم عملي، خبرة مهنية في تنظيم البرامج، ومجتمع داعم بحدود واضحة للوقت والمهام."
        path="/volunteer"
      />
      <PublicPageHero
        eyebrow={t('volunteer.hero.eyebrow')}
        title={t('volunteer.hero.title')}
        subtitle={t('volunteer.hero.subtitle')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('volunteer.hero.breadcrumbCurrent') },
        ]}
        primaryAction={{ label: t('volunteer.hero.primaryCta'), href: '/volunteer/apply' }}
        secondaryAction={{ label: t('volunteer.hero.secondaryCta'), href: '/team' }}
      />

      {/* ── Why Join ── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-customBlue/[0.08] px-4 py-1.5 text-xs font-black text-customBlue">
            <span className="h-1.5 w-1.5 rounded-full bg-customBlue" />
            {t('volunteer.why.badge')}
          </div>
          <p className="mb-10 mt-4 max-w-2xl text-sm leading-8 text-slate-600">{volunteerLead.ar}</p>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
            className="grid gap-6 md:grid-cols-3"
          >
            {whyItems.map((item) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.key}
                  variants={staggerItem}
                  className="group relative overflow-hidden rounded-3xl bg-white p-8 text-right shadow-[0_4px_24px_-4px_rgba(12,42,75,0.08)] ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(12,42,75,0.14)]"
                >
                  <div className={`absolute inset-x-0 top-0 h-[3px] ${item.accentBar}`} />
                  <div
                    className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${item.accentBg} ${item.accentBorder}`}
                  >
                    <Icon className={item.accentIcon} size={22} />
                  </div>
                  <h3 className="text-lg font-black text-deepBlue">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Departments / Roles ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-customOrange/10 px-4 py-1.5 text-xs font-black text-accent-700">
            <span className="h-1.5 w-1.5 rounded-full bg-customOrange" />
            {t('volunteer.roles.badge')}
          </div>
          <h2 className="emc-title-arc mb-2 mt-4 text-2xl font-black text-deepBlue sm:text-3xl">
            {t('volunteer.roles.title')}
          </h2>
          <p className="mb-10 max-w-2xl text-sm leading-8 text-slate-600">
            {t('volunteer.roles.description')}
          </p>

          <motion.div
            className="grid gap-4 md:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {departments10.map((dept, i) => (
              <motion.article
                key={dept.id}
                variants={staggerItem}
                className="group relative overflow-hidden rounded-2xl bg-white p-6 text-right shadow-emc ring-1 ring-line transition-all duration-300 hover:shadow-emc-md hover:ring-customBlue/20"
              >
                <div className="absolute inset-y-0 right-0 w-[3px] rounded-r-2xl bg-gradient-to-b from-customBlue/60 to-customBlue/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex items-start gap-4">
                  <span className="emc-num mt-0.5 shrink-0 text-xs font-black tabular-nums text-slate-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-deepBlue">{dept.title.ar}</h3>
                    <p className="mt-1.5 text-sm leading-7 text-slate-600">{dept.description.ar}</p>
                    {dept.responsibilities[0]?.ar && (
                      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-customBlue/[0.08] px-3 py-1 text-xs font-bold text-customBlue">
                        <span className="h-1 w-1 rounded-full bg-customBlue" />
                        {dept.responsibilities[0].ar}
                      </span>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Volunteer Journey ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-deepBlue/[0.07] px-4 py-1.5 text-xs font-black text-deepBlue">
            <span className="h-1.5 w-1.5 rounded-full bg-deepBlue" />
            {t('volunteer.journey.badge')}
          </div>
          <h2 className="emc-title-arc mb-2 mt-4 text-2xl font-black text-deepBlue sm:text-3xl">{t('volunteer.journey.title')}</h2>
          <p className="mb-12 max-w-2xl text-sm leading-8 text-slate-600">
            {t('volunteer.journey.description')}
          </p>

          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute right-5 top-12 h-[calc(100%-5rem)] w-px bg-gradient-to-b from-customBlue/40 via-customBlue/15 to-transparent sm:right-6" />

            <div className="grid gap-5">
              {journey.map((step, i) => (
                <motion.div
                  key={step.step}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex items-start gap-5 sm:gap-6"
                >
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-deepBlue text-white shadow-emc-md shadow-deepBlue/25 sm:h-12 sm:w-12">
                      <span className="emc-num text-sm font-black tabular-nums">{step.step}</span>
                    </div>
                  </div>
                  <div className="flex-1 rounded-2xl bg-white p-5 text-right shadow-emc ring-1 ring-line sm:p-6">
                    <h3 className="text-base font-black text-deepBlue">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Commitment ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-customBlue/[0.08] px-4 py-1.5 text-xs font-black text-customBlue">
            <span className="h-1.5 w-1.5 rounded-full bg-customBlue" />
            {t('volunteer.commitment.badge')}
          </div>
          <h2 className="emc-title-arc mb-2 mt-4 text-2xl font-black text-deepBlue sm:text-3xl">{t('volunteer.commitment.title')}</h2>
          <p className="mb-10 max-w-2xl text-sm leading-8 text-slate-600">
            {t('volunteer.commitment.description')}
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {commitmentBlocks.map((block) => {
              const Icon = block.icon
              return (
                <motion.div
                  key={block.key}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45 }}
                  className="rounded-3xl bg-white p-8 text-right shadow-emc ring-1 ring-line"
                >
                  <div
                    className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${block.accentBg}`}
                  >
                    <Icon className={block.accentIcon} size={22} />
                  </div>
                  <h3 className="text-lg font-black text-deepBlue">{block.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {block.lines.map((l) => (
                      <li key={l} className="flex items-start gap-3 text-sm font-semibold text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-customBlue" />
                        {l}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Skills ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-customOrange/10 px-4 py-1.5 text-xs font-black text-accent-700">
            <span className="h-1.5 w-1.5 rounded-full bg-customOrange" />
            {t('volunteer.skills.badge')}
          </div>
          <h2 className="emc-title-arc mb-2 mt-4 text-2xl font-black text-deepBlue sm:text-3xl">{t('volunteer.skills.title')}</h2>
          <p className="mb-8 max-w-2xl text-sm leading-8 text-slate-600">
            {t('volunteer.skills.description')}
          </p>

          <motion.ul
            className="flex flex-wrap gap-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {SKILL_KEYS.map((skill) => (
              <motion.li
                key={skill}
                variants={staggerItem}
                className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-emc-sm ring-1 ring-line"
              >
                <Check className="h-4 w-4 shrink-0 text-customBlue" />
                {t(`volunteer.skills.items.${skill}`)}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-deepBlue text-right text-white shadow-2xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_110%_-10%,rgba(0,119,182,0.38),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_-10%_110%,rgba(242,140,0,0.18),transparent_52%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-customBlue/40 to-transparent" />

          <div className="relative px-8 py-12 lg:px-14 lg:py-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-1.5 text-xs font-black text-white/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-customOrange" />
              {t('volunteer.cta.badge')}
            </span>
            <h2 className="mt-5 text-2xl font-black sm:text-3xl lg:text-[2.25rem] lg:leading-tight">
              {t('volunteer.cta.title')}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-9 text-slate-300">
              {t('volunteer.cta.description')}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/volunteer/apply"
                className="inline-flex items-center gap-2 rounded-2xl bg-customOrange px-7 py-4 text-sm font-extrabold text-white shadow-lg shadow-orange-900/30 transition hover:brightness-110"
              >
                {t('volunteer.cta.primary')}
                <ArrowLeft size={16} />
              </Link>
              <Link
                to="/team"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/[0.08] px-7 py-4 text-sm font-extrabold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/[0.14]"
              >
                {t('volunteer.cta.secondary')}
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  )
}

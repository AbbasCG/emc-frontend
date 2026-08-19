import { useMemo } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Brain,
  Compass,
  Cpu,
  GraduationCap,
  Layers,
  Quote,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import SectionHeader from '@/components/sections/SectionHeader'
import {
  CTASection,
  FeatureCard,
  FeatureGrid,
  PageShell,
  ProcessSteps,
  PublicPageHero,
  TimelineSteps,
} from '@/components/public'
import PublicSeo from '@/components/public/PublicSeo'
import { aboutPlatformLead } from '@/data/publicPages'
import { fadeUp } from '@/utils/animations'

/** M3 i18n: copy lives in the catalogs under about.*. */
const DIFFERENTIATOR_DEFS: readonly { key: string; icon: LucideIcon; iconClassName: string }[] = [
  { key: 'ecosystem', icon: Layers, iconClassName: 'bg-sky-50 text-customBlue' },
  { key: 'audience', icon: Users, iconClassName: 'bg-orange-50 text-customOrange' },
  { key: 'ai', icon: Brain, iconClassName: 'bg-sky-50 text-customBlue' },
  { key: 'guidance', icon: Target, iconClassName: 'bg-orange-50 text-customOrange' },
]

function buildDifferentiators(t: TFunction) {
  return DIFFERENTIATOR_DEFS.map(({ key, icon, iconClassName }) => ({
    key,
    icon,
    iconClassName,
    title: t(`about.differentiators.items.${key}.title`),
    description: t(`about.differentiators.items.${key}.description`),
  }))
}

const ROADMAP_MILESTONE_KEYS = ['unify', 'partnerships', 'impact', 'tracks'] as const

function buildRoadmapMilestones(t: TFunction) {
  return ROADMAP_MILESTONE_KEYS.map((key) => ({
    title: t(`about.roadmap.milestones.${key}.title`),
    description: t(`about.roadmap.milestones.${key}.description`),
  }))
}

const JOURNEY_STEP_DEFS: readonly { key: string; icon: LucideIcon }[] = [
  { key: 'explore', icon: Compass },
  { key: 'choose', icon: Layers },
  { key: 'apply', icon: Brain },
  { key: 'grow', icon: Sparkles },
]

function buildJourneySteps(t: TFunction) {
  return JOURNEY_STEP_DEFS.map(({ key, icon }) => ({
    icon,
    title: t(`about.journey.steps.${key}.title`),
    description: t(`about.journey.steps.${key}.description`),
  }))
}

const GLANCE_ITEM_DEFS: readonly { key: string; icon: LucideIcon }[] = [
  { key: 'academic', icon: GraduationCap },
  { key: 'digital', icon: Cpu },
  { key: 'community', icon: Users },
  { key: 'lifelong', icon: Brain },
]

const DIGITAL_POINT_KEYS = ['intro', 'skills', 'safety', 'alignment'] as const

const AUDIENCE_CARD_KEYS = ['students', 'newcomers', 'professionals', 'families', 'organizations', 'trainers'] as const

export default function About() {
  const { t } = useTranslation()
  const differentiators = useMemo(() => buildDifferentiators(t), [t])
  const roadmapMilestones = useMemo(() => buildRoadmapMilestones(t), [t])
  const journeySteps = useMemo(() => buildJourneySteps(t), [t])
  return (
    <main className="bg-[#f4f7fb] pt-20">
      <PublicSeo
        title="عن المركز"
        description="منصة تعليمية وتطويرية تبني جسوراً بين المعرفة والمهارة والفرص رؤية ورسالة وخارطة طريق مؤسسية بلغة عربية احترافية ومعايير عالمية."
        path="/about"
      />
      <PublicPageHero
        variant="split"
        badge={t('about.hero.badge')}
        title={t('about.hero.title')}
        subtitle={t('about.hero.subtitle')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('about.hero.breadcrumbCurrent') },
        ]}
        primaryAction={{ label: t('about.hero.primaryCta'), href: '/courses' }}
        secondaryAction={{ label: t('about.hero.secondaryCta'), href: '/contact' }}
        stats={[
          { value: t('about.hero.stats.fields.value'), label: t('about.hero.stats.fields.label') },
          { value: t('about.hero.stats.programs.value'), label: t('about.hero.stats.programs.label') },
          { value: t('about.hero.stats.transparency.value'), label: t('about.hero.stats.transparency.label') },
        ]}
      />

      {/* من نحن split band */}
      <section id="about" className="scroll-mt-28 py-16 sm:py-20">
        <PageShell>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55 }}
              className="text-right"
            >
              <span className="emc-eyebrow mb-4">
                <Sparkles size={15} />
                {t('about.who.eyebrow')}
              </span>
              <h2 className="emc-title-arc font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">{t('about.who.title')}</h2>
              <p className="mt-7 text-lg font-medium leading-10 text-slate-600">{aboutPlatformLead.ar}</p>
              <p className="mt-5 text-base font-medium leading-8 text-slate-600">
                {t('about.who.paragraph')}
              </p>
            </motion.div>

            <motion.div
              className="rounded-3xl bg-white p-2 shadow-emc-lg ring-1 ring-line"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
              transition={{ duration: 0.5 }}
            >
              <div className="rounded-2xl bg-gradient-to-br from-[#f4f7fb] to-white p-6 sm:p-8">
                <p className="text-right text-sm font-black text-customBlue">{t('about.who.glanceTitle')}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {GLANCE_ITEM_DEFS.map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.key}
                        className="rounded-2xl border border-slate-100 bg-white p-5 text-right shadow-sm transition hover:border-customBlue/20 hover:shadow-md"
                      >
                        <Icon className="text-customBlue" size={26} />
                        <p className="mt-3 font-black text-deepBlue">{t(`about.who.glance.${item.key}.label`)}</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">{t(`about.who.glance.${item.key}.sub`)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </PageShell>
      </section>

      {/* Process light break */}
      <section className="border-y border-slate-200/60 bg-white py-16 sm:py-20">
        <PageShell>
          <ProcessSteps
            title={t('about.journey.title')}
            subtitle={t('about.journey.subtitle')}
            steps={journeySteps}
          />
        </PageShell>
      </section>

      {/* الرؤية والرسالة */}
      <section id="vision-mission" className="scroll-mt-28 py-16 sm:py-20">
        <PageShell>
          <SectionHeader
            eyebrow={t('about.visionMission.eyebrow')}
            title={t('about.visionMission.title')}
            subtitle={t('about.visionMission.subtitle')}
          />
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-3xl border-t-4 border-customBlue bg-white p-8 text-right shadow-emc-md ring-1 ring-line"
            >
              <div className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-sky-100/50 blur-2xl" />
              <h3 className="relative text-xl font-black text-deepBlue">{t('about.visionMission.visionTitle')}</h3>
              <p className="relative mt-4 leading-9 text-slate-600">
                {t('about.visionMission.visionBody')}
              </p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: 0.06 }}
              className="relative overflow-hidden rounded-3xl border-t-4 border-customOrange bg-white p-8 text-right shadow-emc-md ring-1 ring-line"
            >
              <div className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-orange-100/40 blur-2xl" />
              <h3 className="relative text-xl font-black text-deepBlue">{t('about.visionMission.missionTitle')}</h3>
              <p className="relative mt-4 leading-9 text-slate-600">
                {t('about.visionMission.missionBody')}
              </p>
            </motion.div>
          </div>
        </PageShell>
      </section>

      {/* خارطة الطريق */}
      <section id="roadmap" className="scroll-mt-28 border-y border-slate-200/60 bg-white py-16 sm:py-20">
        <PageShell>
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            eyebrow={t('about.roadmap.eyebrow')}
            title={t('about.roadmap.title')}
            description={t('about.roadmap.description')}
          />
          <TimelineSteps steps={roadmapMilestones} />
        </PageShell>
      </section>

      {/* رسالة القيادة */}
      <section id="leadership" className="scroll-mt-28 py-16 sm:py-20">
        <PageShell>
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            eyebrow={t('about.leadership.eyebrow')}
            title={t('about.leadership.title')}
            description={t('about.leadership.description')}
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="emc-depth relative overflow-hidden rounded-3xl p-8 text-right text-white shadow-emc-lg ring-1 ring-white/10 sm:p-10 lg:p-12"
          >
            <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-customOrange/15 blur-3xl" />
            <Quote className="relative text-customOrange" size={36} aria-hidden />
            <blockquote className="relative mt-6 text-lg font-medium leading-10 text-ice/95 sm:text-xl sm:leading-[2.15rem]">
              {t('about.leadership.quote')}
            </blockquote>
            <footer className="relative mt-8 border-t border-white/15 pt-6 text-sm font-bold text-sky/90">
              {t('about.leadership.attribution')}
            </footer>
          </motion.div>
        </PageShell>
      </section>

      {/* Feature grid */}
      <section className="py-16 sm:py-20">
        <PageShell>
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            eyebrow={t('about.differentiators.eyebrow')}
            title={t('about.differentiators.title')}
            subtitle={t('about.differentiators.subtitle')}
          />
          <FeatureGrid>
            {differentiators.map((item) => (
              <FeatureCard
                key={item.key}
                icon={item.icon}
                title={item.title}
                description={item.description}
                iconClassName={item.iconClassName}
                animation="stagger"
              />
            ))}
          </FeatureGrid>
        </PageShell>
      </section>

      {/* AI / digital full width band */}
      <section className="bg-white py-16 sm:py-20">
        <PageShell>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <SectionHeader
              align="right"
              className="!mb-0 !mr-0 !max-w-none !text-right"
              eyebrow={t('about.digital.eyebrow')}
              title={t('about.digital.title')}
              subtitle={t('about.digital.subtitle')}
            />
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl bg-[#f4f7fb] p-6 ring-1 ring-slate-200/80 sm:p-8"
            >
              <ul className="grid gap-3 text-slate-700 sm:grid-cols-2">
                {DIGITAL_POINT_KEYS.map((key) => (
                  <li
                    key={key}
                    className="flex gap-3 rounded-2xl bg-white p-4 text-sm font-semibold leading-7 shadow-sm ring-1 ring-slate-100/80"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-customOrange" />
                    {t(`about.digital.points.${key}`)}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </PageShell>
      </section>

      {/* Audience cards */}
      <section className="py-16 sm:py-20">
        <PageShell>
          <SectionHeader
            title={t('about.audience.title')}
            subtitle={t('about.audience.subtitle')}
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {AUDIENCE_CARD_KEYS.map((key, i) => (
              <motion.div
                key={key}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                className="min-h-[160px] rounded-3xl bg-white p-7 text-right shadow-emc ring-1 ring-line transition-shadow hover:shadow-emc-md"
              >
                <h3 className="text-lg font-black text-deepBlue">{t(`about.audience.cards.${key}.title`)}</h3>
                <p className="mt-3 leading-8 text-slate-600">{t(`about.audience.cards.${key}.body`)}</p>
              </motion.div>
            ))}
          </div>
        </PageShell>
      </section>

      {/* Mid CTA card */}
      <section className="pb-16 sm:pb-20">
        <PageShell>
          <motion.div
            className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-gradient-to-l from-white to-sky-50/40 p-8 text-right shadow-emc-md ring-1 ring-line sm:flex-row sm:items-center sm:p-10"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h2 className="text-2xl font-black text-deepBlue sm:text-3xl">{t('about.midCta.title')}</h2>
              <p className="mt-3 max-w-xl font-medium leading-9 text-slate-600">
                {t('about.midCta.body')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-7 py-4 text-sm font-extrabold text-white shadow-lg"
                >
                  {t('about.midCta.primary')}
                  <ArrowLeft size={18} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-7 py-4 text-sm font-extrabold text-deepBlue transition hover:border-customBlue"
                >
                  {t('about.midCta.secondary')}
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </PageShell>
      </section>

      <CTASection
        title={t('about.cta.title')}
        description={t('about.cta.description')}
        primaryLabel={t('about.cta.primary')}
        primaryHref="/tracks"
        secondaryLabel={t('about.cta.secondary')}
        secondaryHref="/partnerships"
      />
    </main>
  )
}

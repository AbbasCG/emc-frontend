import { Link } from 'react-router-dom'
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
} from 'lucide-react'
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
import { useTranslation } from 'react-i18next'
import { aboutPlatformLead, t as contentT } from '@/data/publicPages'
import { fadeUp } from '@/utils/animations'

export default function About() {
  const { t } = useTranslation()

  const differentiators = [
    {
      icon: Layers,
      title: t('about.differentiator1Title'),
      description: t('about.differentiator1Desc'),
      iconClassName: 'bg-sky-50 text-customBlue',
    },
    {
      icon: Users,
      title: t('about.differentiator2Title'),
      description: t('about.differentiator2Desc'),
      iconClassName: 'bg-orange-50 text-customOrange',
    },
    {
      icon: Brain,
      title: t('about.differentiator3Title'),
      description: t('about.differentiator3Desc'),
      iconClassName: 'bg-sky-50 text-customBlue',
    },
    {
      icon: Target,
      title: t('about.differentiator4Title'),
      description: t('about.differentiator4Desc'),
      iconClassName: 'bg-orange-50 text-customOrange',
    },
  ]

  const roadmapMilestones = [
    {
      title: t('about.roadmapMilestone1'),
      description: t('about.roadmapMilestone1Desc'),
    },
    {
      title: t('about.roadmapMilestone2'),
      description: t('about.roadmapMilestone2Desc'),
    },
    {
      title: t('about.roadmapMilestone3'),
      description: t('about.roadmapMilestone3Desc'),
    },
    {
      title: t('about.roadmapMilestone4'),
      description: t('about.roadmapMilestone4Desc'),
    },
  ]

  const journeySteps = [
    {
      title: t('about.journeyStep1'),
      description: t('about.journeyStep1Desc'),
      icon: Compass,
    },
    {
      title: t('about.journeyStep2'),
      description: t('about.journeyStep2Desc'),
      icon: Layers,
    },
    {
      title: t('about.journeyStep3'),
      description: t('about.journeyStep3Desc'),
      icon: Brain,
    },
    {
      title: t('about.journeyStep4'),
      description: t('about.journeyStep4Desc'),
      icon: Sparkles,
    },
  ]

  return (
    <main className="bg-[#f4f7fb] pt-20">
      <PublicPageHero
        variant="split"
        badge={t('about.title')}
        title={t('about.title')}
        subtitle={t('about.subtitle')}
        breadcrumbs={[
          { label: t('about.breadcrumbHome'), href: '/' },
          { label: t('about.title') },
        ]}
        primaryAction={{ label: t('about.ctaPrograms'), href: '/courses' }}
        secondaryAction={{ label: t('about.ctaContact'), href: '/contact' }}
        stats={[
          { value: '12', label: t('about.statsTracks') },
          { value: t('about.statsDiverse'), label: t('about.statsDiverse') },
          { value: t('about.statsTransparent'), label: t('about.statsTransparent') },
        ]}
      />

      {/* من نحن — split band */}
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
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-customBlue shadow-sm ring-1 ring-slate-200/80">
                <Sparkles size={17} />
                {t('about.whoWeAre')}
              </span>
              <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">{t('about.whoWeAre')}</h2>
              <span className="mt-4 block h-1 w-20 rounded-full bg-gradient-to-l from-customOrange to-customOrange/40" />
              <p className="mt-7 text-lg font-medium leading-10 text-slate-600">{contentT(aboutPlatformLead)}</p>
              <p className="mt-5 text-base font-medium leading-8 text-slate-600">
                {t('about.whoWeAreDesc')}
              </p>
            </motion.div>

            <motion.div
              className="rounded-3xl bg-white p-2 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <div className="rounded-2xl bg-gradient-to-br from-[#f4f7fb] to-white p-6 sm:p-8">
                <p className="text-right text-sm font-black text-customBlue">{t('about.whoWeAre')}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    { icon: GraduationCap, label: 'مسارات أكاديمية ومهنية', sub: 'تخطيط وتوجيه' },
                    { icon: Cpu, label: 'تمكين رقمي', sub: 'أدوات ومهارات' },
                    { icon: Users, label: 'مجتمع متعلم', sub: 'دعم وشراكات' },
                    { icon: Brain, label: 'تعلم مستمر', sub: 'ورش وبرامج' },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-slate-100 bg-white p-5 text-right shadow-sm transition hover:border-customBlue/20 hover:shadow-md"
                      >
                        <Icon className="text-customBlue" size={26} />
                        <p className="mt-3 font-black text-deepBlue">{item.label}</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">{item.sub}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </PageShell>
      </section>

      {/* Process — light break */}
      <section className="border-y border-slate-200/60 bg-white py-16 sm:py-20">
        <PageShell>
          <ProcessSteps
            title={t('about.roadmap')}
            subtitle={t('about.roadmapSubtitle')}
            steps={journeySteps}
          />
        </PageShell>
      </section>

      {/* الرؤية والرسالة */}
      <section id="vision-mission" className="scroll-mt-28 py-16 sm:py-20">
        <PageShell>
          <SectionHeader
            eyebrow={t('about.vision')}
            title={`${t('about.vision')} ${t('about.mission')}`}
            subtitle={t('about.visionMissionSubtitle')}
          />
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-3xl border-t-4 border-customBlue bg-white p-8 text-right shadow-lg ring-1 ring-slate-100"
            >
              <div className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-sky-100/50 blur-2xl" />
              <h3 className="relative text-xl font-black text-deepBlue">{t('about.vision')}</h3>
              <p className="relative mt-4 leading-9 text-slate-600">
                {t('about.visionText')}
              </p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: 0.06 }}
              className="relative overflow-hidden rounded-3xl border-t-4 border-customOrange bg-white p-8 text-right shadow-lg ring-1 ring-slate-100"
            >
              <div className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-orange-100/40 blur-2xl" />
              <h3 className="relative text-xl font-black text-deepBlue">{t('about.mission')}</h3>
              <p className="relative mt-4 leading-9 text-slate-600">
                {t('about.missionText')}
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
            eyebrow={t('about.roadmap')}
            title={t('about.roadmap')}
            description={t('about.roadmapSubtitle')}
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
            eyebrow={t('about.leadership')}
            title={t('about.leadership')}
            description={t('about.leadershipDescription')}
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] p-8 text-right text-white shadow-2xl sm:p-10 lg:p-12"
          >
            <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-customOrange/15 blur-3xl" />
            <Quote className="relative text-customOrange" size={36} aria-hidden />
            <blockquote className="relative mt-6 text-lg font-medium leading-10 text-slate-100 sm:text-xl sm:leading-[2.15rem]">
              {t('about.leadershipQuote')}
            </blockquote>
            <footer className="relative mt-8 border-t border-white/15 pt-6 text-sm font-bold text-slate-300">
              {t('about.leadershipFooter')}
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
            eyebrow={t('about.whatMakesUsDifferent')}
            title={t('about.whatMakesUsDifferent')}
            subtitle={t('about.whatMakesUsDifferentDesc')}
          />
          <FeatureGrid>
            {differentiators.map((item) => (
              <FeatureCard
                key={item.title}
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

      {/* AI / digital — full width band */}
      <section className="bg-white py-16 sm:py-20">
        <PageShell>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <SectionHeader
              align="right"
              className="!mb-0 !mr-0 !max-w-none !text-right"
              eyebrow={t('about.statsDiverse')}
              title={t('about.aiSectionTitle')}
              subtitle={t('about.aiSectionSubtitle')}
            />
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl bg-[#f4f7fb] p-6 ring-1 ring-slate-200/80 sm:p-8"
            >
              <ul className="grid gap-3 text-slate-700 sm:grid-cols-2">
                {[
                  t('about.aiBullet1'),
                  t('about.aiBullet2'),
                  t('about.aiBullet3'),
                  t('about.aiBullet4'),
                ].map((line) => (
                  <li
                    key={line}
                    className="flex gap-3 rounded-2xl bg-white p-4 text-sm font-semibold leading-7 shadow-sm ring-1 ring-slate-100/80"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-customOrange" />
                    {line}
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
            title={t('about.whomWeServe')}
            subtitle={t('about.audienceSectionSubtitle')}
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: t('about.audienceStudents'),
                body: t('about.audienceStudentsBody'),
              },
              {
                title: t('about.audienceImmigrants'),
                body: t('about.audienceImmigrantsBody'),
              },
              {
                title: t('about.audienceProfessionals'),
                body: t('about.audienceProfessionalsBody'),
              },
              {
                title: t('about.audienceFamiliesTitle'),
                body: t('about.audienceFamiliesBody'),
              },
              {
                title: t('about.audienceInstitutions'),
                body: t('about.audienceInstitutionsBody'),
              },
              {
                title: t('about.audienceTrainers'),
                body: t('about.audienceTrainersBody'),
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                className="min-h-[160px] rounded-3xl border border-slate-100 bg-white p-7 text-right shadow-md ring-1 ring-slate-100/90"
              >
                <h3 className="text-lg font-black text-deepBlue">{card.title}</h3>
                <p className="mt-3 leading-8 text-slate-600">{card.body}</p>
              </motion.div>
            ))}
          </div>
        </PageShell>
      </section>

      {/* Mid CTA card */}
      <section className="pb-16 sm:pb-20">
        <PageShell>
          <motion.div
            className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-gradient-to-l from-white to-sky-50/40 p-8 text-right shadow-lg ring-1 ring-slate-200/80 sm:flex-row sm:items-center sm:p-10"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h2 className="text-2xl font-black text-deepBlue sm:text-3xl">{t('about.readyForNext')}</h2>
              <p className="mt-3 max-w-xl font-medium leading-9 text-slate-600">
                {t('about.midCtaText')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-7 py-4 text-sm font-extrabold text-white shadow-lg"
                >
                  {t('about.ctaPrograms')}
                  <ArrowLeft size={18} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-7 py-4 text-sm font-extrabold text-deepBlue transition hover:border-customBlue"
                >
                  {t('about.ctaContact')}
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </PageShell>
      </section>

      <CTASection
        title={t('about.ctaPrograms')}
        description={t('about.ctaSectionDescription')}
        primaryLabel={t('about.ctaPrograms')}
        primaryHref="/tracks"
        secondaryLabel={t('about.ctaContact')}
        secondaryHref="/partnerships"
      />
    </main>
  )
}

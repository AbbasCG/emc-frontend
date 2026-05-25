import { motion } from 'framer-motion'
import SectionHeader from '@/components/sections/SectionHeader'
import DepartmentsBentoMetrics from '@/components/departments/DepartmentsBentoMetrics'
import DepartmentsFaqAccordion from '@/components/departments/DepartmentsFaqAccordion'
import DepartmentsLayerTabs from '@/components/departments/DepartmentsLayerTabs'
import DepartmentsOrgEcosystem from '@/components/departments/DepartmentsOrgEcosystem'
import DepartmentsTimelineStrip from '@/components/departments/DepartmentsTimelineStrip'
import { useTranslation } from 'react-i18next'
import { CTASection, PublicPageHero } from '@/components/public'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

export default function Departments() {
  const { t } = useTranslation()

  const flowPhases = [
    {
      title: t('departments.phaseDesign'),
      body: t('departments.phaseDesignDesc'),
      tone: 'blue' as const,
    },
    {
      title: t('departments.phaseExecute'),
      body: t('departments.phaseExecuteDesc'),
      tone: 'orange' as const,
    },
    {
      title: t('departments.phaseSustain'),
      body: t('departments.phaseSustainDesc'),
      tone: 'navy' as const,
    },
  ]
  return (
    <main className="bg-emcBg pt-20">
      <PublicPageHero
        eyebrow={t('departments.heroTitle')}
        title={t('departments.title')}
        subtitle={t('departments.heroSubtitle')}
        breadcrumbs={[
          { label: t('departments.breadcrumbHome'), href: '/' },
          { label: t('departments.title') },
        ]}
      />

      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            eyebrow={t('departments.whyDepartments')}
            title={t('departments.whyDepartments')}
            description={t('departments.whyDepartmentsDesc')}
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-deepBlue/10 bg-white p-8 text-right shadow-[0_20px_50px_-24px_rgba(15,42,67,0.2)] sm:p-10 lg:p-12"
          >
            <div className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-customBlue/[0.07] blur-3xl" />
            <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-customOrange/[0.08] blur-3xl" />
            <p className="relative text-lg font-medium leading-9 text-deepBlue/75">
              {t('departments.whyDepartmentsDesc')}
            </p>
          </motion.div>
        </div>
      </section>

      <DepartmentsBentoMetrics />

      <DepartmentsOrgEcosystem />

      <DepartmentsLayerTabs />

      <section className="border-t border-deepBlue/[0.06] bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            title={t('departments.howTheyWork')}
            description={t('departments.howTheyWorkDesc')}
          />
          <motion.div
            className="mt-10 grid gap-5 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
          >
            {flowPhases.map((b, i) => {
              const border =
                b.tone === 'blue'
                  ? 'border-t-4 border-customBlue'
                  : b.tone === 'orange'
                    ? 'border-t-4 border-customOrange'
                    : 'border-t-4 border-deepBlue'
              const badge =
                b.tone === 'blue'
                  ? 'bg-customBlue/[0.08] text-customBlue ring-customBlue/15'
                  : b.tone === 'orange'
                    ? 'bg-customOrange/[0.1] text-deepBlue ring-customOrange/25'
                    : 'bg-deepBlue/[0.06] text-deepBlue ring-deepBlue/15'
              return (
                <motion.div
                  key={b.title}
                  variants={staggerItem}
                  className={[
                    'relative overflow-hidden rounded-3xl border border-deepBlue/10 bg-emcBg p-7 text-right shadow-sm',
                    border,
                  ].join(' ')}
                >
                  <span className={['inline-flex rounded-full px-3 py-1 text-[10px] font-black ring-1', badge].join(' ')}>
                    {t('departments.phaseBadge', { number: i + 1 })}
                  </span>
                  <h3 className="mt-4 text-lg font-black text-deepBlue">{b.title}</h3>
                  <p className="mt-3 leading-8 text-deepBlue/70">{b.body}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      <DepartmentsTimelineStrip />

      <section id="governance" className="scroll-mt-28 px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            title={t('departments.governance')}
            description={t('departments.governanceDesc')}
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-deepBlue p-8 text-right text-white shadow-[0_28px_64px_-20px_rgba(15,42,67,0.45)] lg:p-10"
          >
            <div className="pointer-events-none absolute left-0 top-0 h-40 w-40 rounded-full bg-customBlue/15 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36 rounded-full bg-customOrange/10 blur-3xl" />
            <ul className="relative grid gap-3 text-sm font-semibold leading-8 text-white/90 sm:grid-cols-2">
              {[
                t('departments.governanceBullet1'),
                t('departments.governanceBullet2'),
                t('departments.governanceBullet3'),
                t('departments.governanceBullet4'),
              ].map((line) => (
                <li key={line} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span className="text-customOrange">•</span>
                  {line}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <DepartmentsFaqAccordion />

      <CTASection
        title={t('departments.joinTeam')}
        description={t('departments.ctaDescription')}
        primaryLabel={t('departments.ctaVolunteer')}
        primaryHref="/volunteer"
        secondaryLabel={t('departments.ctaContact')}
        secondaryHref="/contact"
      />
    </main>
  )
}

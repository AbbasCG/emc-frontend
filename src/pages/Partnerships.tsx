import { motion } from 'framer-motion'
import {
  BadgeCheck,
  BadgeDollarSign,
  BookMarked,
  Factory,
  HeartHandshake,
  Mic2,
  School,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import SectionHeader from '@/components/sections/SectionHeader'
import { CTASection, PublicPageHero } from '@/components/public'
import PublicSeo from '@/components/public/PublicSeo'
import { partnershipTypes } from '@/data/publicPages'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

/** M3 i18n: copy lives in the catalogs under partnerships.*. */
const BENEFIT_KEYS = ['design', 'coordination', 'visibility', 'review'] as const
const PROCESS_STEP_KEYS = ['initial', 'proposal', 'execution', 'evaluation'] as const
const EXAMPLE_KEYS = ['university', 'corporate', 'community'] as const

function TypeIcon({ name }: { name: string }) {
  const map: Record<string, LucideIcon> = {
    School,
    BookMarked,
    Factory,
    Mic2,
    HeartHandshake,
    BadgeDollarSign,
  }
  const Icon = map[name] ?? School
  return <Icon size={22} />
}

export default function Partnerships() {
  const { t } = useTranslation()
  return (
    <main className="bg-paper pt-20">
      <PublicSeo
        title="الشراكات"
        description="شراكات مؤسسية مع الجامعات والمدارس والشركات والمبادرات المجتمعية تعاون تعليمي مسؤول بأهداف محددة وأدوار واضحة ومخرجات قابلة للقياس."
        path="/partnerships"
      />
      <PublicPageHero
        eyebrow={t('partnerships.hero.eyebrow')}
        title={t('partnerships.hero.title')}
        subtitle={t('partnerships.hero.subtitle')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('partnerships.hero.breadcrumbCurrent') },
        ]}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            title={t('partnerships.why.title')}
            description={t('partnerships.why.description')}
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right ring-1 ring-line lg:p-10"
          >
            <p className="text-lg leading-9 text-slate-600">
              {t('partnerships.why.body')}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title={t('partnerships.typesTitle')} />
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {partnershipTypes.map((p) => (
              <motion.article
                key={p.title.ar}
                variants={staggerItem}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="group relative overflow-hidden rounded-3xl bg-white p-7 text-right ring-1 ring-line transition-colors hover:ring-customBlue/25"
              >
                <span aria-hidden className="emc-daylight pointer-events-none absolute inset-x-0 top-0 h-[3px] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-customBlue ring-1 ring-customBlue/15">
                  <TypeIcon name={p.icon} />
                </div>
                <h3 className="text-lg font-black text-deepBlue">{p.title.ar}</h3>
                <p className="mt-3 leading-8 text-slate-600">{p.description.ar}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title={t('partnerships.benefits.title')}
            description={t('partnerships.benefits.description')}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {BENEFIT_KEYS.map((key, i) => (
              <motion.div
                key={key}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="flex gap-3 rounded-3xl bg-white p-6 text-right ring-1 ring-line"
              >
                <BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-customBlue" />
                <p className="font-semibold leading-8 text-slate-700">{t(`partnerships.benefits.items.${key}`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title={t('partnerships.process.title')}
            description={t('partnerships.process.description')}
          />
          <motion.ol
            className="grid gap-4 md:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {PROCESS_STEP_KEYS.map((key, i) => (
              <motion.li
                key={key}
                variants={staggerItem}
                className="rounded-3xl bg-white p-6 text-right ring-1 ring-line"
              >
                <span className="emc-num text-xs font-black tabular-nums text-accent-700">{t('partnerships.process.stageBadge', { num: i + 1 })}</span>
                <p className="mt-2 text-lg font-black text-deepBlue">{t(`partnerships.process.steps.${key}.title`)}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{t(`partnerships.process.steps.${key}.description`)}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title={t('partnerships.examples.title')}
            description={t('partnerships.examples.description')}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {EXAMPLE_KEYS.map((key) => (
              <motion.div
                key={key}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45 }}
                className="rounded-3xl border border-dashed border-customBlue/25 bg-white/80 p-6 text-right leading-8 text-slate-700"
              >
                {t(`partnerships.examples.items.${key}`)}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-7xl rounded-3xl bg-white p-8 text-right ring-1 ring-line lg:p-10"
        >
          <h2 className="emc-title-arc text-2xl font-black text-deepBlue">{t('partnerships.contactBlock.title')}</h2>
          <p className="mt-4 max-w-3xl text-lg leading-9 text-slate-600">
            {t('partnerships.contactBlock.body')}
          </p>
        </motion.div>
      </section>

      <CTASection
        title={t('partnerships.cta.title')}
        description={t('partnerships.cta.description')}
        primaryLabel={t('partnerships.cta.primary')}
        primaryHref="/partnerships/apply"
        secondaryLabel={t('partnerships.cta.secondary')}
        secondaryHref="/contact"
      />
    </main>
  )
}

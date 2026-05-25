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
import SectionHeader from '@/components/sections/SectionHeader'
import { CTASection, PublicPageHero } from '@/components/public'
import { useTranslation } from 'react-i18next'
import { partnershipTypes, t as contentT } from '@/data/publicPages'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

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
    <main className="bg-[#f4f7fb] pt-20">
      <PublicPageHero
        eyebrow={t('partnerships.heroTitle')}
        title={t('partnerships.title')}
        subtitle="نرحب بالجامعات، المدارس، الشركات، المدربين، المبادرات المجتمعية، والجهات الداعمة — بشروط وضوح وهدف مشترك."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: t('partnerships.title') },
        ]}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            title={t('partnerships.whyPartner')}
            description={t('partnerships.whyPartnerDesc')}
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right shadow-lg ring-1 ring-slate-100 lg:p-10"
          >
            <p className="text-lg leading-9 text-slate-600">
              {t('partnerships.whyPartnerDesc')}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title={t('partnerships.types')} />
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {partnershipTypes.map((p) => (
              <motion.article
                key={contentT(p.title)}
                variants={staggerItem}
                className="rounded-3xl bg-white p-7 text-right shadow-lg ring-1 ring-slate-100"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-customBlue">
                  <TypeIcon name={p.icon} />
                </div>
                <h3 className="text-lg font-black text-deepBlue">{contentT(p.title)}</h3>
                <p className="mt-3 leading-8 text-slate-600">{contentT(p.description)}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title={t('partnerships.benefits')}
            description={t('partnerships.benefitDesc')}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              t('partnerships.benefitAudience'),
              t('partnerships.benefitCoBrand'),
              t('partnerships.benefitReports'),
              t('partnerships.benefitNetwork'),
            ].map((line, i) => (
              <motion.div
                key={line}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="flex gap-3 rounded-3xl bg-white p-6 text-right shadow-md ring-1 ring-slate-100"
              >
                <BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-customBlue" />
                <p className="font-semibold leading-8 text-slate-700">{line}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title={t('partnerships.journey')}
            description="خطوات بسيطة تقلل الالتباس وتسرّع الانطلاق — مع مرونة حسب نوع الشريك."
          />
          <motion.ol
            className="grid gap-4 md:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {[
              { t: t('partnerships.stepContact'), d: t('partnerships.stepContactDesc') },
              { t: t('partnerships.stepProposal'), d: t('partnerships.stepProposalDesc') },
              { t: t('partnerships.stepExecute'), d: t('partnerships.stepExecuteDesc') },
              { t: t('partnerships.stepEvaluate'), d: t('partnerships.stepEvaluateDesc') },
            ].map((step, i) => (
              <motion.li
                key={step.t}
                variants={staggerItem}
                className="rounded-3xl bg-white p-6 text-right shadow-md ring-1 ring-slate-100"
              >
                <span className="text-xs font-black text-customOrange">المرحلة {i + 1}</span>
                <p className="mt-2 text-lg font-black text-deepBlue">{step.t}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{step.d}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title={t('partnerships.opportunities')}
            description="عناوين واقعية يمكن تخصيصها لاحقاً حسب توفر البرامج والجهات."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              t('partnerships.opp1'),
              t('partnerships.opp2'),
              t('partnerships.opp3'),
            ].map((ex) => (
              <motion.div
                key={ex}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45 }}
                className="rounded-3xl border border-dashed border-customBlue/25 bg-white/80 p-6 text-right leading-8 text-slate-700 shadow-sm"
              >
                {ex}
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
          className="mx-auto max-w-7xl rounded-3xl bg-white p-8 text-right shadow-xl ring-1 ring-slate-100 lg:p-10"
        >
          <h2 className="text-2xl font-black text-deepBlue">{t('partnerships.ctaStart')}</h2>
          <p className="mt-4 max-w-3xl text-lg leading-9 text-slate-600">
            أرسل لنا فكرة الشراكة، نوع المؤسسة، والفئة المستهدفة. سنرد برسالة توضح إمكانية
            التعاون والخطوة التالية — دون التزام قبل الاتفاق المتبادل.
          </p>
        </motion.div>
      </section>

      <CTASection
        title={t('partnerships.ctaStart')}
        description="تواصل معنا عبر صفحة التواصل، واختر موضوعاً متعلقاً بالشراكات ليتم توجيه رسالتك للفريق المناسب."
        primaryLabel={t('partnerships.ctaContact')}
        primaryHref="/contact"
        secondaryLabel={t('partnerships.ctaWorkshop')}
        secondaryHref="/submit-workshop"
      />
    </main>
  )
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Bell, BookOpen, GraduationCap, MonitorCheck, Shield, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'


export default function Platform() {
  const { t } = useTranslation()
  const features = [
  {
    icon: MonitorCheck,
    titleKey: 'platform.feature1',
    description: t('platform.feature1Desc'),
    color: 'bg-sky-50 text-customBlue',
  },
  {
    icon: Users,
    titleKey: 'platform.feature2',
    description: t('platform.feature2Desc'),
    color: 'bg-orange-50 text-customOrange',
  },
  {
    icon: BookOpen,
    titleKey: 'platform.feature3',
    description: t('platform.feature3Desc'),
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: GraduationCap,
    titleKey: 'platform.feature4',
    description: t('platform.feature4Desc'),
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: Bell,
    titleKey: 'platform.feature5',
    description: t('platform.feature5Desc'),
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Shield,
    titleKey: 'platform.feature6',
    description: t('platform.feature6Desc'),
    color: 'bg-rose-50 text-rose-600',
  },
]

const steps = [
  { number: '١', titleKey: 'platform.step1', desc: t('platform.step1Desc') },
  { number: '٢', titleKey: 'platform.step2', desc: t('platform.step2Desc') },
  { number: '٣', titleKey: 'platform.step3', desc: t('platform.step3Desc') },
  { number: '٤', titleKey: 'platform.step4', desc: t('platform.step4Desc') },
]

  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title={t('platform.title')}
        subtitle={t('platform.heroSubtitle')}
        breadcrumbs={[
          { label: t('courses.breadcrumbHome'), href: '/' },
          { label: t('platform.title') },
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
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55 }}
          >
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-customBlue">
              <MonitorCheck size={17} />
              {t('platform.globalPlatform')}
            </span>
            <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">{t('platform.whyEmc')}</h2>
            <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
            <p className="mt-7 text-lg leading-10 text-slate-600">
              {t('platform.heroText')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {[t('platform.tagOnline'), t('platform.tagSupport'), t('platform.tagCertified'), t('platform.tagAccredited')].map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-black text-deepBlue shadow-sm ring-1 ring-slate-200">
                  <BadgeCheck size={14} className="text-customBlue" />
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div
            className="order-1 overflow-hidden rounded-2xl shadow-2xl lg:order-2"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
          >
            <img
              src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=85"
              alt={t('platform.heroImageAlt')}
              className="h-[420px] w-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">{t('platform.benefits')}</h2>
            <span className="mx-auto mt-4 block h-1 w-20 rounded-full bg-customOrange" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, index) => {
              const Icon = feat.icon
              return (
                <motion.article
                  key={feat.titleKey}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.07 }}
                  className="rounded-2xl bg-slate-50 p-6 text-right ring-1 ring-slate-100"
                >
                  <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl ${feat.color}`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-black text-deepBlue">{t(feat.titleKey)}</h3>
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
            <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">{t('platform.howToStart')}</h2>
            <span className="mx-auto mt-4 block h-1 w-20 rounded-full bg-customOrange" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-2xl bg-white p-6 text-right shadow-lg ring-1 ring-slate-100"
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-deepBlue text-xl font-black text-white">
                  {step.number}
                </span>
                <h3 className="text-lg font-black text-deepBlue">{t(step.titleKey)}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] p-8 text-right text-white shadow-2xl sm:p-10 lg:flex-row lg:items-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h2 className="text-3xl font-black sm:text-4xl">{t('platform.ctaSectionTitle')}</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              {t('platform.ctaSectionDesc')}
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
            >
               {t('platform.ctaStart')}
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

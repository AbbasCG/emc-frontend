import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowLeftCircle, BriefcaseBusiness, GraduationCap, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'


export default function Paths() {
  const { t } = useTranslation()
  const paths = [
  {
    icon: GraduationCap,
    titleKey: 'paths.studentPath',
    subtitle: t('paths.studentSubtitle'),
    description: t('paths.studentPathDesc'),
    steps: [
      { label: t('paths.studentStep1Label'), desc: t('paths.studentStep1Desc') },
      { label: t('paths.studentStep2Label'), desc: t('paths.studentStep2Desc') },
      { label: t('paths.studentStep3Label'), desc: t('paths.studentStep3Desc') },
      { label: t('paths.studentStep4Label'), desc: t('paths.studentStep4Desc') },
    ],
    color: 'bg-sky-50 text-customBlue',
    accent: 'bg-customBlue',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=80',
  },
  {
    icon: BriefcaseBusiness,
    titleKey: 'paths.professionalPath',
    subtitle: t('paths.professionalSubtitle'),
    description: t('paths.professionalDesc'),
    steps: [
      { label: t('paths.professionalStep1Label'), desc: t('paths.professionalStep1Desc') },
      { label: t('paths.professionalStep2Label'), desc: t('paths.professionalStep2Desc') },
      { label: t('paths.professionalStep3Label'), desc: t('paths.professionalStep3Desc') },
      { label: t('paths.professionalStep4Label'), desc: t('paths.professionalStep4Desc') },
    ],
    color: 'bg-orange-50 text-customOrange',
    accent: 'bg-customOrange',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
  },
  {
    icon: Users,
    titleKey: 'paths.integrationPath',
    subtitle: t('paths.integrationSubtitle'),
    description: t('paths.integrationDesc'),
    steps: [
      { label: t('paths.integrationStep1Label'), desc: t('paths.integrationStep1Desc') },
      { label: t('paths.integrationStep2Label'), desc: t('paths.integrationStep2Desc') },
      { label: t('paths.integrationStep3Label'), desc: t('paths.integrationStep3Desc') },
      { label: t('paths.integrationStep4Label'), desc: t('paths.integrationStep4Desc') },
    ],
    color: 'bg-emerald-50 text-emerald-600',
    accent: 'bg-emerald-500',
    image: 'https://images.unsplash.com/photo-1532614479-0bd43847d059?auto=format&fit=crop&w=900&q=80',
  },
]

  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title={t('paths.title')}
        subtitle={t('paths.heroSubtitle')}
        breadcrumbs={[
          { label: t('courses.breadcrumbHome'), href: '/' },
          { label: t('paths.title') },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-12">
          {paths.map((path, pi) => {
            const Icon = path.icon
            return (
              <motion.article
                key={path.titleKey}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: pi * 0.08 }}
                className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 lg:grid lg:grid-cols-[1fr_380px]"
              >
                <div className="p-7 text-right sm:p-9">
                  <div className={`mb-5 inline-flex items-center gap-3 rounded-xl px-4 py-2.5 ${path.color}`}>
                    <Icon size={22} />
                    <span className="text-sm font-black">{path.subtitle}</span>
                  </div>
                  <h2 className="text-3xl font-black text-deepBlue">{t(path.titleKey)}</h2>
                  <span className="mt-3 block h-1 w-16 rounded-full bg-customOrange" />
                  <p className="mt-5 text-lg leading-9 text-slate-600">{path.description}</p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {path.steps.map((step, si) => (
                      <div key={step.label} className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${path.accent}`}>
                          {si + 1}
                        </span>
                        <div>
                          <p className="text-sm font-black text-deepBlue">{step.label}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/courses"
                    className={`mt-7 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white transition hover:opacity-90 ${path.accent}`}
                  >
                    {t('paths.ctaStart')}
                    <ArrowLeftCircle size={18} />
                  </Link>
                </div>

                <div className="relative hidden overflow-hidden lg:block">
                  <img
                    src={path.image}
                    alt={t(path.titleKey)}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-deepBlue/25" />
                </div>
              </motion.article>
            )
          })}
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
            <h2 className="text-3xl font-black sm:text-4xl">{t('paths.notSure')}</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              {t('paths.ctaSectionText')}
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
            >
              {t('paths.ctaConsult')}
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, BookOpen, Clock3, GraduationCap, Languages, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'


const stats = [
  { value: '+100', labelKey: 'programs.statsPrograms', icon: BookOpen },
  { value: '+2000', labelKey: 'programs.statsStudents', icon: Users },
  { value: '+95%', labelKey: 'programs.statsSatisfaction', icon: BadgeCheck },
]

export default function Programs() {
  const { t } = useTranslation()
  const programs = [
  {
    icon: Clock3,
    titleKey: 'programs.shortCourses',
    duration: t('programs.shortCoursesDuration'),
    desc: t('programs.shortCoursesDesc'),
    features: [t('programs.shortCoursesFeature1'), t('programs.shortCoursesFeature2'), t('programs.shortCoursesFeature3'), t('programs.shortCoursesFeature4')],
    color: 'bg-sky-50',
    iconColor: 'text-customBlue',
    badgeKey: 'programs.popular',
  },
  {
    icon: BookOpen,
    titleKey: 'programs.integratedPrograms',
    duration: t('programs.integratedDuration'),
    desc: t('programs.integratedDesc'),
    features: [t('programs.integratedFeature1'), t('programs.integratedFeature2'), t('programs.integratedFeature3'), t('programs.integratedFeature4')],
    color: 'bg-orange-50',
    iconColor: 'text-customOrange',
    badgeKey: null,
  },
  {
    icon: Languages,
    titleKey: 'programs.languagePrograms',
    duration: t('programs.languageDuration'),
    desc: t('programs.languageDesc'),
    features: [t('programs.languageFeature1'), t('programs.languageFeature2'), t('programs.languageFeature3'), t('programs.languageFeature4')],
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    badgeKey: null,
  },
  {
    icon: GraduationCap,
    titleKey: 'programs.certificates',
    duration: t('programs.certificatesDuration'),
    desc: t('programs.certificatesDesc'),
    features: [t('programs.certificatesFeature1'), t('programs.certificatesFeature2'), t('programs.certificatesFeature3'), t('programs.certificatesFeature4')],
    color: 'bg-violet-50',
    iconColor: 'text-violet-600',
    badgeKey: 'common.new',
  },
]

  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title={t('programs.title')}
        subtitle={t('programs.heroSubtitle')}
        breadcrumbs={[
          { label: t('courses.breadcrumbHome'), href: '/' },
          { label: t('programs.title') },
        ]}
      />

      {/* Stats */}
      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.labelKey}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
                className="flex items-center gap-5 rounded-2xl bg-slate-50 p-6 text-right ring-1 ring-slate-100"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-sky-50 text-customBlue">
                  <Icon size={26} />
                </span>
                <div>
                  <strong className="block text-3xl font-black text-customBlue">{stat.value}</strong>
                  <span className="text-sm font-bold text-slate-500">{t(stat.labelKey)}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Program cards */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-2">
            {programs.map((program, index) => {
              const Icon = program.icon
              return (
                <motion.article
                  key={program.titleKey}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="relative rounded-2xl bg-white p-7 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
                >
                  {program.badgeKey && (
                    <span className="absolute left-5 top-5 rounded-full bg-customOrange px-3 py-1 text-xs font-black text-white">
                      {t(program.badgeKey)}
                    </span>
                  )}
                  <div className={`mb-5 grid h-14 w-14 place-items-center rounded-xl ${program.color}`}>
                    <Icon size={28} className={program.iconColor} />
                  </div>
                  <h3 className="text-2xl font-black text-deepBlue">{t(program.titleKey)}</h3>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    <Clock3 size={12} />
                    {program.duration}
                  </div>
                  <p className="mt-4 leading-8 text-slate-600">{program.desc}</p>
                  <ul className="mt-5 grid grid-cols-2 gap-2">
                    {program.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <BadgeCheck size={15} className="shrink-0 text-customBlue" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </motion.article>
              )
            })}
          </div>

          <motion.div
            className="mt-10 text-center"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-8 py-4 font-extrabold text-white shadow-lg transition hover:opacity-90"
            >
              {t('programs.browseAll')}
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
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
            <h2 className="text-3xl font-black sm:text-4xl">{t('programs.needHelp')}</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              {t('programs.ctaText')}
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
            >
              {t('common.contactUs')}
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

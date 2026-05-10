import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, BookOpen, Clock3, GraduationCap, Languages, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

const programs = [
  {
    icon: Clock3,
    title: 'الدورات القصيرة',
    duration: 'أسبوع — 4 أسابيع',
    desc: 'دورات مكثفة ومرنة تناسب المهنيين المشغولين. تركز على مهارة واحدة أو موضوع محدد مع نتائج فورية.',
    features: ['محتوى مكثف', 'جداول مرنة', 'شهادة إتمام', 'أونلاين وحضوري'],
    color: 'bg-sky-50',
    iconColor: 'text-customBlue',
    badge: 'الأكثر شعبية',
  },
  {
    icon: BookOpen,
    title: 'البرامج المتكاملة',
    duration: '2 — 6 أشهر',
    desc: 'برامج شاملة تجمع عدة مهارات في مسار واحد متصاعد، مع متابعة مستمرة ومشاريع تطبيقية.',
    features: ['مسار متكامل', 'مشاريع تطبيقية', 'متابعة شخصية', 'شهادة احترافية'],
    color: 'bg-orange-50',
    iconColor: 'text-customOrange',
    badge: null,
  },
  {
    icon: Languages,
    title: 'برامج اللغات',
    duration: '4 — 24 أسبوعاً',
    desc: 'مسارات لغوية متدرجة من المبتدئ إلى المتقدم بالإنجليزية والهولندية والعربية، مع تركيز على اللغة العملية.',
    features: ['مستويات متعددة', 'محادثة حية', 'إعداد للاختبارات', 'طلاب ومهنيون'],
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    badge: null,
  },
  {
    icon: GraduationCap,
    title: 'الشهادات المهنية',
    duration: '3 — 9 أشهر',
    desc: 'برامج تنتهي بشهادات معتمدة في مجالات الإدارة والتقنية والتسويق والبيانات.',
    features: ['شهادة معتمدة', 'إشراف خبراء', 'تقييم مستمر', 'اعتراف دولي'],
    color: 'bg-violet-50',
    iconColor: 'text-violet-600',
    badge: 'جديد',
  },
]

const stats = [
  { value: '+100', label: 'برنامج ودورة', icon: BookOpen },
  { value: '+2000', label: 'متدرب', icon: Users },
  { value: '+95%', label: 'رضا المتدربين', icon: BadgeCheck },
]

export default function Programs() {
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="البرامج التدريبية"
        subtitle="برامج متنوعة تلائم كل مستوى وهدف — من الدورات القصيرة إلى الشهادات المهنية المعتمدة."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'البرامج' },
        ]}
      />

      {/* Stats */}
      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
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
                  <span className="text-sm font-bold text-slate-500">{stat.label}</span>
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
                  key={program.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="relative rounded-2xl bg-white p-7 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
                >
                  {program.badge && (
                    <span className="absolute left-5 top-5 rounded-full bg-customOrange px-3 py-1 text-xs font-black text-white">
                      {program.badge}
                    </span>
                  )}
                  <div className={`mb-5 grid h-14 w-14 place-items-center rounded-xl ${program.color}`}>
                    <Icon size={28} className={program.iconColor} />
                  </div>
                  <h3 className="text-2xl font-black text-deepBlue">{program.title}</h3>
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
              تصفح جميع البرامج والدورات
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
            <h2 className="text-3xl font-black sm:text-4xl">احتاج مساعدة في الاختيار؟</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              فريق مستشارينا جاهز لمساعدتك في اختيار البرنامج المناسب لأهدافك وظروفك.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
            >
              تواصل معنا
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

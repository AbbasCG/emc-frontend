import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, BriefcaseBusiness, GraduationCap, Monitor, Sparkles, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

const departments = [
  {
    icon: BookOpen,
    title: 'قسم اللغات',
    description: 'برامج متخصصة في اللغة الإنجليزية والهولندية والعربية لتعزيز التواصل الأكاديمي والمهني.',
    count: '+30 دورة',
    color: 'bg-sky-50 text-customBlue',
  },
  {
    icon: BriefcaseBusiness,
    title: 'قسم التدريب المهني',
    description: 'مسارات تدريبية عملية في مجالات التوظيف وسوق العمل ومهارات المقابلات الوظيفية.',
    count: '+20 دورة',
    color: 'bg-orange-50 text-customOrange',
  },
  {
    icon: GraduationCap,
    title: 'قسم الاستشارات الأكاديمية',
    description: 'إرشاد متخصص للقبول الجامعي والمنح الدراسية والتخطيط الأكاديمي طويل الأمد.',
    count: '+10 برنامج',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: Monitor,
    title: 'قسم المهارات الرقمية',
    description: 'دورات في الذكاء الاصطناعي، علم البيانات، التسويق الرقمي، وإدارة المشاريع التقنية.',
    count: '+15 دورة',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Sparkles,
    title: 'قسم التطوير الشخصي',
    description: 'برامج تنمية الذات والقيادة والتفكير الإبداعي وإدارة الوقت والتواصل الفعّال.',
    count: '+12 دورة',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Users,
    title: 'قسم الاندماج والتكامل',
    description: 'برامج تساعد المهاجرين والوافدين الجدد على الاندماج الأكاديمي والمجتمعي بسهولة.',
    count: '+8 برامج',
    color: 'bg-rose-50 text-rose-600',
  },
]

export default function Departments() {
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="الأقسام الأكاديمية"
        subtitle="استكشف أقسامنا المتخصصة وابحث عن البرنامج الذي يناسب أهدافك الأكاديمية والمهنية."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الأقسام' },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept, index) => {
              const Icon = dept.icon
              return (
                <motion.article
                  key={dept.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.07 }}
                  className="rounded-2xl bg-white p-7 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
                >
                  <div className={`mb-5 grid h-14 w-14 place-items-center rounded-xl ${dept.color}`}>
                    <Icon size={28} />
                  </div>
                  <h3 className="text-xl font-black text-deepBlue">{dept.title}</h3>
                  <p className="mt-3 leading-8 text-slate-600">{dept.description}</p>
                  <span className="mt-5 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    {dept.count}
                  </span>
                </motion.article>
              )
            })}
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
            <h2 className="text-3xl font-black sm:text-4xl">ابدأ رحلتك التعليمية اليوم</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              اختر القسم المناسب لك وتصفح دوراته للانطلاق نحو أهدافك.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/courses"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
            >
              استكشف الدورات
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

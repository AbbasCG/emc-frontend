import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowLeftCircle, BriefcaseBusiness, GraduationCap, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

const paths = [
  {
    icon: GraduationCap,
    title: 'مسار الطالب',
    subtitle: 'من الإعداد إلى القبول الجامعي',
    description: 'مسار متكامل يأخذ الطالب من تحسين مهاراته اللغوية وصولاً إلى القبول في الجامعات الأوروبية والحصول على المنح.',
    steps: [
      { label: 'تقييم المستوى', desc: 'تحديد نقطة البداية وتحليل الفجوات المهارية' },
      { label: 'تعزيز اللغة', desc: 'IELTS / TOEFL / هولندية حسب الوجهة' },
      { label: 'القبول الأكاديمي', desc: 'إعداد الملف الجامعي ورسائل القبول' },
      { label: 'الانطلاق', desc: 'دعم ما بعد القبول والتكيف الأكاديمي' },
    ],
    color: 'bg-sky-50 text-customBlue',
    accent: 'bg-customBlue',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=80',
  },
  {
    icon: BriefcaseBusiness,
    title: 'مسار المهني',
    subtitle: 'من المهارات إلى فرصة العمل',
    description: 'برنامج متكامل لتطوير الكفاءات المهنية ومهارات التوظيف والتميز في سوق العمل الأوروبي.',
    steps: [
      { label: 'تقييم الكفاءات', desc: 'تحليل المهارات الحالية ومتطلبات السوق' },
      { label: 'التدريب المهني', desc: 'دورات المهارات والتخصص الوظيفي' },
      { label: 'التهيئة للتوظيف', desc: 'السيرة الذاتية والمقابلات والشبكة المهنية' },
      { label: 'فرصة العمل', desc: 'دعم مستمر حتى الحصول على الوظيفة' },
    ],
    color: 'bg-orange-50 text-customOrange',
    accent: 'bg-customOrange',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
  },
  {
    icon: Users,
    title: 'مسار الاندماج',
    subtitle: 'من الوصول إلى الانتماء',
    description: 'مسار متخصص يساعد المهاجرين والوافدين الجدد على الاندماج في المجتمع والحياة الأكاديمية والمهنية.',
    steps: [
      { label: 'اللغة والثقافة', desc: 'تعلم الهولندية وفهم الثقافة المحلية' },
      { label: 'التوجيه المجتمعي', desc: 'فهم الأنظمة والخدمات المتاحة' },
      { label: 'التطوير المهني', desc: 'مهارات العمل ومتطلبات سوق العمل المحلي' },
      { label: 'الاستقلالية', desc: 'بناء شبكة علاقات وتحقيق الاستقرار' },
    ],
    color: 'bg-emerald-50 text-emerald-600',
    accent: 'bg-emerald-500',
    image: 'https://images.unsplash.com/photo-1532614479-0bd43847d059?auto=format&fit=crop&w=900&q=80',
  },
]

export default function Paths() {
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="المسارات التعليمية"
        subtitle="مسارات متكاملة مصممة لتأخذك خطوة بخطوة من حيث أنت إلى حيث تريد أن تكون."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'المسارات' },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-12">
          {paths.map((path, pi) => {
            const Icon = path.icon
            return (
              <motion.article
                key={path.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
                transition={{ duration: 0.5, delay: pi * 0.08 }}
                className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 lg:grid lg:grid-cols-[1fr_380px]"
              >
                <div className="p-7 text-right sm:p-9">
                  <div className={`mb-5 inline-flex items-center gap-3 rounded-xl px-4 py-2.5 ${path.color}`}>
                    <Icon size={22} />
                    <span className="text-sm font-black">{path.subtitle}</span>
                  </div>
                  <h2 className="text-3xl font-black text-deepBlue">{path.title}</h2>
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
                    ابدأ هذا المسار
                    <ArrowLeftCircle size={18} />
                  </Link>
                </div>

                <div className="relative hidden overflow-hidden lg:block">
                  <img
                    src={path.image}
                    alt={path.title}
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
          viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h2 className="text-3xl font-black sm:text-4xl">غير متأكد من مسارك؟</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              تواصل معنا وسيساعدك أحد مستشارينا في اختيار المسار الأنسب لأهدافك.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
            >
              تواصل مع مستشار
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

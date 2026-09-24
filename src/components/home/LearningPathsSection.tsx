import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, BookMarked, Brain, GraduationCap, Globe } from 'lucide-react'
import { fadeUp } from '../../utils/course'

const paths = [
  {
    icon: Globe,
    title: 'مسار اللغة والاندماج',
    desc: 'مصمم لمساعدتك على إتقان لغة جديدة والاندماج في بيئة جديدة بثقة ووضوح.',
    points: ['دورات لغوية تدريجية', 'محادثة ومهارات تواصل', 'دعم الاندماج الثقافي'],
    headerBg: 'bg-customBlue',
  },
  {
    icon: GraduationCap,
    title: 'مسار الدراسة والقبول الجامعي',
    desc: 'رحلة متكاملة من اختيار التخصص حتى القبول في الجامعة التي تناسب مسارك.',
    points: ['إرشاد اختيار التخصص', 'التقديم الجامعي', 'تطوير السيرة الذاتية'],
    headerBg: 'bg-customOrange',
  },
  {
    icon: BookMarked,
    title: 'مسار التوظيف والاستعداد المهني',
    desc: 'من التأهيل الوظيفي إلى التقديم الناجح وكسب فرصة العمل في السوق المناسب.',
    points: ['إعداد السيرة الذاتية', 'التدريب على المقابلات', 'استكشاف سوق العمل'],
    headerBg: 'bg-customBlue',
  },
  {
    icon: Brain,
    title: 'مسار المهارات التقنية والذكاء الاصطناعي',
    desc: 'ابدأ رحلتك في الذكاء الاصطناعي، تحليل البيانات، والمهارات الرقمية الحديثة.',
    points: ['مبادئ الذكاء الاصطناعي', 'تحليل البيانات', 'إدارة المشاريع التقنية'],
    headerBg: 'bg-customOrange',
  },
]

export default function LearningPathsSection() {
  return (
    <section className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">
            مسارات تطوير مصممة لرحلتك
          </h2>
          <span className="mx-auto mt-4 block h-1 w-20 rounded-full bg-customOrange" />
          <p className="mt-5 text-base leading-8 text-slate-500">
            اختر المسار الذي يناسب وضعك وهدفك، وابدأ بخطوات واضحة نحو نتائج حقيقية.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {paths.map((path, i) => {
            const Icon = path.icon
            return (
              <motion.article
                key={path.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.48, delay: i * 0.09 }}
                className="flex flex-col overflow-hidden rounded-2xl bg-white text-right ring-1 ring-line"
              >
                <div className={`${path.headerBg} p-6 text-white`}>
                  <Icon size={30} className="mb-3" aria-hidden="true" />
                  <h3 className="text-lg font-black leading-7">{path.title}</h3>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <p className="text-sm leading-8 text-slate-600">{path.desc}</p>

                  <ul className="mt-5 space-y-2.5" aria-label="تفاصيل المسار">
                    {path.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-center justify-end gap-2 text-sm font-semibold text-deepBlue"
                      >
                        <span>{point}</span>
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-customOrange"
                          aria-hidden="true"
                        />
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6">
                    <Link
                      to="/learning-paths"
                      className="inline-flex items-center gap-1.5 text-sm font-extrabold text-customBlue transition hover:underline"
                    >
                      استعرض المسار
                      <ArrowLeft size={15} />
                    </Link>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

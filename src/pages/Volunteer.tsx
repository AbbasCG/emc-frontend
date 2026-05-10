import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, CheckCircle2, Languages, MessageCircle, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

const roles = [
  {
    icon: BookOpen,
    title: 'مساعد مدرب',
    desc: 'ساعد مدربينا في تنفيذ الجلسات، وإعداد المواد، ودعم المتدربين خلال الدورات العملية.',
    requirements: ['خبرة في مجال الدورة', 'مهارات التواصل', 'الالتزام بمواعيد الجلسات'],
    color: 'bg-sky-50 text-customBlue',
  },
  {
    icon: Languages,
    title: 'متطوع لغوي',
    desc: 'ادعم المتدربين الجدد في تعلم اللغات من خلال جلسات المحادثة والممارسة اليومية.',
    requirements: ['إتقان لغة أجنبية', 'الصبر والتشجيع', 'أوقات مرنة أسبوعياً'],
    color: 'bg-orange-50 text-customOrange',
  },
  {
    icon: Users,
    title: 'مرشد ومنتور',
    desc: 'كن مرشداً لمتدرب يحتاج التوجيه في مساره المهني أو الأكاديمي وشاركه تجربتك.',
    requirements: ['خبرة مهنية 3+ سنوات', 'رغبة في التأثير', 'ساعتان أسبوعياً'],
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: MessageCircle,
    title: 'سفير EMC',
    desc: 'مثّل منصة EMC في مجتمعك وساعد في نشر الوعي ببرامجنا للوصول لمن يحتاجها.',
    requirements: ['شبكة علاقات واسعة', 'شغف بالتعليم', 'نشاط على وسائل التواصل'],
    color: 'bg-violet-50 text-violet-600',
  },
]

const impact = [
  { value: '200+', label: 'متطوع نشط' },
  { value: '1500+', label: 'ساعة تطوع سنوياً' },
  { value: '40+', label: 'جنسية ممثلة' },
]

export default function Volunteer() {
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="التطوع"
        subtitle="انضم إلى مجتمع المتطوعين في EMC وكن جزءاً من التغيير الحقيقي في حياة المتعلمين."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'التطوع' },
        ]}
      />

      {/* Impact numbers */}
      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-3">
          {impact.map((item, index) => (
            <motion.div
              key={item.label}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="rounded-2xl bg-slate-50 p-7 text-center ring-1 ring-slate-100"
            >
              <strong className="block text-4xl font-black text-customBlue">{item.value}</strong>
              <span className="mt-2 block text-sm font-bold text-slate-500">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">فرص التطوع</h2>
            <span className="mx-auto mt-4 block h-1 w-20 rounded-full bg-customOrange" />
            <p className="mt-5 text-lg leading-9 text-slate-600">
              نوفر فرص تطوع متنوعة تناسب مهاراتك ووقتك وشغفك بالتعليم.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {roles.map((role, index) => {
              const Icon = role.icon
              return (
                <motion.article
                  key={role.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="rounded-2xl bg-white p-7 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
                >
                  <div className={`mb-5 grid h-13 w-13 place-items-center rounded-xl ${role.color} h-12 w-12`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-black text-deepBlue">{role.title}</h3>
                  <p className="mt-3 leading-8 text-slate-600">{role.desc}</p>
                  <div className="mt-5">
                    <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">المتطلبات</p>
                    <ul className="space-y-2">
                      {role.requirements.map((req) => (
                        <li key={req} className="flex items-center gap-2.5 text-sm font-bold text-slate-600">
                          <CheckCircle2 size={15} className="shrink-0 text-customBlue" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why volunteer */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-right">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">لماذا تتطوع معنا؟</h2>
            <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
            <p className="mt-7 text-lg leading-10 text-slate-600">
              التطوع في EMC يمنحك فرصة التأثير الحقيقي في حياة آلاف المتعلمين بينما تطور
              مهاراتك القيادية والتدريبية، وتوسع شبكة علاقاتك المهنية في بيئة ملهمة.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                'شهادة تطوع معتمدة',
                'تدريب مجاني على التدريب',
                'شبكة علاقات مهنية دولية',
                'تجربة تدريب وقيادة حقيقية',
                'إمكانية الانتقال لدور مدفوع',
                'مجتمع داعم ومتنوع',
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm font-bold text-deepBlue">
                  <CheckCircle2 size={18} className="shrink-0 text-customBlue" />
                  {benefit}
                </li>
              ))}
            </ul>
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
            <h2 className="text-3xl font-black sm:text-4xl">جاهز للتطوع؟</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              تواصل معنا وأخبرنا عن مهاراتك واهتماماتك وسنجد معاً الدور المناسب لك.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
            >
              تقدم للتطوع
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

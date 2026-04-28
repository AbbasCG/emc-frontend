import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  Medal,
  MonitorCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

const valueCards = [
  {
    icon: Target,
    title: 'رسالتنا',
    description: 'تقديم تدريب تعليمي واستشاري مخصص يساعد المتعلمين والمهنيين على الوصول إلى أهدافهم بثقة.',
  },
  {
    icon: Lightbulb,
    title: 'رؤيتنا',
    description: 'أن نكون وجهتك الأولى للبرامج التعليمية والتدريبية التي تدعم التطور الأكاديمي والمهني.',
  },
  {
    icon: HeartHandshake,
    title: 'قيمنا',
    description: 'الاحترافية، الشفافية، الدعم الشخصي، والتمكين من خلال تدريب عملي ومُتابعة مستمرة.',
  },
]

const stats = [
  { value: '+100', label: 'دورة وورشة' },
  { value: '+2000', label: 'متدرب' },
  { value: '+50', label: 'مدرب معتمد' },
  { value: '+95%', label: 'رضا المتدربين' },
]

const whyItems = [
  {
    icon: MonitorCheck,
    title: 'برامج شاملة',
    description: 'تغطي اللغة، القبول الجامعي، التوظيف، والتدريب التقني في مسارات متكاملة.',
  },
  {
    icon: GraduationCap,
    title: 'خبراء محترفون',
    description: 'فريق من المدربين والاستشاريين الذين يدعمون الطلاب والمهاجرين وأصحاب الخبرة.',
  },
  {
    icon: Clock3,
    title: 'مرونة في التعلم',
    description: 'خيارات أونلاين وحضورية مصممة لتناسب جدولك وتمنحك تجربة عملية.',
  },
  {
    icon: BadgeCheck,
    title: 'نتائج قابلة للتطبيق',
    description: 'الدورات مصممة لترتقي بمهاراتك وتجهزك للمقابلات والسوق العملي.',
  },
]

export default function About() {
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="عن EMC"
        subtitle="منصة تعليمية رقمية عالمية تقدم استشارات تعليمية، ودورات لغات، وتدريباً مهنياً وتقنياً."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'عن EMC' },
        ]}
      />

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
              <Sparkles size={17} />
              EMC للاستشارات والتدريب
            </span>
            <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">من نحن</h2>
            <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
            <p className="mt-7 text-lg leading-10 text-slate-600">
              نحن منصة تعليمية رقمية عالمية تقدم استشارات تعليمية، ودورات لغات،
              وتدريباً مهنياً وتقنياً للطلاب والمهاجرين وكل من يسعى لتطوير مساره
              الأكاديمي أو المهني. نؤمن بدعم تعليمي مخصص ومتاح للجميع لتحقيق مستقبل
              أفضل.
            </p>
          </motion.div>

          <motion.div
            className="order-1 overflow-hidden rounded-2xl shadow-2xl lg:order-2"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
          >
            <img
              src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=85"
              alt="بيئة تعليمية في أكاديمية لغة إنجليزية"
              className="h-[420px] w-full object-cover transition duration-700 hover:scale-105"
            />
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {valueCards.map((card, index) => {
            const Icon = card.icon
            return (
              <motion.article
                key={card.title}
                className="rounded-2xl bg-white p-7 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <div className="mb-5 grid h-14 w-14 place-items-center rounded-xl bg-sky-50 text-customBlue">
                  <Icon size={28} />
                </div>
                <h3 className="text-2xl font-black text-deepBlue">{card.title}</h3>
                <p className="mt-4 leading-8 text-slate-600">{card.description}</p>
              </motion.article>
            )
          })}
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item, index) => (
            <motion.div
              key={item.label}
              className="rounded-2xl bg-slate-50 p-7 text-center shadow-md ring-1 ring-slate-100"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
            >
              <strong className="block text-4xl font-black text-customBlue">{item.value}</strong>
              <span className="mt-2 block text-sm font-black text-slate-500">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">لماذا EMC؟</h2>
            <span className="mx-auto mt-4 block h-1 w-20 rounded-full bg-customOrange" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.article
                  key={item.title}
                  className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                >
                  <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-customOrange">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-black text-deepBlue">{item.title}</h3>
                  <p className="mt-3 leading-8 text-slate-600">{item.description}</p>
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
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-sky-100">
              <Medal size={17} />
              ابدأ رحلتك نحو مستقبل أفضل
            </div>
            <h2 className="text-3xl font-black sm:text-4xl">ابدأ رحلتك نحو مستقبل أفضل</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              اختر الخدمة أو الدورة المناسبة لك واحصل على دعم مخصص يرافقك خطوة
              بخطوة.
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

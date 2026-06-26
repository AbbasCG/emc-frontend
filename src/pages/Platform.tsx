import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Bell, BookOpen, GraduationCap, MonitorCheck, Shield, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

const features = [
  {
    icon: MonitorCheck,
    title: 'تعلم هجين مرن',
    description: 'اختر بين الحضور الشخصي أو التعلم عن بُعد أو مزيج منهما بحسب جدولك وأهدافك.',
    color: 'bg-sky-50 text-customBlue',
  },
  {
    icon: Users,
    title: 'مدربون متخصصون',
    description: 'فريق من المدربين المعتمدين ذوي الخبرة في التعليم والتدريب المهني والاستشارات.',
    color: 'bg-orange-50 text-customOrange',
  },
  {
    icon: BookOpen,
    title: 'محتوى محدّث باستمرار',
    description: 'مناهج تواكب سوق العمل الحديث وتُحدَّث بانتظام لتعكس أحدث المتطلبات المهنية.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: GraduationCap,
    title: 'شهادات معتمدة',
    description: 'احصل على شهادات إتمام معتمدة تُعزز ملفك المهني وتفتح لك أبواباً جديدة.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: Bell,
    title: 'متابعة ودعم مستمر',
    description: 'نظام إشعارات وتذكيرات ودعم شخصي يضمن مواصلتك لمسيرتك التعليمية دون انقطاع.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Shield,
    title: 'بيئة آمنة وموثوقة',
    description: 'منصة محمية ببروتوكولات أمان حديثة تحافظ على بيانات المتدربين وخصوصيتهم.',
    color: 'bg-rose-50 text-rose-600',
  },
]

const steps = [
  { number: '١', title: 'إنشاء حساب', desc: 'سجّل في دقائق وأكمل ملفك الشخصي لتلقّي توصيات مخصصة.' },
  { number: '٢', title: 'اختر برنامجك', desc: 'تصفح الدورات والمسارات واختر ما يناسب هدفك ومستواك.' },
  { number: '٣', title: 'ابدأ التعلم', desc: 'انضم لجلساتك، تفاعل مع المدرب، وأنجز تطبيقاتك العملية.' },
  { number: '٤', title: 'احصل على شهادتك', desc: 'أتمم البرنامج واحصل على شهادتك المعتمدة لتعزيز مسيرتك.' },
]

export default function Platform() {
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="المنصة"
        subtitle="منصة EMC — بيئة تعليمية متكاملة صُممت لمساعدتك على النمو بثقة واحترافية."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'المنصة' },
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
            <span className="emc-wing emc-eyebrow mb-4">
              <MonitorCheck size={17} />
              منصة تعليمية رقمية عالمية
            </span>
            <h2 className="emc-title-arc font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">لماذا EMC؟</h2>
            <p className="mt-7 text-lg leading-10 text-slate-600">
              صُممت منصة EMC لتكون رفيقك في كل خطوة من رحلتك التعليمية — من اختيار
              البرنامج إلى الحصول على الشهادة والحصول على فرصة عملك. نجمع بين الخبرة
              الأكاديمية، والتدريب المهني، والدعم الشخصي في بيئة واحدة متكاملة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['أونلاين وحضوري', 'دعم شخصي', 'مدربون معتمدون', 'شهادات معتمدة'].map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-black text-deepBlue shadow-emc ring-1 ring-line">
                  <BadgeCheck size={14} className="text-customBlue" />
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div
            className="order-1 overflow-hidden rounded-3xl shadow-emc-lg ring-1 ring-line lg:order-2"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
          >
            <img
              src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=85"
              alt="بيئة التعلم الرقمي في EMC"
              className="h-[420px] w-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="emc-title-arc is-center font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">مزايا المنصة</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, index) => {
              const Icon = feat.icon
              return (
                <motion.article
                  key={feat.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.07 }}
                  className="group rounded-2xl bg-white p-6 text-right shadow-emc ring-1 ring-line transition duration-300 ease-emc hover:-translate-y-1 hover:shadow-emc-md hover:ring-customBlue/20"
                >
                  <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl shadow-inner transition duration-300 group-hover:scale-105 ${feat.color}`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="font-display text-xl font-black tracking-tight text-deepBlue">{feat.title}</h3>
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
            <h2 className="emc-title-arc is-center font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">كيف تبدأ؟</h2>
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
                className="group rounded-2xl bg-white p-6 text-right shadow-emc ring-1 ring-line transition duration-300 ease-emc hover:-translate-y-1 hover:shadow-emc-md hover:ring-customBlue/20"
              >
                <span className="emc-depth mb-4 flex h-12 w-12 items-center justify-center rounded-full font-latin text-xl font-black tabular-nums text-white shadow-emc">
                  {step.number}
                </span>
                <h3 className="font-display text-lg font-black tracking-tight text-deepBlue">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          className="emc-depth mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl p-8 text-right text-white shadow-emc-xl ring-1 ring-white/10 sm:p-10 lg:flex-row lg:items-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">ابدأ تجربتك اليوم</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-ice/90">
              سجّل مجاناً وابدأ استكشاف برامجنا التعليمية الآن.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white shadow-emc-md transition"
            >
              سجّل الآن مجاناً
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

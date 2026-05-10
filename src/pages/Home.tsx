import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Languages,
  MessageCircle,
  MonitorCheck,
  Star,
  UserPlus,
  Users,
} from 'lucide-react'
import { fadeUp } from '../utils/course'

const stats = [
  { value: '+50', label: 'مدرب معتمد' },
  { value: '+2000', label: 'متدرب' },
  { value: '+100', label: 'دورة وورشة' },
]

const features = [
  {
    icon: MessageCircle,
    title: 'استشارات تعليمية مخصصة',
    description: 'خطط تعليمية وشخصية تساعدك على رسم أهدافك الأكاديمية والمهنية بدقة.',
  },
  {
    icon: Languages,
    title: 'دورات لغات متعددة',
    description: 'برامج مهنية ولغوية باللغة الإنجليزية والهولندية والعربية لتعزيز فرصك العالمية.',
  },
  {
    icon: MonitorCheck,
    title: 'تدريب مهني وتقني',
    description: 'مسارات في الذكاء الاصطناعي، علم البيانات، إدارة المشاريع، والتسويق.',
  },
  {
    icon: Users,
    title: 'دعم للطلاب والمهاجرين',
    description: 'متابعة ودعم عملي لمساعدتك على التنقل الأكاديمي والمهني بثقة.',
  },
]

const homeCourses = [
  {
    title: 'لغة إنجليزية احترافية',
    category: 'اللغة الإنجليزية',
    isFree: true,
    image:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
    duration: '6 أسابيع',
    students: '420 متدرب',
  },
  {
    title: 'القبول الجامعي ',
    category: 'القبول الجامعي',
    isFree: false,
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
    duration: '8 أسابيع',
    students: '310 متدرب',
  },
  {
    title: 'جاهزية سوق العمل',
    category: 'جاهزية سوق العمل',
    isFree: false,
    image:
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
    duration: '10 أسابيع',
    students: '260 متدرب',
  },
  {
    title: 'مدخل إلى علم البيانات',
    category: 'علم البيانات',
    isFree: true,
    image:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
    duration: '3 أيام',
    students: '190 متدرب',
  },
]

export default function Home() {
  return (
    <main>
      <Hero />
      <WhyChoose />
      <HomeCourses />
      <AboutPreview />
      <CTA />
    </main>
  )
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-deepBlue pt-28 text-white lg:pt-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(38,145,194,0.34),transparent_30%),linear-gradient(135deg,#22334a_0%,#182638_64%,#0f1c2b_100%)]" />
      <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8">
        <motion.div
          className="order-2 text-right lg:order-1"
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-sky-100 ring-1 ring-white/15">
            <Star size={16} className="fill-customOrange text-customOrange" />
            منصة تعليمية رقمية عالمية
          </span>
          <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl lg:text-7xl">
            طوّر مستقبلك الأكاديمي والمهني
            <span className="block text-customOrange">بثقة واحـــتـرافية</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-9 text-slate-200">
            منصة تعليمية رقمية عالمية تقدم استشارات تعليمية، ودورات لغات، وتدريباً
            مهنياً وتقنياً لمساعدتك على اتخاذ خطوات واثقة نحو مستقبلك.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <motion.div whileHover={{ scale: 1.04 }}>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-customOrange px-7 py-4 text-base font-extrabold text-white shadow-xl shadow-orange-950/20"
              >
                <UserPlus size={20} />
                سجل الآن
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }}>
              <Link
                to="/courses"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-customBlue px-7 py-4 text-base font-extrabold text-white shadow-xl shadow-sky-950/20"
              >
                استكشف الدورات
                <ArrowLeft size={20} />
              </Link>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="relative order-1 mx-auto w-full max-w-xl lg:order-2"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1100&q=85"
              alt="فريق تعليمي يقدم تدريباً احترافياً"
              className="h-[430px] w-full object-cover sm:h-[540px]"
            />
            <div className="absolute inset-0 bg-deepBlue/35 mix-blend-multiply" />
          </div>
          <div className="absolute -right-2 top-8 grid gap-4 sm:-right-8">
            {stats.slice(0, 3).map((item, index) => (
              <StatCard key={item.label} {...item} delay={index * 0.12} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function StatCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      className="min-w-36 rounded-xl bg-white/95 px-5 py-4 text-right shadow-2xl"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65 + delay }}
    >
      <strong className="block text-2xl font-black text-customOrange">{value}</strong>
      <span className="text-sm font-bold text-deepBlue">{label}</span>
    </motion.div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">{children}</h2>
      <span className="mx-auto mt-4 block h-1 w-20 rounded-full bg-customOrange" />
    </div>
  )
}

function WhyChoose() {
  return (
    <section className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionTitle>لماذا تختار EMC؟</SectionTitle>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.article
                key={feature.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-lg bg-white p-7 text-right shadow-lg shadow-slate-200/70 ring-1 ring-slate-100"
              >
                <div className="mb-5 grid h-14 w-14 place-items-center rounded-lg bg-sky-50 text-customBlue">
                  <Icon size={28} />
                </div>
                <h3 className="mb-3 text-xl font-extrabold text-deepBlue">{feature.title}</h3>
                <p className="leading-8 text-slate-600">{feature.description}</p>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function HomeCourses() {
  return (
    <section id="courses" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative">
          <SectionTitle>الدورات والخدمات</SectionTitle>
          <motion.div whileHover={{ scale: 1.04 }} className="mb-8 inline-flex lg:absolute lg:left-0 lg:top-1">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-lg bg-deepBlue px-5 py-3 text-sm font-bold text-white shadow-lg"
            >
              عرض جميع الدورات
              <ArrowLeft size={18} />
            </Link>
          </motion.div>
        </div>
        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-4">
          {homeCourses.map((course, index) => (
            <motion.article
              key={course.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="overflow-hidden rounded-lg bg-white text-right shadow-xl shadow-slate-200 ring-1 ring-slate-100"
            >
              <div className="relative h-52 overflow-hidden">
                <img
                  src={course.image}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
                <span
                  className={`absolute right-4 top-4 rounded-full px-4 py-1.5 text-xs font-black text-white ${
                    course.isFree ? 'bg-customBlue' : 'bg-customOrange'
                  }`}
                >
                  {course.category}
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-deepBlue">{course.title}</h3>
                <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={16} />
                    {course.duration}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={16} />
                    {course.students}
                  </span>
                </div>
                <motion.div whileHover={{ scale: 1.03 }}>
                  <Link
                    to="/courses"
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customBlue px-5 py-3 text-sm font-extrabold text-white"
                  >
                    تفاصيل الدورة
                    <ArrowLeft size={18} />
                  </Link>
                </motion.div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

function AboutPreview() {
  return (
    <section id="about" className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <motion.div
          className="relative overflow-hidden rounded-[1.75rem] shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55 }}
        >
          <img
            src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1100&q=85"
            alt="فريق تعليمي يعمل على مشاريع تدريبية" 
            className="h-[420px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-deepBlue/20" />
        </motion.div>
        <motion.div
          className="text-right"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">من نحن</h2>
          <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
          <p className="mt-7 text-lg leading-9 text-slate-600">
            نحن منصة تعليمية رقمية عالمية تقدم استشارات تعليمية، ودورات لغات،
            وتدريباً مهنياً وتقنياً للطلاب والمهاجرين وكل من يسعى لتطوير مساره
            الأكاديمي أو المهني. نؤمن بدعم تعليمي مخصص ومتاح للجميع لتحقيق مستقبل
            أفضل.
          </p>
          <div className="mt-9 grid grid-cols-3 gap-4">
            {stats.map((item) => (
              <div key={item.label} className="rounded-lg bg-white p-5 text-center shadow-md ring-1 ring-slate-100">
                <strong className="block text-3xl font-black text-customBlue">{item.value}</strong>
                <span className="mt-1 block text-sm font-bold text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section id="contact" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[1.75rem] bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] px-6 py-10 text-white shadow-2xl sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-14">
        <motion.div
          className="text-right"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55 }}
        >
          <h2 className="text-3xl font-black leading-tight sm:text-5xl">
            ابدأ رحلتك نحو مستقبل أفضل
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-9 text-slate-200">
            اختر الخدمة أو الدورة المناسبة لك واحصل على دعم مخصص يرافقك خطوة
            بخطوة.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <motion.div whileHover={{ scale: 1.04 }}>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
              >
                <UserPlus size={20} />
                سجل الآن
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }}>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-customBlue px-7 py-4 font-extrabold text-white"
              >
                <MessageCircle size={20} />
                تواصل معنا
              </Link>
            </motion.div>
          </div>
        </motion.div>
        <motion.div
          className="relative min-h-72"
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          <img
            src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=85"
            alt="طالب يستخدم جهاز لوحي للتعلم"
            className="h-80 w-full rounded-2xl object-cover shadow-2xl"
          />
          <div className="absolute -bottom-4 right-6 rounded-xl bg-white px-5 py-4 text-deepBlue shadow-xl">
            <span className="inline-flex items-center gap-2 text-sm font-black">
              <CheckCircle2 size={18} className="text-customBlue" />
              تعلم مرن من أي مكان
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

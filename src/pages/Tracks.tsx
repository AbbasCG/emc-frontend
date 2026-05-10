import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, BriefcaseBusiness, GraduationCap, Languages, Sparkles } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

const tracks = [
  {
    icon: Languages,
    number: '01',
    title: 'محور اللغات',
    description: 'إتقان اللغة الإنجليزية والهولندية والعربية للتواصل الأكاديمي والمهني في البيئات الدولية.',
    skills: ['اللغة الإنجليزية', 'اللغة الهولندية', 'العربية الفصحى', 'الكتابة الأكاديمية'],
    color: 'text-customBlue',
    bg: 'bg-sky-50',
    border: 'border-customBlue/20',
  },
  {
    icon: BriefcaseBusiness,
    number: '02',
    title: 'محور المهارات المهنية',
    description: 'تطوير الكفاءات الضرورية لسوق العمل من تواصل واحترافية ومهارات قيادية وإدارية.',
    skills: ['مهارات المقابلة', 'كتابة السيرة الذاتية', 'القيادة', 'التواصل المهني'],
    color: 'text-customOrange',
    bg: 'bg-orange-50',
    border: 'border-customOrange/20',
  },
  {
    icon: BookOpen,
    number: '03',
    title: 'محور التقنية والبيانات',
    description: 'مسارات في الذكاء الاصطناعي، علم البيانات، البرمجة، والتسويق الرقمي لمواكبة سوق العمل.',
    skills: ['الذكاء الاصطناعي', 'علم البيانات', 'إدارة المشاريع', 'التسويق الرقمي'],
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    icon: GraduationCap,
    number: '04',
    title: 'محور القبول الجامعي',
    description: 'استشارات ودورات متخصصة للتقديم على الجامعات الأوروبية والحصول على منح دراسية.',
    skills: ['اختبارات IELTS/TOEFL', 'رسالة القبول', 'المقابلات الجامعية', 'خطة الدراسة'],
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  {
    icon: Sparkles,
    number: '05',
    title: 'محور التطوير الشخصي',
    description: 'برامج بناء الثقة بالنفس، إدارة الوقت، التفكير النقدي، والذكاء العاطفي.',
    skills: ['إدارة الوقت', 'التفكير النقدي', 'الذكاء العاطفي', 'بناء العلاقات'],
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
]

export default function Tracks() {
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="المحاور التعليمية"
        subtitle="محاور تعليمية متكاملة تجمع الدورات ذات الصلة في مسار واحد نحو هدفك."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'المحاور' },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {tracks.map((track, index) => {
            const Icon = track.icon
            return (
              <motion.article
                key={track.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className={`rounded-2xl border bg-white p-6 text-right shadow-lg shadow-slate-200/60 ring-1 ring-slate-100 ${track.border} sm:p-8 lg:grid lg:grid-cols-[1fr_auto] lg:gap-8 lg:items-center`}
              >
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <span className={`grid h-12 w-12 place-items-center rounded-xl ${track.bg}`}>
                      <Icon size={24} className={track.color} />
                    </span>
                    <span className="text-3xl font-black text-slate-100">{track.number}</span>
                  </div>
                  <h3 className="text-2xl font-black text-deepBlue">{track.title}</h3>
                  <p className="mt-3 leading-8 text-slate-600">{track.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {track.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  to="/courses"
                  className={`mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white lg:mt-0 ${track.bg.replace('bg-', 'bg-').replace('-50', '-500')} hover:opacity-90 transition`}
                  style={{ backgroundColor: track.color.includes('customBlue') ? '#2691C2' : track.color.includes('customOrange') ? '#ec943c' : undefined }}
                >
                  استكشف الدورات
                  <ArrowLeft size={16} />
                </Link>
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
            <h2 className="text-3xl font-black sm:text-4xl">جاهز لاختيار محورك؟</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              تصفح دوراتنا وابدأ بالمحور الذي يناسب مرحلتك الحالية.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
            >
              تصفح الدورات
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Briefcase, Brain, CircuitBoard, LineChart } from 'lucide-react'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const tracks = [
  {
    num: '01',
    title: 'مهندس ذكاء اصطناعي',
    sub: 'AI Engineer',
    desc: 'من الصفر إلى MLOps — هندسة نماذج حقيقية، بيئات إنتاج، وتسليم منتج ذكاء اصطناعي قابل للنشر.',
    pills: ['PyTorch & TensorFlow', 'MLOps & Deployment', 'Prompt Engineering', 'LLM Applications'],
    icon: Brain,
    accentBg: 'bg-customBlue',
    featured: true,
    href: '/courses',
  },
  {
    num: '02',
    title: 'عالم بيانات',
    sub: 'Data Scientist',
    desc: 'نمذجة، تعلّم آلة، وتحليل متقدم يعكس بيئة الفرق المنتجة في القطاعات الحقيقية.',
    pills: ['Python & R', 'ML Algorithms', 'Data Pipelines', 'Model Validation'],
    icon: CircuitBoard,
    accentBg: 'bg-customOrange',
    featured: false,
    href: '/courses',
  },
  {
    num: '03',
    title: 'محلّل بيانات',
    sub: 'Data Analyst',
    desc: 'لوحات KPI، قراءة تحليلية، وإنتاج تقارير تُعرض على الإدارة وتُغيّر القرار.',
    pills: ['SQL & BI Tools', 'Dashboarding', 'Statistics', 'Data Storytelling'],
    icon: LineChart,
    accentBg: 'bg-deepBlue',
    featured: false,
    href: '/courses',
  },
  {
    num: '04',
    title: 'أعمال الذكاء الاصطناعي',
    sub: 'AI Business',
    desc: 'حوكمة، أخلاقيات، نماذج أعمال ذكاء اصطناعي، ودمجه داخل المؤسسات.',
    pills: ['AI Strategy', 'Governance & Ethics', 'Change Management', 'ROI Measurement'],
    icon: Briefcase,
    accentBg: 'bg-customBlue',
    featured: false,
    href: '/courses',
  },
  {
    num: '05',
    title: 'التميز الأكاديمي',
    sub: 'Academic Excellence',
    desc: 'تصميم تعليمي متعمّق، تأهيل أكاديمي، وقياس تأثر المتعلّم وفق معايير جودة دولية.',
    pills: ['Instructional Design', 'Quality Standards', 'Research Methods', 'Academic Writing'],
    icon: BadgeCheck,
    accentBg: 'bg-customOrange',
    featured: false,
    href: '/courses',
  },
] as const

// Static col-span classes for the 3-col grid:
// Row 1: AI (2) + DataSci (1) = 3
// Row 2: DataAnalyst (1) + AIBusiness (1) + Academic (1) = 3
const colSpan = ['lg:col-span-2', 'lg:col-span-1', 'lg:col-span-1', 'lg:col-span-1', 'lg:col-span-1'] as const

export default function HomeLearningTracks() {
  return (
    <section id="tracks" dir="rtl" className="scroll-mt-28 bg-white px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1540px]">
        {/* Header */}
        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl space-y-4">
            <span className="emc-eyebrow">مسارات التعلّم</span>
            <h2 className="emc-title-arc font-display text-3xl font-black leading-tight tracking-tight text-deepBlue sm:text-4xl xl:text-[2.8rem]">
              خمسة مسارات تُحوّل<br className="hidden sm:block" /> الطموح إلى مهارة قابلة للسوق
            </h2>
            <p className="text-base font-semibold leading-8 text-foreground/65">
              كل مسار مبني على منهجية تعليمية واضحة — محتوى، تمارين، تقييم، وورش تطبيقية مع مدربين متخصصين.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="shrink-0">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-full border-2 border-deepBlue/10 px-7 py-3.5 text-sm font-black text-deepBlue transition-all hover:border-customBlue/40 hover:text-customBlue"
            >
              عرض جميع المسارات
              <ArrowLeft size={16} aria-hidden />
            </Link>
          </motion.div>
        </div>

        {/* Cards — 3-col on desktop with featured first card spanning 2 cols */}
        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {tracks.map((t, i) => {
            const Icon = t.icon
            return (
              <motion.article
                key={t.num}
                variants={staggerItem}
                className={`group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-deepBlue/[0.07] bg-white shadow-emc-sm ring-1 ring-deepBlue/[0.03] transition-all duration-300 hover:-translate-y-1 hover:shadow-emc-lg ${colSpan[i]}`}
              >
                {/* Colored header band */}
                <div className={`relative overflow-hidden px-6 pb-6 pt-6 ${t.accentBg}`}>
                  <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
                  <div aria-hidden className="pointer-events-none absolute -bottom-6 left-0 h-16 w-16 rounded-full bg-black/[0.08]" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="font-latin text-[10px] font-black tracking-widest text-white/60">{t.sub}</p>
                      <h3 className={`mt-1.5 font-black leading-tight text-white ${t.featured ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
                        {t.title}
                      </h3>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-110">
                      <Icon size={24} aria-hidden />
                    </div>
                  </div>
                  <span aria-hidden className="absolute bottom-3 left-5 font-latin text-[5rem] font-black leading-none text-white/[0.07]">
                    {t.num}
                  </span>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-sm font-semibold leading-7 text-foreground/65">{t.desc}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {t.pills.map((pill) => (
                      <span key={pill} className="rounded-lg border border-deepBlue/[0.08] bg-emcBg px-2.5 py-1 text-[10px] font-black text-foreground/60">
                        {pill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto pt-6">
                    <Link to={t.href} className="group/link inline-flex items-center gap-1.5 text-xs font-black text-customBlue transition-all hover:gap-2.5">
                      استعرض المنهج كاملاً
                      <ArrowLeft size={14} className="transition-transform group-hover/link:-translate-x-1" aria-hidden />
                    </Link>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

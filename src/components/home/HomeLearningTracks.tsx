import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Briefcase, Brain, CircuitBoard, LineChart } from 'lucide-react'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const tracks = [
  {
    title: 'مسار مهندس ذكاء اصطناعي',
    desc: 'مشاريع واقعية، MLOps، هندسة البرومت، وتسليم منتج ذكاء اصطناعي عملي للسوق.',
    href: '/courses',
    accent: 'from-customBlue/[0.12] to-accent-50/70',
    icon: Brain,
  },
  {
    title: 'مسار عالم بيانات',
    desc: 'نمذجة، تعلّم الآلة، ومختبر تحليلي يعكس بيئة الفرق المنتِجة.',
    href: '/courses',
    accent: 'from-brand-50 to-customOrange/[0.08]',
    icon: CircuitBoard,
  },
  {
    title: 'مسار محلّل بيانات',
    desc: 'قراءات لوحية، KPIs احترافية، واختبارات جودة لتقارير تُعرض للإدارات.',
    href: '/courses',
    accent: 'from-brand-50/90 to-deepBlue/[0.06]',
    icon: LineChart,
  },
  {
    title: 'مسار أعمال الذكاء الاصطناعي',
    desc: 'حوكمة، أخلاقيات، نماذج أعمال ذكاء اصطناعي، ودمج المعرفة داخل الشركات.',
    href: '/courses',
    accent: 'from-customOrange/[0.1] to-brand-50/80',
    icon: Briefcase,
  },
  {
    title: 'مسار التميز الأكاديمي',
    desc: 'تصميم تعليمي عميق، تأهيل الأساتذة، وقياس تأثّر المتعلّم وفقّ معايير جودة دولية.',
    href: '/courses',
    accent: 'from-deepBlue/[0.08] to-brand-50',
    icon: BadgeCheck,
  },
] as const

export default function HomeLearningTracks() {
  return (
    <section id="tracks" className="scroll-mt-28 bg-white px-4 py-16 sm:px-6 lg:px-10 lg:py-24" dir="rtl">
      <div className="mx-auto max-w-[1540px]">
        <div className="flex flex-col justify-between gap-6 text-right lg:flex-row lg:items-end">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-black text-customBlue">مجالات التعلّم العميق</p>
            <h2 className="font-display text-3xl font-black leading-tight text-deepBlue sm:text-4xl xl:text-[2.75rem]">
              مسارات تعلّم ثقيلة النتائج للاقتصاد الرقمي
            </h2>
            <p className="text-lg font-semibold leading-9 text-foreground/72">
              نصمّم تجربة متكاملة: محتوى، تمارين، تقييم مستمر، وورش تنفيذ مع مدربين رائدين.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-full border border-deepBlue/[0.1] bg-white px-6 py-3 text-sm font-black text-deepBlue shadow-emc-sm backdrop-blur-sm transition-colors hover:border-customBlue/35"
            >
              عرض كامل المسارات
              <ArrowLeft size={17} aria-hidden />
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-12"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {tracks.map((t, i) => {
            const Icon = t.icon
            const featured = i === 0 || i === 3
            return (
              <motion.article
                key={t.title}
                variants={staggerItem}
                className={`group relative overflow-hidden rounded-[1.6rem] border border-deepBlue/[0.07] bg-white p-8 shadow-emc-sm backdrop-blur-sm transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-emc-md ${
                  featured ? 'xl:col-span-7' : 'xl:col-span-5'
                }`}
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.accent}`}
                />
                <div className="relative flex h-full flex-col text-right">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-emc-xs ring-1 ring-deepBlue/[0.05] transition-transform duration-300 group-hover:rotate-[-3deg] group-hover:scale-105">
                      <Icon size={28} strokeWidth={2} className="text-customBlue" aria-hidden />
                    </span>
                    <Link
                      to={t.href}
                      className="text-[11px] font-black tracking-wide text-customOrange underline-offset-4 transition hover:text-deepBlue"
                    >
                      تفاصيل المسار
                    </Link>
                  </div>
                  <h3 className="text-xl font-black text-deepBlue sm:text-2xl">{t.title}</h3>
                  <p className="mt-4 flex-1 text-[15px] font-semibold leading-relaxed text-foreground/68">
                    {t.desc}
                  </p>
                  <div className="mt-8 flex justify-end border-t border-deepBlue/[0.06] pt-6">
                    <Link to={t.href} className="inline-flex items-center gap-2 text-sm font-black text-deepBlue">
                      اعرف المحتوى والأهداف
                      <ArrowLeft size={17} aria-hidden />
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

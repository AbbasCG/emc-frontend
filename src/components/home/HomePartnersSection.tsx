import { Link } from 'react-router'
import { motion } from 'framer-motion'

const collaborationPaths = [
  {
    title: 'شراكة تعليمية',
    description: 'تصميم دورة أو مسار مشترك يخدم جمهوراً محدداً ومخرجات قابلة للقياس.',
  },
  {
    title: 'تطوير فرق العمل',
    description: 'برامج وورش مخصصة لاحتياج المؤسسة ومستوى فريقها وجدولها.',
  },
  {
    title: 'رعاية مبادرة',
    description: 'دعم فرصة تعليمية أو مجتمعية ضمن نطاق وأهداف ومسؤوليات واضحة.',
  },
] as const

export default function HomePartnersSection() {
  return (
    <section
      dir="rtl"
      className="emc-corner-pages relative overflow-hidden border-y border-deepBlue/[0.06] bg-emcBg px-4 py-20 sm:px-6 lg:px-10 lg:py-24"
    >
      <span aria-hidden className="emc-ghost-num absolute -top-5 left-4 text-[7rem] sm:text-[10rem]">
        04
      </span>

      <div className="relative mx-auto max-w-[1540px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5 }}
          className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"
        >
          <div className="text-right">
            <span className="emc-eyebrow">للجهات والمؤسسات</span>
            <h2 className="emc-title-arc mt-4 max-w-2xl font-display text-2xl font-black tracking-tight text-deepBlue sm:text-3xl">
              ابنِ معنا تجربة تعليمية تخدم هدف مؤسستك
            </h2>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-foreground/65">
              نبدأ من احتياج واضح، نحدد المسؤوليات والمخرجات، ثم نراجع الطلب قبل فتح مساحة العمل المشتركة.
            </p>
          </div>

          <div className="border-y border-deepBlue/10 lg:border-y-0 lg:border-s">
            {collaborationPaths.map((path, index) => (
              <div
                key={path.title}
                className="grid gap-2 border-b border-deepBlue/10 py-5 text-right last:border-b-0 lg:grid-cols-[4rem_1fr] lg:px-8"
              >
                <span className="font-display text-2xl font-black text-customOrange/70" dir="ltr">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-black text-deepBlue">{path.title}</h3>
                  <p className="mt-1 text-sm font-semibold leading-7 text-foreground/60">{path.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-8 lg:justify-start"
        >
          <Link to="/partnerships/apply" className="rounded-xl bg-deepBlue px-6 py-3 text-sm font-black text-white transition hover:bg-customBlue">
            قدّم طلب شراكة
          </Link>
          <Link to="/partnerships" className="emc-cta-line text-sm">
            تعرف إلى آلية التعاون
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

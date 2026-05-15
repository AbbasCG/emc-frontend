import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function HomeGrandCTA() {
  return (
    <section className="relative isolate overflow-hidden bg-white px-4 py-16 sm:px-6 lg:px-10 lg:py-28" dir="rtl">
      <div className="relative mx-auto max-w-[1540px] overflow-hidden rounded-[2rem] border border-deepBlue/[0.08] bg-deepBlue px-6 py-14 text-white shadow-emc-xl sm:px-12 sm:py-16 lg:px-16 lg:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-brand-gradient opacity-[0.22]" />
        <div aria-hidden className="pointer-events-none absolute -right-[20%] top-[-40%] h-[28rem] w-[28rem] rounded-full bg-customOrange/35 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-[15%] bottom-[-50%] h-[24rem] w-[24rem] rounded-full bg-customBlue/30 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,rgba(255,255,255,0.75),transparent_68%)]"
        />

        <div className="relative grid gap-10 text-right lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black tracking-wide backdrop-blur-md"
            >
              <Sparkles size={14} className="text-customOrange" aria-hidden />
              الخطوة التالية
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05, duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
              className="mt-6 font-display text-3xl font-black leading-tight sm:text-4xl lg:text-[2.75rem]"
            >
              جاهزون لرفع مستوى التعلّم داخل مؤسستكم؟
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
              className="mt-5 max-w-xl text-base font-semibold leading-8 text-white/75"
            >
              نربط البرامج بالأشخاص والبيانات: دورات، ورش، شراكات، وتكامل تقني — دون المساس ببنيتكم الحالية.
            </motion.p>
          </div>

          <div className="flex flex-col items-stretch gap-4 lg:items-end">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full lg:max-w-sm">
              <Link
                to="/courses"
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-accent-gradient px-8 py-4 text-center text-base font-extrabold text-white shadow-[0_24px_48px_-12px_rgba(236,148,60,0.55)] transition-all hover:brightness-105"
              >
                <span aria-hidden className="absolute inset-0 bg-emc-shimmer opacity-0 transition-opacity group-hover:animate-shimmer group-hover:opacity-25" />
                ابدأ من صفحة البرامج والدورات
                <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full lg:max-w-sm">
              <Link
                to="/contact"
                className="flex w-full items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-center text-base font-extrabold text-white backdrop-blur-md transition hover:bg-white/16"
              >
                حدّد موعداً مع الفريق
              </Link>
            </motion.div>
            <p className="text-xs font-semibold leading-6 text-white/55">
              جدولة انضمام واضحة باتفاق مستوى خدمة معلَن · دعم فني متابع بالعربية
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Cpu,
  Gauge,
  Layers,
  Sparkles,
  Users,
  Video,
} from 'lucide-react'
import { fadeUp } from '@/utils/animations'

const fadeOrchestra = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 0.61, 0.36, 1] as const },
  },
}

export default function HomeCinematicHero() {
  return (
    <section className="relative isolate overflow-hidden bg-white pt-[4.75rem] lg:pt-[5.25rem]" dir="rtl">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-emc-hero bg-cover" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-[0.35] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.65)_0%,transparent_70%)]"
      />
      <div aria-hidden className="absolute right-[-18%] top-[8%] h-[min(52rem,90vw)] w-[min(52rem,90vw)] rounded-full bg-customBlue/[0.09] blur-3xl animate-soft-float" />
      <div aria-hidden className="absolute left-[-12%] bottom-[5%] h-[min(42rem,85vw)] w-[min(42rem,85vw)] rounded-full bg-customOrange/[0.07] blur-3xl animate-soft-float [animation-delay:1.8s]" />

      <div className="relative mx-auto max-w-[1540px] px-4 pb-12 pt-10 sm:px-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:px-10 lg:pb-20 lg:pt-14">
        <motion.div
          variants={fadeOrchestra}
          initial="hidden"
          animate="visible"
          className="flex flex-col justify-center text-right"
        >
          <motion.div variants={fadeUp} className="mb-6 flex flex-wrap items-center justify-end gap-3">
            <span className="emc-eyebrow inline-flex items-center gap-2 rounded-full border border-customBlue/25 bg-white/90 px-4 py-2 text-[11px] shadow-emc-xs backdrop-blur-md">
              <Cpu size={14} className="text-customBlue" aria-hidden />
              LMS · AI · SaaS
            </span>
            <span className="rounded-full border border-deepBlue/10 bg-white/80 px-4 py-2 text-xs font-black text-foreground/85 backdrop-blur-md">
              المركز التعليمي الرائد EMC
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-display text-[2.35rem] font-black leading-[1.12] tracking-tight text-deepBlue sm:text-5xl lg:text-[3.45rem] xl:text-[3.75rem]"
          >
            منصّة تشغيل تعليمية مؤسّسية توحّد المتعلّم والمدرِّب وقيادة الجودة في تجربة رقمية واحدة على امتداد LMS و&nbsp;AI
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mr-0 mt-7 max-w-xl text-lg font-medium leading-9 text-foreground/75 lg:max-w-none lg:text-xl lg:leading-[2.1rem]"
          >
            منصّة EMC تجمع المحتوى، الجلسات، التقييم، وتقارير الأداء — بهوية عربية واضحة ومزج تقني احترافي مع بنيتكم الحالية،
            دون إعادة اختراع عجلة تشغيلكم.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-end gap-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/courses"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-accent-gradient px-9 py-4 text-base font-extrabold text-white shadow-emc-glow-accent transition-all duration-300 hover:shadow-[0_28px_52px_-14px_rgba(236,148,60,0.52)]"
              >
                <span aria-hidden className="absolute inset-0 bg-emc-shimmer opacity-0 transition-opacity duration-700 group-hover:animate-shimmer group-hover:opacity-40" />
                استكشف المسارات والدورات
                <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-2xl border border-deepBlue/[0.12] bg-white/95 px-8 py-4 text-base font-extrabold text-deepBlue shadow-emc-sm backdrop-blur-md transition-all hover:border-customBlue/35 hover:shadow-emc-md"
              >
                إنشاء حساب
              </Link>
            </motion.div>
            <Link
              to="/contact"
              className="inline-flex items-center px-2 py-4 text-sm font-black text-customBlue underline-offset-8 transition hover:text-deepBlue hover:underline"
            >
              استشارة للمؤسسات
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-12 flex flex-wrap justify-end gap-6 border-t border-deepBlue/[0.06] pt-10">
            {[
              { Icon: Users, label: 'مجتمع متعلم', sub: 'طلاب · مهنيون · شركاء' },
              { Icon: Gauge, label: 'أداء قابل للقياس', sub: 'تحليلات وتقارير' },
              { Icon: Video, label: 'ورش مباشرة', sub: 'جداول ذكية' },
            ].map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 text-right">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-customBlue/10 text-customBlue ring-1 ring-customBlue/15">
                  <Icon size={22} strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-black text-deepBlue">{label}</p>
                  <p className="text-xs font-semibold text-foreground/55">{sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 0.61, 0.36, 1] }}
          style={{ perspective: '1200px' }}
          className="relative mt-14 lg:mt-8"
        >
          <div aria-hidden className="absolute inset-[-8%] rounded-[2rem] bg-gradient-to-bl from-customBlue/[0.12] via-transparent to-customOrange/[0.1] blur-2xl lg:rounded-[2.5rem]" />
          <div className="relative overflow-hidden rounded-[1.85rem] border border-deepBlue/[0.08] bg-white/90 shadow-emc-lg ring-1 ring-white backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-deepBlue/[0.06] bg-emcBg/80 px-5 py-3.5">
              <div className="flex gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-customBlue/80 ring-1 ring-customBlue/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-customOrange/85 ring-1 ring-customOrange/35" />
                <span className="h-2.5 w-2.5 rounded-full bg-deepBlue/45" />
              </div>
              <span className="text-[10px] font-black tracking-wide text-foreground/50">معاينة لوحة التحكم</span>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="sm:col-span-2 grid gap-3 sm:grid-cols-3"
              >
                {[
                  { t: 'تقدّم المتعلّم', v: '88%', c: 'text-customBlue' },
                  { t: 'الجلسات القادمة', v: '6', c: 'text-customOrange' },
                  { t: 'شهادات جاهزة', v: '32', c: 'text-deepBlue' },
                ].map((k) => (
                  <motion.div
                    key={k.t}
                    variants={staggerItem}
                    className="rounded-2xl border border-deepBlue/[0.06] bg-white px-4 py-3 shadow-emc-xs"
                  >
                    <p className="text-[11px] font-bold text-foreground/50">{k.t}</p>
                    <p className={`font-latin mt-1 text-2xl font-black tabular-nums tracking-tight ${k.c}`} dir="ltr">
                      {k.v}
                    </p>
                  </motion.div>
                ))}
              </motion.div>

              <div className="rounded-2xl border border-deepBlue/[0.06] bg-gradient-to-br from-brand-50/80 to-white p-4 sm:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black text-deepBlue">المسارات النشطة</p>
                  <Layers size={18} className="text-customBlue" aria-hidden />
                </div>
                <div className="space-y-2">
                  {['ذكاء اصطناعي تطبيقي', 'تحليلات البيانات', 'تمكين أكاديمي'].map((row) => (
                    <div
                      key={row}
                      className="flex items-center justify-between rounded-xl border border-white/60 bg-white/90 px-3 py-2.5 text-sm font-bold text-deepBlue shadow-sm"
                    >
                      {row}
                      <span className="text-[10px] font-black text-customOrange">مباشر</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-deepBlue/[0.06] bg-deepBlue p-4 text-white sm:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white/60">ورشة جماعية</p>
                    <p className="mt-1 text-sm font-black leading-relaxed">أتمتة سير العمل بالذكاء الاصطناعي</p>
                  </div>
                  <BookOpen className="shrink-0 text-customOrange" size={22} />
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-l from-customOrange to-customBlue"
                    initial={{ width: '12%' }}
                    animate={{ width: '72%' }}
                    transition={{ duration: 1.4, delay: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
                  />
                </div>
              </div>
            </div>
          </div>

          <motion.div
            aria-hidden
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-4 top-1/4 hidden rounded-2xl border border-customBlue/20 bg-white/95 px-4 py-3 shadow-emc-md lg:flex"
          >
            <Sparkles className="text-customOrange" size={22} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

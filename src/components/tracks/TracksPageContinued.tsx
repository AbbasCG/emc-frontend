import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { fadeUp, viewportOnce } from '@/utils/animations'

const stats = [
  { value: '١٢ محوراً', label: 'شبكة تعليمية واحدة ترابطها الواضح' },
  { value: '١ منصّة', label: 'مسارات وبرامج وخدمات ضمن تجربة مؤسسية' },
  { value: 'RTL كامل', label: 'قراءة وواجهة مصمَّمة للغة العربية' },
]

const journey = [
  { title: 'اختر المحور', body: 'حدد نقطة البداية الأنسب لاحتياجك الحالي.' },
  { title: 'تعلّم بأسلوب EMC', body: 'مسارات واضحة تربط المعرفة بالتطبيق.' },
  { title: 'انتقل للبرامج', body: 'سجّل في البرنامج أو تواصل للحلول المؤسسية.' },
]

export default function TracksPageContinued() {
  return (
    <>
      <section className="relative border-t border-deepBlue/[0.06] bg-gradient-to-b from-emcBg via-white to-white px-4 py-14 sm:px-6 lg:px-10 lg:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-emc-radial opacity-[0.35] [mask-image:linear-gradient(180deg,rgba(0,0,0,1),transparent)]"
        />
        <div className="relative mx-auto max-w-[1540px]">
          <motion.div
            className="grid gap-6 rounded-[1.75rem] border border-deepBlue/[0.07] bg-white p-8 shadow-emc-md shadow-deepBlue/[0.05] ring-1 ring-white sm:grid-cols-3 sm:p-10"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {stats.map((s) => (
              <div key={s.label} className="text-right">
                <p className="font-display text-3xl font-black text-customBlue sm:text-4xl">{s.value}</p>
                <p className="mt-2 text-sm font-semibold leading-7 text-deepBlue/72">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-deepBlue/[0.02] px-4 pb-16 pt-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1540px]">
          <SectionHeader
            align="right"
            eyebrow="رحلة التعلم"
            title="ثلاث خطوات بسيطة"
            description="من اختيار المحور إلى البرنامج المناسب — بدون تعقيد."
          />
          <motion.ol
            className="mt-10 grid list-none gap-6 p-0 md:grid-cols-3"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {journey.map((step, i) => (
              <li
                key={step.title}
                className="relative rounded-3xl border border-deepBlue/[0.06] bg-white p-7 text-right shadow-emc-sm shadow-deepBlue/[0.04] ring-1 ring-white"
              >
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-sm font-black text-customOrange ring-1 ring-customOrange/25">
                  {i + 1}
                </span>
                <h3 className="text-lg font-black text-deepBlue">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-7 text-deepBlue/70">{step.body}</p>
              </li>
            ))}
          </motion.ol>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-10">
        <motion.div
          className="relative mx-auto max-w-[1540px] overflow-hidden rounded-[1.85rem] border border-deepBlue/[0.08] bg-deepBlue px-6 py-12 text-white shadow-emc-xl ring-1 ring-white/10 sm:p-14"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_90%_0%,rgba(0,119,182,0.22),transparent_55%),radial-gradient(ellipse_60%_50%_at_10%_100%,rgba(242,140,0,0.14),transparent_50%)]"
          />
          <div className="relative flex flex-col items-stretch gap-10 text-right lg:flex-row-reverse lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-black text-customOrange">الخطوة التالية</p>
              <h2 className="mt-3 font-display text-2xl font-black sm:text-4xl">ابدأ من المحور الذي يناسبك</h2>
              <p className="mt-4 text-base font-semibold leading-8 text-white/78">
                تصفّح البرامج المتاحة أو تواصل معنا لتصميم تجربة مؤسسية ضمن هذه المحاور.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-row-reverse">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.99 }}>
                <Link
                  to="/courses"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-black text-deepBlue shadow-emc-lg transition hover:bg-emcBg"
                >
                  استكشف البرامج
                  <ArrowLeft size={18} aria-hidden />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }}>
                <Link
                  to="/partnerships"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/[0.06] px-7 py-3.5 text-sm font-black text-white backdrop-blur-sm transition hover:bg-white/10"
                >
                  الشراكات
                  <ArrowLeft size={18} aria-hidden />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  )
}

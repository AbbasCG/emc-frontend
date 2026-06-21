import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { fadeUp } from '@/utils/animations'

export default function ImpactVisionCta() {
  return (
    <section className="px-4 pb-24 pt-10 sm:px-6 lg:px-10" dir="rtl">
      <motion.div
        className="relative mx-auto max-w-[1540px] overflow-hidden rounded-[2rem] border border-deepBlue/[0.08] px-8 py-14 text-right text-white shadow-emc-xl ring-1 ring-white/10 sm:px-14 sm:py-16"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.28 }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,#0C2A4B_0%,#1a2a3d_45%,#142131_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_0%_0%,rgba(0, 119, 182,0.35),transparent_52%),radial-gradient(ellipse_60%_50%_at_100%_100%,rgba(242, 140, 0,0.22),transparent_48%)]"
        />
        <div className="relative max-w-3xl">
          <p className="text-xs font-black text-customOrange sm:text-sm">الرؤية المستقبلية</p>
          <h2 className="mt-4 font-display text-3xl font-black sm:text-5xl">نحو أثر أكبر</h2>
          <p className="mt-6 text-[1.05rem] font-semibold leading-[1.9] text-white/82 sm:text-lg">
            نواصل بناء EMC كمنصّة تعليمية ومؤسسية تصنع فرصاً حقيقية وتفتح مسارات جديدة للمستقبل — ببوابات
            واضحة للمتعلّم، ولشركاء يبحثون عن جودة مستدامة.
          </p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="mt-10">
            <Link
              to="/signup"
              className="inline-flex items-center gap-3 rounded-2xl bg-white px-10 py-4 text-sm font-black text-deepBlue shadow-emc-lg transition hover:bg-emcBg"
            >
              انضم إلى EMC
              <ArrowLeft size={20} aria-hidden />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

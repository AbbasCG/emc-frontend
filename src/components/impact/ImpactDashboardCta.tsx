import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { fadeUp } from '@/utils/animations'

export default function ImpactDashboardCta() {
  return (
    <section className="px-6 pb-16 pt-2 lg:px-8 lg:pb-20" dir="rtl">
      <motion.div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-deepBlue/[0.08] px-6 py-10 text-white shadow-lg ring-1 ring-white/10 sm:px-10 sm:py-12"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,#0C2A4B_0%,#1a2f45_52%,#102030_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_88%_60%_at_8%_-20%,rgba(0,119,182,0.38),transparent_50%),radial-gradient(ellipse_55%_50%_at_94%_100%,rgba(242,140,0,0.2),transparent_48%)]"
        />
        <div className="relative max-w-2xl text-right">
          <h2 className="font-display text-3xl font-black leading-tight md:text-4xl">نحو أثر أكبر</h2>
          <p className="mt-4 text-base font-semibold leading-relaxed text-white/82 md:text-lg">
            نوسّع دائرة المتعلّمين والشراكات بتجربة واضحة وذات قياس؛ انضم كطالب أو شريك أو متطوع ضمن المنظومة نفسها.
          </p>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-8">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-3 text-sm font-black text-deepBlue shadow-md transition hover:bg-emcBg"
            >
              انضم إلى EMC
              <ArrowLeft size={18} aria-hidden />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

import { memo, useRef } from 'react'
import { Link } from 'react-router'
import { motion, useInView } from 'framer-motion'
import { Calendar } from 'lucide-react'

const trustIndicators = [
  { value: '١٥ دقيقة', label: 'جلسة موجزة عند التوفر' },
  { value: 'وضوح', label: 'خطة تالية مناسبة لمرحلتك' },
  { value: 'مهنية', label: 'بدون وعود مبالغ فيها' },
]

/** Design Language 2.0 — closing band as typography over the dawn field (the scene's one
 *  signature). No boxed panel, no decorative orbs: headline, one money action, one line CTA,
 *  and a hairline-seated trust row. */
function CoursesCTA() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="emc-dawn relative overflow-hidden px-4 py-24">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Eyebrow — plain text between two fading dashes */}
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber">
            <span aria-hidden className="h-px w-8 bg-amber/50" />
            EMC — التعليم الذكي
            <span aria-hidden className="h-px w-8 bg-amber/50" />
          </p>

          <h2 className="mb-5 font-display text-3xl font-black leading-[1.1] tracking-tight text-white md:text-5xl">
            لست متأكداً من أين تبدأ؟
          </h2>

          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-ice/80">
            احجز استشارة مجانية لمدة 15 دقيقة، ونرسم معك المسار المناسب لأهدافك ومستواك الحالي.
          </p>

          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8">
            <Link
              to="/contact"
              className="flex items-center gap-2.5 rounded-xl bg-customBlue px-8 py-4 font-bold text-white transition-colors duration-200 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <Calendar className="h-5 w-5" aria-hidden />
              احجز استشارتك المجانية
            </Link>

            <Link
              to="/learning-paths"
              className="emc-cta-line text-sm text-ice/80 transition-colors duration-200 hover:text-white focus-visible:outline-none"
            >
              عرض جميع المسارات
            </Link>
          </div>

          {/* Trust row — typographic, seated on a single hairline */}
          <div className="mt-14 flex flex-wrap items-start justify-center border-t border-white/10 pt-8">
            {trustIndicators.map((item) => (
              <div
                key={item.label}
                className="border-s border-white/10 px-6 text-center first:border-s-0 sm:px-10"
              >
                <p className="emc-stat-num font-display text-xl text-amber md:text-2xl">{item.value}</p>
                <p className="mt-1.5 text-xs text-white/60">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default memo(CoursesCTA)

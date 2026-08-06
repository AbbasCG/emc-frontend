import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Calendar, ArrowLeft } from 'lucide-react'

export default function CoursesCTA() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="relative bg-deepBlue overflow-hidden py-24 px-4">
      {/* Animated geometric orbs */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-customBlue rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-customOrange rounded-full blur-3xl translate-y-1/2"
      />

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cta-dots" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-dots)" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Eyebrow */}
          <span className="inline-flex items-center gap-2 text-customOrange text-sm font-bold mb-4 tracking-wide uppercase">
            <span className="w-8 h-px bg-customOrange/60" />
            EMC — التعليم الذكي
            <span className="w-8 h-px bg-customOrange/60" />
          </span>

          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-5">
            مش عارف من أين تبدأ؟
          </h2>

          <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-xl mx-auto">
            احجز استشارة مجانية لمدة 15 دقيقة ونساعدك نرسم المسار الصح
            وفقاً لأهدافك ومستواك الحالي.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 bg-customBlue text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-customBlue/30 hover:bg-customBlue/90 transition-all duration-200"
            >
              <Calendar className="w-5 h-5" />
              احجز استشارتك المجانية
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 text-white border-2 border-white/20 hover:border-white/50 font-bold px-8 py-4 rounded-xl transition-all duration-200"
            >
              عرض جميع المسارات
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
            {[
              { value: '١٥ دقيقة', label: 'جلسة موجزة عند التوفر' },
              { value: 'وضوح', label: 'خطة تالية مناسبة لمرحلتك' },
              { value: 'مهنية', label: 'بدون وعود مبالغ فيها' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-xl font-black text-customOrange">{item.value}</p>
                <p className="text-xs text-white/50 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

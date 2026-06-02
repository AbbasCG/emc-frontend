import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

// Floating particles
function Particle({ x, y, size, delay, opacity }: { x: string; y: string; size: number; delay: number; opacity: number }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute rounded-full bg-white"
      style={{ left: x, top: y, width: size, height: size, opacity }}
      animate={{ y: [0, -20, 0], opacity: [opacity, opacity * 2.5, opacity] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

const particles = [
  { x: '8%', y: '20%', size: 3, delay: 0, opacity: 0.15 },
  { x: '15%', y: '60%', size: 2, delay: 1, opacity: 0.12 },
  { x: '25%', y: '80%', size: 4, delay: 0.5, opacity: 0.08 },
  { x: '55%', y: '15%', size: 3, delay: 1.5, opacity: 0.12 },
  { x: '75%', y: '35%', size: 2, delay: 0.8, opacity: 0.1 },
  { x: '85%', y: '70%', size: 4, delay: 2, opacity: 0.1 },
  { x: '92%', y: '25%', size: 2, delay: 0.3, opacity: 0.15 },
] as const

export default function HomeGrandCTA() {
  return (
    <section dir="rtl" className="relative isolate overflow-hidden px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      {/* Main gradient card */}
      <div
        className="relative mx-auto max-w-[1540px] overflow-hidden rounded-[2rem] px-8 py-16 text-white sm:px-14 sm:py-20 lg:px-20 lg:py-24"
        style={{
          background: 'linear-gradient(135deg, #22334A 0%, #1a4f78 40%, #2691C2 75%, #1e6a9a 100%)',
        }}
      >
        {/* Grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '36px 36px',
            maskImage: 'radial-gradient(ellipse at center, white 40%, transparent 75%)',
          }}
        />

        {/* Orange accent glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-customOrange/25 blur-[80px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-customBlue/35 blur-[80px]"
        />

        {/* Floating particles */}
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}

        {/* Content */}
        <div className="relative grid gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div className="text-right">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="text-xs font-black tracking-widest text-white/50 uppercase"
            >
              ابدأ رحلتك
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 0.61, 0.36, 1] }}
              className="mt-5 font-display text-[2.4rem] font-black leading-tight sm:text-5xl lg:text-[3.2rem]"
            >
              جاهز لتحويل{' '}
              <span className="text-customOrange">طموحك</span>
              <br />
              إلى مسيرة حقيقية؟
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-6 max-w-lg text-lg font-medium leading-9 text-white/60"
            >
              انضم لأكثر من 850 متعلّم يبنون مهاراتهم يومياً على منصة EMC — ورشتك الأولى تبدأ اليوم.
            </motion.p>
          </div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="flex flex-col gap-4"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/courses"
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-customOrange px-8 py-[18px] text-center text-base font-extrabold text-white shadow-[0_20px_50px_-12px_rgba(236,148,60,0.6)] transition-all hover:brightness-105"
              >
                <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/15 to-white/0 opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
                استعرض البرامج والدورات
                <ArrowLeft size={19} className="transition-transform group-hover:-translate-x-1" aria-hidden />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/contact"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-base font-extrabold text-white backdrop-blur-md transition hover:border-white/35 hover:bg-white/18"
              >
                تحدّث مع الفريق
              </Link>
            </motion.div>
            <p className="text-center text-xs font-semibold text-white/35">
              انضمام مجاني · دعم عربي · بدء فوري
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

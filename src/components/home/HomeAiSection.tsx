import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Bot, BrainCircuit, Sparkles, Zap } from 'lucide-react'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const capabilities = [
  {
    icon: BrainCircuit,
    title: 'مسارات ذكاء اصطناعي تطبيقي',
    desc: 'لا نكتفي بشرح النظرية — نبني مشاريع حقيقية: نماذج لغوية، رؤية حاسوبية، وأنظمة توصية تعمل في بيئة إنتاجية.',
    color: '#0077B6',
  },
  {
    icon: Bot,
    title: 'مساعد تعلّم ذكي',
    desc: 'منصة EMC تدمج الذكاء الاصطناعي في تجربة التعلّم — تلخيص المحتوى، إجابة الأسئلة، وتوصيات مخصصة لكل متعلّم.',
    color: '#F28C00',
  },
  {
    icon: Zap,
    title: 'أتمتة وسير عمل ذكي',
    desc: 'نعلّمك أتمتة المهام، بناء الوكلاء الذكيين، وتضمين الذكاء الاصطناعي في أعمالك دون الحاجة إلى خبرة برمجية عميقة.',
    color: '#0077B6',
  },
] as const

function PulsingOrb({ color, size, x, y, delay }: { color: string; size: number; x: string; y: string; delay: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      aria-hidden
      animate={reduce ? {} : {
        scale: [1, 1.3, 1],
        opacity: [0.15, 0.35, 0.15],
      }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      className="pointer-events-none absolute rounded-full blur-3xl"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        backgroundColor: color,
        transform: 'translate(-50%, -50%)',
      }}
    />
  )
}

export default function HomeAiSection() {
  return (
    <section
      dir="rtl"
      className="relative overflow-hidden bg-[#060e1a] px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
    >
      {/* Ambient orbs */}
      <PulsingOrb color="#0077B6" size={500} x="70%" y="30%" delay={0} />
      <PulsingOrb color="#F28C00" size={350} x="15%" y="70%" delay={1.5} />

      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 119, 182,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 119, 182,0.6) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative mx-auto max-w-[1540px]">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-14 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"
        >
          <div className="text-right">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-customBlue/25 bg-customBlue/10 px-4 py-2 backdrop-blur-sm">
              <Sparkles size={13} className="text-customBlue" aria-hidden />
              <span className="text-xs font-black text-customBlue">الذكاء الاصطناعي في EMC</span>
            </div>
            <h2 className="font-display text-3xl font-black leading-tight text-white sm:text-4xl xl:text-[2.8rem]">
              نُدمج الذكاء الاصطناعي في{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #0077B6, #F28C00)' }}
              >
                قلب مسيرتك التعليمية
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-white/50">
              لسنا منصة تشرح الذكاء الاصطناعي من بُعد — نحن بيئة تعلّم تجعلك تبنيه وتطبّقه وتُدمجه في عملك اليومي.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/courses"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-customBlue/30 bg-customBlue/10 px-7 py-3.5 text-sm font-black text-customBlue backdrop-blur-md transition-all hover:border-customBlue/60 hover:bg-customBlue/20"
            >
              استكشف برامج AI
              <ArrowLeft size={16} aria-hidden />
            </Link>
          </motion.div>
        </motion.div>

        {/* Capability cards */}
        <motion.div
          className="grid gap-5 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {capabilities.map((cap) => {
            const Icon = cap.icon
            return (
              <motion.div
                key={cap.title}
                variants={staggerItem}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-right backdrop-blur-sm transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.06]"
              >
                {/* Gradient glow on hover */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 rounded-2xl"
                  style={{
                    background: `radial-gradient(ellipse at top right, ${cap.color}15, transparent 60%)`,
                  }}
                />

                {/* Icon */}
                <div
                  className="relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-4deg]"
                  style={{ backgroundColor: `${cap.color}20` }}
                >
                  <Icon size={26} style={{ color: cap.color }} aria-hidden />
                </div>

                <h3 className="relative text-xl font-black leading-tight text-white">{cap.title}</h3>
                <p className="relative mt-4 text-sm font-semibold leading-7 text-white/50">{cap.desc}</p>

                {/* Bottom gradient line */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[2px] origin-right scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                  style={{ background: `linear-gradient(to left, ${cap.color}80, transparent)` }}
                />
              </motion.div>
            )
          })}
        </motion.div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-7 py-5 backdrop-blur-sm"
        >
          <p className="text-right text-base font-black text-white/70">
            ابدأ مسارك في الذكاء الاصطناعي مع مجتمع EMC
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-6 py-3 text-sm font-black text-white shadow-[0_8px_24px_rgba(0, 119, 182,0.35)] transition-all hover:bg-[#1e7dab]"
          >
            انضم الآن
            <ArrowLeft size={15} aria-hidden />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

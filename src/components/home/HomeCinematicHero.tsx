import { Link } from 'react-router'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  GraduationCap,
  Globe,
  Languages,
  Bot,
  Briefcase,
  Crown,
  Sparkles,
  Heart,
  TrendingUp,
  FlaskConical,
  Smile,
  Handshake,
  ArrowLeft,
} from 'lucide-react'

// ── 12 EMC Core Themes Orbit (Matching Image 1) ─────────────────────────────

const EMC_12_THEMES = [
  { id: 'academic', num: '01', title: 'المسارات الأكاديمية', desc: 'إرشاد أكاديمي منظم من المدرسة إلى الجامعة وما بعدها.', icon: GraduationCap, color: '#0077B6', link: '/tracks#academic' },
  { id: 'global', num: '02', title: 'التعلّم العالمي', desc: 'برامج وفرص تعلّم دولية عابرة للحدود لتوسيع الآفاق.', icon: Globe, color: '#F28C00', link: '/tracks#global' },
  { id: 'language', num: '03', title: 'معهد اللغات', desc: 'تعزيز المهارات اللغوية والتواصلية المتعددة.', icon: Languages, color: '#0077B6', link: '/tracks#language' },
  { id: 'ai', num: '04', title: 'الذكاء الاصطناعي والتمكين الرقمي', desc: 'بناء قدرات الذكاء الاصطناعي والتكنولوجيا الحديثة.', icon: Bot, color: '#FFA733', link: '/tracks#ai' },
  { id: 'career', num: '05', title: 'المهارات والتطوير المهني', desc: 'إعداد الكوادر لسوق العمل وصقل المهارات.', icon: Briefcase, color: '#0E5A8A', link: '/tracks#career' },
  { id: 'leadership', num: '06', title: 'القيادة (روّاد)', desc: 'تمكين قادة وروّاد المستقبل بالمهارات القيادية.', icon: Crown, color: '#B3401E', link: '/tracks#leadership' },
  { id: 'awareness', num: '07', title: 'الوعي والمعرفة', desc: 'إثراء الفكر ونشر المعرفة التخصصية الشاملة.', icon: Sparkles, color: '#0077B6', link: '/tracks#awareness' },
  { id: 'wellbeing', num: '08', title: 'الرفاه والصحة', desc: 'تعزيز التوازن النفسي والرفاه المتكامل.', icon: Heart, color: '#F28C00', link: '/tracks#wellbeing' },
  { id: 'finance', num: '09', title: 'الوعي المالي', desc: 'ثقافة الإدارة المالية الشخصية والاستثمار الواعي.', icon: TrendingUp, color: '#0E5A8A', link: '/tracks#finance' },
  { id: 'experiential', num: '10', title: 'التعلّم التجريبي التطبيقي', desc: 'تطبيقات عمليّة وورش تفاعلية ومشاريع ميدانية.', icon: FlaskConical, color: '#F28C00', link: '/tracks#experiential' },
  { id: 'children', num: '11', title: 'الأطفال (عقول المستقبل)', desc: 'برامج مبتكرة لتنمية شغف التفكير لدى الناشئة.', icon: Smile, color: '#0C2A4B', link: '/tracks#children' },
  { id: 'partnerships', num: '12', title: 'الشراكات والتحالفات', desc: 'تعاون مؤسسي وأكاديمي دولي ذو أثر.', icon: Handshake, color: '#FFA733', link: '/tracks#partnerships' },
] as const

function OrbitalVisual() {
  const shouldReduce = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)

  // Auto-rotate selected node every 4 seconds (paused for reduced motion)
  useEffect(() => {
    if (shouldReduce) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % EMC_12_THEMES.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [shouldReduce])

  const activeItem = EMC_12_THEMES[activeIndex]
  const R = 195 // orbit radius in pixels

  return (
    <div className="relative flex flex-col items-center">
      {/* 12-Theme Orbital Canvas Container */}
      <div className="relative flex h-[480px] w-[480px] items-center justify-center sm:h-[530px] sm:w-[530px]">
        {/* Top Orbit Header Label */}
        <div className="absolute top-2 inset-x-0 z-20 flex items-center justify-between px-6 text-[10px] uppercase tracking-widest text-white/60">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-customOrange animate-pulse" />
            <span className="font-black text-white/90">منظومة EMC</span>
          </div>
          <span className="font-latin font-bold text-white/80">{activeItem.num} / 12</span>
        </div>

        {/* Orbit Background Circles */}
        <div aria-hidden className="absolute inset-8 rounded-full border border-white/10" />
        <div aria-hidden className="absolute inset-16 rounded-full border border-white/[0.06] stroke-dash-2" />

        {/* Rotating ambient glow ring */}
        <motion.div
          aria-hidden
          animate={shouldReduce ? {} : { rotate: 360 }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-12"
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 75%, rgba(0,119,182,0.3) 90%, transparent 100%)',
            }}
          />
        </motion.div>

        {/* Center EMC Sphere */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex h-32 w-32 flex-col items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-[#0C2A4B] via-[#0077B6] to-[#0E5A8A] p-3 text-center shadow-[0_0_50px_rgba(0,119,182,0.45)] backdrop-blur-md"
        >
          <img src="/brand/logos/logo_icon_white.png" alt="EMC" className="h-9 w-auto drop-shadow-md" />
          <span className="mt-1 text-[9px] font-black text-white/90">اثنا عشر محوراً</span>
        </motion.div>

        {/* SVG Connecting Ray Line to Active Node */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none z-0" viewBox="0 0 530 530">
          {(() => {
            const angleDeg = activeIndex * (360 / 12) - 90
            const rad = (angleDeg * Math.PI) / 180
            const cx = 265 + Math.cos(rad) * R
            const cy = 265 + Math.sin(rad) * R
            return (
              <motion.line
                x1={265}
                y1={265}
                x2={cx}
                y2={cy}
                stroke={activeItem.color}
                strokeWidth={2}
                strokeDasharray="4 4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 0.3 }}
              />
            )
          })()}
        </svg>

        {/* 12 Orbital Radial Node Buttons */}
        {EMC_12_THEMES.map((item, i) => {
          const angleDeg = i * (360 / 12) - 90
          const rad = (angleDeg * Math.PI) / 180
          const cx = Math.cos(rad) * R
          const cy = Math.sin(rad) * R
          const isActive = i === activeIndex
          const Icon = item.icon

          return (
            <div
              key={item.id}
              style={{ left: `calc(50% + ${cx}px)`, top: `calc(50% + ${cy}px)` }}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            >
              <button
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`group relative flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'h-13 w-13 rounded-full bg-[#0C2A4B] shadow-[0_0_25px_rgba(0,119,182,0.6)] ring-2 ring-white scale-110'
                    : 'h-10 w-10 rounded-full bg-white shadow-md hover:scale-110'
                }`}
                aria-label={item.title}
              >
                <Icon
                  size={isActive ? 22 : 18}
                  style={{ color: isActive ? '#ffffff' : item.color }}
                  className="transition-transform group-hover:scale-110"
                />

                {/* Active Pill Badge Number */}
                {isActive && (
                  <motion.span
                    initial={{ scale: 0, y: 5 }}
                    animate={{ scale: 1, y: 0 }}
                    className="absolute -bottom-2 font-latin text-[9px] font-black rounded-full bg-white px-1.5 py-0.5 text-deepBlue shadow-md ring-1 ring-slate-200"
                  >
                    {item.num}
                  </motion.span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Active Theme Showcase Glass Card (Bottom of Orbit) */}
      <div className="relative mt-2 w-full max-w-lg overflow-hidden rounded-2xl border border-white/20 bg-white/[0.1] p-5 shadow-2xl backdrop-blur-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-4 text-right"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
                style={{ backgroundColor: activeItem.color }}
              >
                <activeItem.icon size={22} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: activeItem.color }}>
                  المحور {activeItem.num} / 12
                </span>
                <h3 className="text-base font-black text-white">{activeItem.title}</h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-white/70">{activeItem.desc}</p>
              </div>
            </div>

            <Link
              to={activeItem.link}
              className="shrink-0 rounded-full bg-customOrange px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-customOrange/90"
            >
              استكشف ←
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* 12 Switcher Indicator Bar */}
        <div className="mt-4 flex items-center justify-center gap-1">
          {EMC_12_THEMES.map((theme, idx) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIndex ? 'w-6 bg-customBlue' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={theme.title}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Animated dot grid ─────────────────────────────────────────────────────────

function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0
    function draw() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const spacing = 36
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          const wave = Math.sin(t * 0.8 + x * 0.015 + y * 0.015)
          const alpha = (wave + 1) / 2 * 0.2 + 0.03
          ctx.beginPath()
          ctx.arc(x, y, 1.2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0,119,182, ${alpha})`
          ctx.fill()
        }
      }
      t += 0.018
      frameRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
    />
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-md">
      <span className="font-latin text-2xl font-black tabular-nums text-white" dir="ltr">{value}</span>
      <span className="text-xs font-bold leading-4 text-white/55">{label}</span>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

export default function HomeCinematicHero() {
  const { t } = useTranslation()
  return (
    <section
      dir="rtl"
      className="relative isolate min-h-[100svh] overflow-hidden bg-deepBlue pt-[4.75rem] lg:pt-[5.25rem]"
    >
      {/* Canvas dot grid */}
      <DotGrid />

      {/* Ambient glow orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[-5%] h-[42rem] w-[42rem] rounded-full bg-customBlue/[0.18] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-10%] left-[-5%] h-[32rem] w-[32rem] rounded-full bg-customOrange/[0.1] blur-[100px]"
      />
      {/* Gradient fade to bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-deepBlue to-transparent"
      />

      <div className="relative mx-auto grid max-w-[1540px] items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:min-h-[calc(100svh-5.25rem)] lg:grid-cols-[1fr_auto] lg:gap-8 lg:px-10 lg:pb-20">
        {/* ── Text column ── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="flex flex-col text-right"
        >
          {/* Eyebrow badge */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
            className="mb-8 flex justify-start"
          >
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.08] px-5 py-2.5 text-xs font-black tracking-wide text-white/80 backdrop-blur-md">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-customOrange" aria-hidden />
              {t('home.hero.badge')}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] } } }}
            className="font-display text-[2.6rem] font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.8rem] xl:text-[4.2rem]"
          >
            {t('home.hero.titleLine1')}
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #A6D6F2 45%, #089FE0 100%)' }}
            >
              {t('home.hero.titleLine2')}
            </span>
            <br />
            {t('home.hero.titleLine3')}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] } } }}
            className="mt-7 max-w-lg text-lg font-medium leading-9 text-white/60 lg:text-xl"
          >
            {t('home.hero.subtitle')}
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
            className="mt-10 flex flex-wrap justify-start gap-3"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/courses"
                className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-2xl bg-customBlue px-8 py-4 text-base font-extrabold text-white shadow-[0_16px_40px_-12px_rgba(0,119,182,0.6)] transition-all duration-300 hover:bg-brand-600 hover:shadow-[0_24px_50px_-14px_rgba(0,119,182,0.7)]"
              >
                <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/10 to-white/0 opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
                {t('home.hero.ctaPrimary')}
                <ArrowLeft size={19} className="transition-transform group-hover:-translate-x-1" aria-hidden />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-7 py-4 text-base font-extrabold text-white backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/[0.14]"
              >
                {t('home.hero.ctaSecondary')}
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.1 } } }}
            className="mt-12 flex flex-wrap justify-start gap-3 border-t border-white/[0.08] pt-10"
          >
            {/* e2e-pinned: ar values are verbatim; numbers stay Latin digits inside the dir=ltr span */}
            <StatPill value={t('home.hero.stats.beneficiaries.value')} label={t('home.hero.stats.beneficiaries.label')} />
            <StatPill value={t('home.hero.stats.campRegistrants.value')} label={t('home.hero.stats.campRegistrants.label')} />
            <StatPill value={t('home.hero.stats.countries.value')} label={t('home.hero.stats.countries.label')} />
          </motion.div>
        </motion.div>

        {/* ── Orbital visual column ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1], delay: 0.2 }}
          className="hidden justify-center lg:flex"
        >
          <OrbitalVisual />
        </motion.div>
      </div>

      {/* Bottom edge gradient */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-customBlue/30 to-transparent"
      />
    </section>
  )
}

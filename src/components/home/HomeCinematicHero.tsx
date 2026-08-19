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
  Award,
  ChevronDown,
} from 'lucide-react'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'

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
          className="relative z-10 flex h-32 w-32 flex-col items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-navy via-customBlue to-ocean p-3 text-center backdrop-blur-md"
        >
          <img src="/brand/logos/logo_icon_white.png" alt="EMC" className="h-9 w-auto" />
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
                    ? 'h-[3.25rem] w-[3.25rem] rounded-full bg-navy ring-2 ring-white scale-110'
                    : 'h-10 w-10 rounded-full bg-white ring-1 ring-line hover:scale-110'
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
                    className="absolute -bottom-2 font-latin text-[9px] font-black rounded-full bg-white px-1.5 py-0.5 text-deepBlue ring-1 ring-line"
                  >
                    {item.num}
                  </motion.span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Active theme readout the glass card lost its frame: the content now sits
          on a single hairline seat under the orbit. The switcher bar and the
          «استكشف» action below it stay boxed, since both are functional controls. */}
      <div className="relative mt-6 w-full max-w-lg border-t border-white/15 pt-5">
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: activeItem.color }}
              >
                <activeItem.icon size={22} />
              </div>
              <div>
                {/* Sky, not the per-theme hex: with the glass fill removed this label
                    sits straight on the navy field, where the darker theme colours
                    (navy, ocean, ember) would have gone invisible. The tile below
                    still carries the theme's colour. */}
                <span className="text-[10px] font-black uppercase tracking-wider text-sky">
                  المحور {activeItem.num} / 12
                </span>
                <h3 className="text-base font-black text-white">{activeItem.title}</h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-white/70">{activeItem.desc}</p>
              </div>
            </div>

            <Link
              to={activeItem.link}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-customOrange px-4 py-2 text-xs font-black text-white transition hover:bg-customOrange/90"
            >
              استكشف
              <ArrowLeftIcon size={13} />
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

// ── Hero stat ─────────────────────────────────────────────────────────────────

// Design Language 2.0 — the three glass KPI pills (rounded-2xl + border-white/10
// + bg-white/[0.06] + backdrop blur) became one typographic line-up: serif
// numbers on the field, separated by 1px hairlines. `text-white` overrides
// emc-stat-num's light-surface navy, exactly as HomeImpactMetrics does.
// The value stays a single text node — «+20,000» is e2e-pinned.
function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-right">
      <span
        className="emc-stat-num block font-display text-[2rem] text-white sm:text-4xl"
        dir="ltr"
      >
        {value}
      </span>
      <span className="mt-2 block text-xs font-bold leading-5 text-white/55">{label}</span>
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
      {/* V3 signature (the scene's one brand mark): tricolor hairline pinned to the top edge */}
      <div aria-hidden className="emc-tricolor-on-dark absolute inset-x-0 top-0 z-10" />

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
            className="font-display text-[2.5rem] font-black leading-[1.1] tracking-tight text-white [text-wrap:balance] sm:text-[3rem] lg:text-[3.4rem] xl:text-[3.8rem]"
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
                className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-2xl bg-customBlue px-8 py-4 text-base font-extrabold text-white transition-all duration-300 hover:bg-brand-600"
              >
                <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/10 to-white/0 opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
                {t('home.hero.ctaPrimary')}
                <ArrowLeftIcon size={19} className="transition-transform group-hover:-translate-x-1" />
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
            {/* Third CTA glass chip anchor to the learning-tracks section (founder ask) */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
              <a
                href="#learning-tracks"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById('learning-tracks')?.scrollIntoView({
                    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                  })
                }}
                className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-[15px] font-extrabold text-white backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/70 focus-visible:ring-offset-2 focus-visible:ring-offset-deepBlue sm:w-auto"
              >
                <Award size={17} className="text-amber-300" aria-hidden />
                مسارات التعلّم والشهادات المعتمدة
                <ChevronDown
                  size={15}
                  className="text-white/60 transition-transform duration-300 group-hover:translate-y-0.5"
                  aria-hidden
                />
              </a>
            </motion.div>
          </motion.div>

          {/* Stats row typographic line-up seated on hairlines, no pills */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.1 } } }}
            className="mt-12 flex flex-wrap items-stretch justify-start gap-x-7 gap-y-8 border-t border-white/[0.08] pt-10"
          >
            {/* e2e-pinned: ar values are verbatim; numbers stay Latin digits inside the dir=ltr span */}
            <HeroStat value={t('home.hero.stats.beneficiaries.value')} label={t('home.hero.stats.beneficiaries.label')} />
            <div aria-hidden className="hidden w-px self-stretch bg-white/15 sm:block" />
            <HeroStat value={t('home.hero.stats.campRegistrants.value')} label={t('home.hero.stats.campRegistrants.label')} />
            <div aria-hidden className="hidden w-px self-stretch bg-white/15 sm:block" />
            <HeroStat value={t('home.hero.stats.countries.value')} label={t('home.hero.stats.countries.label')} />
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

      {/* Scroll cue existing soft-float keyframes; global reduced-motion CSS stills it */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-5 z-10 hidden justify-center lg:flex">
        {/* De-glassed: the scroll cue is the chevron itself, not a bordered chip */}
        <span className="animate-soft-float flex h-9 w-9 items-center justify-center text-white/45">
          <ChevronDown size={22} />
        </span>
      </div>

      {/* Bottom edge gradient */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-customBlue/30 to-transparent"
      />
    </section>
  )
}

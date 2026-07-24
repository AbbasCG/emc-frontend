import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

// ── Orbital ecosystem visual ──────────────────────────────────────────────────

/** M3 i18n: labels live in the catalogs under home.hero.orbit.<key>. */
const ORBIT_ITEM_DEFS = [
  { key: 'workshops', angle: 0, r: 120, color: '#0077B6', size: 42 },
  { key: 'courses', angle: 72, r: 140, color: '#F28C00', size: 46 },
  { key: 'paths', angle: 144, r: 128, color: '#0C2A4B', size: 44 },
  { key: 'ai', angle: 216, r: 138, color: '#0077B6', size: 50 },
  { key: 'community', angle: 288, r: 118, color: '#F28C00', size: 40 },
] as const

function OrbitalVisual() {
  const { t } = useTranslation()
  const shouldReduce = useReducedMotion()
  const orbitItems = useMemo(
    () => ORBIT_ITEM_DEFS.map((def) => ({ ...def, label: t(`home.hero.orbit.${def.key}`) })),
    [t],
  )
  return (
    <div className="relative flex h-[340px] w-[340px] items-center justify-center sm:h-[420px] sm:w-[420px] lg:h-[480px] lg:w-[480px]">
      {/* Orbit ring */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full border border-white/[0.08]"
        style={{ margin: '32px' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 rounded-full border border-white/[0.04]"
        style={{ margin: '62px' }}
      />

      {/* Glow core */}
      <motion.div
        aria-hidden
        animate={shouldReduce ? {} : { scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute h-32 w-32 rounded-full bg-customBlue/30 blur-3xl"
      />

      {/* Center EMC badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1], delay: 0.3 }}
        className="relative z-10 flex h-24 w-24 flex-col items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-[0_0_40px_rgba(0,119,182,0.35)] backdrop-blur-xl"
      >
        <span className="font-latin text-lg font-black tracking-widest text-white">EMC</span>
        <span className="mt-0.5 text-[9px] font-black tracking-widest text-white/50">PLATFORM</span>
      </motion.div>

      {/* Orbiting items */}
      {orbitItems.map((item, i) => {
        const rad = (item.angle * Math.PI) / 180
        const cx = Math.cos(rad) * item.r
        const cy = Math.sin(rad) * item.r
        return (
          <motion.div
            key={item.key}
            aria-hidden
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 + i * 0.1, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ left: `calc(50% + ${cx}px)`, top: `calc(50% + ${cy}px)` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={shouldReduce ? {} : { y: [0, -6, 0] }}
              transition={{ duration: 3 + i * 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
              className="flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.09] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-md"
              style={{ minWidth: `${item.size + 18}px` }}
            >
              <span className="whitespace-nowrap text-[11px] font-black text-white/90">{item.label}</span>
            </motion.div>
          </motion.div>
        )
      })}

      {/* Rotating orbit trace */}
      <motion.div
        aria-hidden
        animate={shouldReduce ? {} : { rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-8"
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 80%, rgba(0,119,182,0.4) 90%, transparent 100%)',
          }}
        />
      </motion.div>
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
          aria-hidden
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

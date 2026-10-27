import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Languages,
  Sparkles,
  Smile,
  ChevronDown,
  Compass,
  Users,
} from 'lucide-react'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'

/**
 * The three sibling platforms of the EMC ecosystem. External destinations, so
 * they open in a new tab and carry rel=noreferrer.
 */
const ECOSYSTEM = [
  { key: 'sadeem', label: 'مجتمع سديم', href: 'https://www.skool.com/emc', Icon: Users },
  { key: 'english', label: 'معهد الإنجليزية', href: 'https://english.edumc.nl/', Icon: Languages },
  { key: 'kids', label: 'فيوتشر مايندز للأطفال', href: 'https://futureminds.space/', Icon: Smile },
] as const


function HeroPhilosophyStatement() {
  return (
    <div className="relative w-full max-w-xl text-right">
      {/* Corner ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-customOrange/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-customBlue/20 blur-3xl"
      />

      <div className="relative rounded-3xl border border-white/15 bg-white/[0.04] p-8 sm:p-10 backdrop-blur-xl shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-customOrange/30 bg-customOrange/10 px-3.5 py-1 text-xs font-black text-customOrange mb-6">
          <Sparkles size={13} className="text-customOrange" />
          <span>فلسفة التعلم في EMC</span>
        </div>

        <h2 className="font-display text-2xl sm:text-3xl lg:text-[1.95rem] font-black leading-[1.65] text-white">
          مركز <span className="font-latin text-white">EMC</span> — منظومة تعليمية متدرجة تُرافقك من التشتت إلى وضوح المسار، ومن التعلم النظري إلى التطبيق المهني الملموس.
        </h2>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-bold text-sky-200/90">
            ١٢ مجالاً ومحوراً معرفياً متكاملاً
          </span>
          <a
            href="#themes-bento"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('themes-bento')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-black text-customOrange hover:text-white transition cursor-pointer"
          >
            <span>استكشف المحاور (المجالات)</span>
            <ArrowLeftIcon size={14} />
          </a>
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
        className="emc-stat-num block font-display text-[2.4rem] font-black text-white sm:text-5xl"
        dir="ltr"
      >
        {value}
      </span>
      <span className="mt-2 block text-xs font-bold leading-5 text-white/70">{label}</span>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

/** A hero call to action: a route link, or (with `anchor`) a smooth scroll to an element on the same page. */
type HeroAction = { text: string; href: string; anchor?: string }

type HeroAudience = {
  id: 'learner' | 'professional'
  label: string
  hint: string
  primaryBtn: HeroAction
  secondaryBtn: HeroAction
}

export default function HomeCinematicHero() {
  const { t } = useTranslation()
  const [activeAudience, setActiveAudience] = useState<'learner' | 'professional'>('learner')

  const audiences: HeroAudience[] = [
    {
      id: 'learner',
      label: 'طالب / خريج',
      hint: 'حدّد أهدافك ونقطة انطلاقك في دقيقتين أو احجز مقعدك في ورشة قادمة مجاناً',
      primaryBtn: { text: 'حدّد أهدافك ونقطة انطلاقك', href: '/learn#placement' },
      secondaryBtn: { text: 'احجز ورشة قادمة مجاناً', href: '/workshops' },
    },
    {
      id: 'professional',
      label: 'مهني / ممارس',
      hint: 'طوّر مهاراتك في الذكاء الاصطناعي واستكشف المسارات التأهيلية الشاملة',
      primaryBtn: { text: 'حدّد أهدافك ونقطة انطلاقك', href: '/learn#placement' },
      secondaryBtn: { text: 'استكشف المسارات التخصصية', href: '/learning-paths' },
    },
  ]

  const currentAudienceData = audiences.find((a) => a.id === activeAudience) ?? audiences[0]

  return (
    <section
      dir="rtl"
      className="relative isolate min-h-[100svh] overflow-hidden bg-deepBlue pt-[4.75rem] lg:pt-[5.25rem]"
    >
      {/* V3 signature: tricolor hairline pinned to top edge */}
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

      <div className="relative mx-auto grid max-w-[1540px] items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:min-h-[calc(100svh-5.25rem)] lg:grid-cols-2 lg:gap-12 lg:px-10 lg:pb-20">
        {/* ── Text column (Right in RTL) ── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="flex flex-col text-right"
        >
          {/* Eyebrow badge */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
            className="mb-6 flex justify-start"
          >
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.08] px-5 py-2.5 text-xs font-black tracking-wide text-white/90 backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-customOrange" aria-hidden />
              {t('home.hero.badge')}
            </span>
          </motion.div>

          {/* Headline (Two Lines) */}
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] } } }}
            className="font-display text-[2.5rem] font-black leading-[1.2] tracking-tight text-white [text-wrap:balance] sm:text-[3.2rem] lg:text-[3.6rem] xl:text-[4rem]"
          >
            ابنِ مسيرتك بمنهج يقود للعمق..
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #FFB054 0%, #ED8B1C 50%, #FFA733 100%)' }}
            >
              لا مجرد محتوى.
            </span>
          </motion.h1>

          {/* Action-Oriented Motivation Subtitle */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] } } }}
            className="mt-6 max-w-xl text-right"
          >
            <p className="text-base sm:text-lg font-medium leading-relaxed text-white/80">
              اختر فئتك بالأسفل لتحديد خطوتك التالية، أو حدّد أهدافك ونقطة انطلاقك مباشرة في دقيقتين.
            </p>
          </motion.div>

          {/* ── Audience Switcher (2 Options, Brand Orange Active State) ── */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
            className="mt-8 rounded-2xl bg-white/[0.06] border border-white/10 p-2 sm:p-2.5 max-w-xl backdrop-blur-md"
          >
            <div className="grid grid-cols-2 gap-2">
              {audiences.map((aud) => {
                const isSelected = aud.id === activeAudience
                return (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setActiveAudience(aud.id)}
                    className={`rounded-xl py-2.5 px-3 text-center text-xs sm:text-sm font-black transition-all duration-200 ${
                      isSelected
                        ? 'bg-customOrange text-white shadow-lg shadow-customOrange/30 ring-1 ring-customOrange'
                        : 'text-white/75 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {aud.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2.5 text-center text-[11px] font-semibold text-sky-200/90 truncate px-2">
              💡 {currentAudienceData.hint}
            </p>
          </motion.div>

          {/* ── Action Triggers (60-30-10 palette) ── */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
            className="mt-6 flex flex-wrap items-center justify-start gap-3.5"
          >
            {/* Primary Action Button (Test focus) */}
            {currentAudienceData.primaryBtn.anchor ? (
              <a
                href={`#${currentAudienceData.primaryBtn.anchor}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(currentAudienceData.primaryBtn.anchor ?? '')?.scrollIntoView({
                    behavior: 'smooth',
                  })
                }}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-customOrange px-6 sm:px-7 py-3.5 text-sm sm:text-base font-black text-white shadow-xl shadow-customOrange/30 hover:bg-customOrange/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>{currentAudienceData.primaryBtn.text}</span>
                <ArrowLeftIcon size={16} />
              </a>
            ) : (
              <Link
                to={currentAudienceData.primaryBtn.href}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-customOrange px-6 sm:px-7 py-3.5 text-sm sm:text-base font-black text-white shadow-xl shadow-customOrange/30 hover:bg-customOrange/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>{currentAudienceData.primaryBtn.text}</span>
                <ArrowLeftIcon size={16} />
              </Link>
            )}

            {/* Secondary Action Button */}
            {currentAudienceData.secondaryBtn.href ? (
              <Link
                to={currentAudienceData.secondaryBtn.href}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 sm:px-6 py-3.5 text-xs sm:text-sm font-black text-white hover:bg-white/20 transition-all backdrop-blur-sm"
              >
                <Compass size={16} className="text-sky" />
                <span>{currentAudienceData.secondaryBtn.text}</span>
              </Link>
            ) : null}
          </motion.div>

          {/* Sibling platforms of ecosystem */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.06 } } }}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5"
          >
            <span className="text-[11px] font-black tracking-wider text-white/40">منظومة EMC:</span>
            {ECOSYSTEM.map(({ key, label, href, Icon }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white transition"
              >
                <Icon size={14} className="text-sky group-hover:text-amber" aria-hidden />
                {label}
              </a>
            ))}
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

        {/* ── Left side: EMC Philosophy Statement (In place of orbital motion) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 0.61, 0.36, 1], delay: 0.15 }}
          className="hidden justify-center lg:flex items-center"
        >
          <HeroPhilosophyStatement />
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

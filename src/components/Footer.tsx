import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react'
import logo from '../assets/logo.png'
import { siteContact } from '@/data/publicPages'

// ── Data ──────────────────────────────────────────────────────────────────────

const PILLARS = ['LMS', 'AI', 'مسارات', 'ورش', 'شهادات', 'شراكات', 'تحليلات', 'مجتمع'] as const

const NAV_EXPLORE = [
  { label: 'الرئيسية', href: '/' },
  { label: 'عن المركز', href: '/about' },
  { label: 'المجالات والمحاور', href: '/tracks' },
  { label: 'الإدارات', href: '/departments' },
  { label: 'فريق EMC', href: '/ar/team' },
  { label: 'الأثر والإحصاءات', href: '/impact' },
] as const

const NAV_PROGRAMS = [
  { label: 'البرامج والدورات', href: '/courses' },
  { label: 'مسارات التعلم', href: '/paths' },
  { label: 'البرامج الاستراتيجية', href: '/programs' },
  { label: 'المنصة التعليمية', href: '/platform' },
  { label: 'تقديم ورشة', href: '/submit-workshop' },
] as const

const NAV_ENGAGE = [
  { label: 'الشراكات المؤسسية', href: '/partnerships' },
  { label: 'التطوع والانضمام', href: '/volunteer' },
  { label: 'صفحة التواصل', href: '/contact' },
  { label: 'استشارات للمؤسسات', href: '/contact' },
] as const

// Placeholder social icons using SVG paths (no dependency on icon lib)
const SOCIAL_LINKS = [
  {
    label: 'X (Twitter)',
    href: '#',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'LinkedIn',
    href: '#',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'Instagram',
    href: '#',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  },
  {
    label: 'YouTube',
    href: '#',
    path: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
] as const

// ── Sub-components ────────────────────────────────────────────────────────────

function FooterNavColumn({
  title,
  links,
}: {
  title: string
  links: ReadonlyArray<{ label: string; href: string }>
}) {
  return (
    <div className="text-right">
      <h3 className="mb-6 text-[10px] font-black tracking-[0.18em] text-customOrange uppercase">{title}</h3>
      <ul className="space-y-4">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              to={l.href}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-white/55 transition-colors hover:text-white"
            >
              <span className="h-px w-0 origin-left bg-customOrange/60 transition-all duration-300 group-hover:w-3" aria-hidden />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Main Footer ───────────────────────────────────────────────────────────────

export default function Footer() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setDone(true)
    setEmail('')
  }

  return (
    <footer className="relative isolate overflow-hidden bg-[#0a1525]" dir="rtl">
      {/* ── Ambient atmosphere ── */}
      <div aria-hidden className="pointer-events-none absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-customBlue/[0.12] blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-customOrange/[0.07] blur-[80px]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, white 30%, transparent 100%)',
        }}
      />
      {/* Top edge glow */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-customBlue/40 to-transparent" />

      {/* ── Zone 1: Platform pillars strip ── */}
      <div className="relative border-b border-white/[0.06] py-5">
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-center gap-3 px-4 sm:px-6 lg:px-10">
          {PILLARS.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-[11px] font-black text-white/40 backdrop-blur-sm"
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-customBlue/60" />
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* ── Zone 2: Main link grid ── */}
      <div className="relative mx-auto max-w-[1540px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.8fr_1fr_1fr_1fr_1.6fr] lg:gap-10">

          {/* Brand column */}
          <div className="text-right">
            <Link to="/" className="inline-block transition-opacity hover:opacity-85">
              <img src={logo} alt="EMC" className="h-14 w-auto brightness-0 invert" width={160} height={56} loading="lazy" />
            </Link>
            <p className="mt-5 text-sm font-medium leading-8 text-white/50">
              EMC منصة تعليمية وتطويرية تربط البرامج التدريبية، الاستشارات، والشراكات — بجودة عربية احترافية وهوية رقمية واضحة.
            </p>

            {/* Live badge */}
            <div className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-xs font-black text-white/50 backdrop-blur-sm">
              <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              نظام تعليمي موحّد · تشغيل نشط
            </div>

            {/* Social icons */}
            <div className="mt-8 flex flex-wrap justify-start gap-2.5">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-white/40 transition-all hover:border-white/20 hover:bg-white/[0.1] hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          <FooterNavColumn title="استكشف" links={NAV_EXPLORE} />
          <FooterNavColumn title="البرامج" links={NAV_PROGRAMS} />
          <FooterNavColumn title="المشاركة" links={NAV_ENGAGE} />

          {/* Contact column */}
          <div className="text-right">
            <h3 className="mb-6 text-[10px] font-black tracking-[0.18em] text-customOrange uppercase">تواصل معنا</h3>
            <ul className="space-y-4">
              <li>
                <a
                  href={`tel:${siteContact.phone}`}
                  className="group flex items-center gap-3 text-sm text-white/55 transition-colors hover:text-white"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.05] text-customOrange transition-colors group-hover:border-customOrange/30 group-hover:bg-customOrange/10">
                    <Phone size={14} aria-hidden />
                  </span>
                  <span className="font-latin" dir="ltr">{siteContact.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteContact.email}`}
                  className="group flex items-center gap-3 text-sm text-white/55 transition-colors hover:text-white"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.05] text-customBlue transition-colors group-hover:border-customBlue/30 group-hover:bg-customBlue/10">
                    <Mail size={14} aria-hidden />
                  </span>
                  <span className="font-latin">{siteContact.email}</span>
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3 text-sm text-white/45">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.05] text-white/30">
                    <MapPin size={14} aria-hidden />
                  </span>
                  <span className="leading-7">{siteContact.location.ar}</span>
                </div>
              </li>
            </ul>

            <Link
              to="/contact"
              className="group relative mt-8 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-customBlue px-5 py-3 text-sm font-black text-white shadow-[0_12px_32px_-10px_rgba(38,145,194,0.55)] transition-all hover:bg-[#1e7dab]"
            >
              <span aria-hidden className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/10 to-white/0 opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
              تواصل مع الفريق
              <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Zone 3: Newsletter ── */}
      <div className="relative border-t border-white/[0.06]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-[1540px] px-4 py-10 sm:px-6 lg:px-10"
        >
          <div className="flex flex-col gap-8 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-8 py-8 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="text-right lg:max-w-sm">
              <p className="text-[10px] font-black tracking-[0.18em] text-customOrange uppercase">النشرة البريدية</p>
              <h3 className="mt-2 text-base font-black text-white">ملخصات برامج وورش — دون إزعاج</h3>
              <p className="mt-1.5 text-sm font-medium text-white/40">
                أحدث البرامج وتقارير الأثر مباشرة إلى بريدك.
              </p>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex w-full max-w-md flex-col gap-2.5 sm:flex-row sm:items-center"
            >
              <label htmlFor="footer-email" className="sr-only">البريد الإلكتروني</label>
              <input
                id="footer-email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setDone(false) }}
                placeholder="أدخل بريدك الإلكتروني"
                dir="ltr"
                className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-white/[0.06] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-customBlue/50 focus:ring-1 focus:ring-customBlue/30"
              />
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-3 text-sm font-black text-white shadow-[0_8px_24px_-8px_rgba(236,148,60,0.5)] transition hover:brightness-105"
              >
                {done ? 'تم!' : 'اشترك'}
                {!done && <ArrowLeft size={14} aria-hidden />}
              </button>
            </form>
            {done && (
              <p className="text-xs font-bold text-customBlue" role="status">
                شكراً! سيتم إضافة بريدك عند تفعيل خادم النشرة.
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Zone 4: Legal / bottom bar ── */}
      <div className="relative border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1540px] flex-col items-center gap-4 px-4 py-6 text-center text-xs text-white/30 sm:flex-row sm:justify-between sm:px-6 sm:text-right lg:px-10">
          <span>
            جميع الحقوق محفوظة © {new Date().getFullYear()}{' '}
            <span className="font-latin">EMC — Educational Mastar Central</span>
          </span>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:justify-end">
            <Link to="/contact" className="transition hover:text-white hover:underline decoration-customOrange/50 underline-offset-4">
              دعم واستفسارات
            </Link>
            <Link to="/submit-workshop" className="transition hover:text-white hover:underline decoration-customOrange/50 underline-offset-4">
              طلب ورشة
            </Link>
            <Link to="/partnerships" className="transition hover:text-white hover:underline decoration-customOrange/50 underline-offset-4">
              الشراكات
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

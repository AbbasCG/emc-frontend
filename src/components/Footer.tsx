import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Cookie, Mail, MapPin, Phone } from 'lucide-react'
import { siteContact } from '@/data/publicPages'
import { useCookieConsentOptional } from '@/contexts/CookieConsentContext'
import { cn } from '@/lib/utils'

const NAV_MAIN = [
  { label: 'الرئيسية', href: '/' },
  { label: 'عن المركز', href: '/about' },
  { label: 'المجالات', href: '/tracks' },
  { label: 'فريق EMC', href: '/ar/team' },
  { label: 'الأثر', href: '/impact' },
  { label: 'الشراكات', href: '/partnerships' },
  { label: 'التطوع', href: '/volunteer' },
  { label: 'تواصل', href: '/contact' },
] as const

const NAV_PROGRAMS = [
  { label: 'الدورات', href: '/courses' },
  { label: 'الورش', href: '/workshops' },
  { label: 'مسارات التعلم', href: '/learning-paths' },
  { label: 'البرامج', href: '/programs' },
  { label: 'المنصة', href: '/platform' },
  { label: 'تقديم ورشة', href: '/submit-workshop' },
  { label: 'الدعم', href: '/support' },
  { label: 'قاعدة المعرفة', href: '/knowledge' },
] as const

const BOTTOM_LEGAL = [
  { label: 'الخصوصية', href: '/privacy' },
  { label: 'ملفات تعريف الارتباط', href: '/cookies' },
  { label: 'الشروط', href: '/terms' },
  { label: 'الاسترداد', href: '/refund-policy' },
  { label: 'إخلاء المسؤولية', href: '/disclaimer' },
  { label: 'الشكاوى', href: '/complaints' },
  { label: 'إمكانية الوصول', href: '/accessibility' },
] as const

const SOCIAL_LINKS = [
  {
    label: 'X (Twitter)',
    href: siteContact.social.x,
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'LinkedIn',
    href: siteContact.social.linkedin,
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'Instagram',
    href: siteContact.social.instagram,
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  },
  {
    label: 'YouTube',
    href: siteContact.social.youtube,
    path: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
] as const

function FooterAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-white/[0.08] md:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3 text-right md:hidden"
      >
        <span className="text-[11px] font-black tracking-[0.12em] text-amber">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-white/50 transition', open && 'rotate-180')} aria-hidden />
      </button>
      <h3 className="mb-2.5 hidden text-[10px] font-black tracking-[0.14em] text-amber md:block">{title}</h3>
      <div className={cn(open ? 'block pb-3' : 'hidden', 'md:block md:pb-0')}>{children}</div>
    </div>
  )
}

function NavLinks({ links }: { links: ReadonlyArray<{ label: string; href: string }> }) {
  return (
    <ul className="space-y-1.5">
      {links.map((l) => (
        <li key={`${l.href}-${l.label}`}>
          <Link to={l.href} className="text-[13px] font-semibold text-white/55 transition-colors hover:text-white">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function Footer() {
  const cookieConsent = useCookieConsentOptional()

  return (
    <footer className="relative isolate overflow-hidden bg-[#0C2A4B] text-white" dir="rtl">
      <div
        aria-hidden
        className="emc-tricolor-on-dark pointer-events-none absolute inset-x-0 top-0"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 end-0 h-48 w-48 rounded-full bg-[#0077B6]/10 blur-[80px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-6">
          <div className="text-right md:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block transition-opacity hover:opacity-90">
              <img
                src="/brand/logos/logo_full_white.png"
                alt="EMC — Educational Mastar Central"
                className="h-16 w-auto sm:h-[4.5rem]"
                width={200}
                height={80}
                loading="lazy"
              />
            </Link>
            <p className="mt-2 max-w-xs text-[12px] font-medium leading-6 text-white/50">
              منصة تعليمية عربية—هولندية: برامج، ورش، شراكات، وتعلم رقمي بمعايير احترافية.
            </p>
            <p className="emc-tridot mt-3 inline-flex items-center text-[12.5px] font-bold tracking-wide text-white/75">
              نُرشد العقول، ونبني المستقبل.
            </p>
            <Link
              to="/contact"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0077B6] px-3.5 py-2 text-[11px] font-black text-white transition hover:bg-brand-600"
            >
              تواصل معنا
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          <FooterAccordion title="روابط رئيسية">
            <NavLinks links={NAV_MAIN} />
          </FooterAccordion>

          <FooterAccordion title="البرامج">
            <NavLinks links={NAV_PROGRAMS} />
          </FooterAccordion>

          <FooterAccordion title="تواصل" defaultOpen>
            <ul className="space-y-2 text-[12px] font-semibold text-white/55">
              <li>
                <a
                  href={`tel:${siteContact.phone.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#F28C00]" aria-hidden />
                  <span dir="ltr" className="font-latin">
                    {siteContact.phone}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteContact.email}`}
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#0077B6]" aria-hidden />
                  <span className="font-latin text-[11px]">{siteContact.email}</span>
                </a>
              </li>
              <li className="flex items-start gap-2 text-white/40">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="text-[11px] leading-5">{siteContact.location.ar}</span>
              </li>
            </ul>
          </FooterAccordion>
        </div>
      </div>

      <div className="relative border-t border-white/[0.08] bg-[#1a2940]/80">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-center text-[11px] font-semibold text-white/35 lg:text-right">
              © {new Date().getFullYear()} <span className="font-latin text-white/45">EMC</span> · جميع الحقوق محفوظة
            </p>

            <nav
              aria-label="القانونية والخصوصية"
              className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[10px] font-semibold text-white/40 sm:text-[11px]"
            >
              {BOTTOM_LEGAL.map((link, i) => (
                <span key={link.href} className="inline-flex items-center">
                  {i > 0 ?
                    <span className="mx-1 text-white/15" aria-hidden>
                      ·
                    </span>
                  : null}
                  <Link to={link.href} className="transition hover:text-[#0077B6]">
                    {link.label}
                  </Link>
                </span>
              ))}
              {cookieConsent ?
                <>
                  <span className="mx-1 text-white/15" aria-hidden>
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={cookieConsent.openPreferences}
                    className="inline-flex items-center gap-1 transition hover:text-[#F28C00]"
                  >
                    <Cookie className="h-3 w-3" aria-hidden />
                    الكوكيز
                  </button>
                </>
              : null}
            </nav>

            <div className="flex items-center justify-center gap-1.5 lg:justify-end">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/40 transition hover:border-[#0077B6]/40 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden>
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronDown, Cookie, Mail, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/i18n/useLanguage'
import { siteContact } from '@/data/publicPages'
import { useCookieConsentOptional } from '@/contexts/useCookieConsent'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { cn } from '@/lib/utils'

/**
 * M3 i18n: link labels live in the catalog under footer.nav.* / footer.legal.*
 * (see src/i18n/locales/ar.json — the source of truth for the Arabic strings).
 *
 * EMC-WEB-001 §2: «للمؤسسات» (/business), «عن المركز» (/about) and
 * «التحقق من الشهادات» (/verify) belong to the FOOTER only — they are never
 * promoted into the five-item main menu.
 */
const NAV_PROGRAMS = [
  { key: 'courses', href: '/courses', fallback: 'الدورات التدريبية' },
  { key: 'learningPaths', href: '/learning-paths', fallback: 'المسارات المتكاملة' },
  { key: 'workshops', href: '/workshops', fallback: 'ورش العمل والندوات' },
  { key: 'fellowship', href: '/fellowship', fallback: 'برنامج الزمالة' },
  { key: 'programs', href: '/programs', fallback: 'الكتالوج الأكاديمي' },
  { key: 'tracks', href: '/tracks', fallback: 'المحاور المعرفية' },
] as const

const NAV_ABOUT = [
  { key: 'about', href: '/about', fallback: 'عن مركز EMC' },
  { key: 'business', href: '/business', fallback: 'حلول المؤسسات والشركات' },
  { key: 'verify', href: '/verify', fallback: 'التحقق من الشهادات' },
  { key: 'team', href: '/ar/team', fallback: 'فريق العمل والخبراء' },
  { key: 'impact', href: '/impact', fallback: 'الأثر والإحصائيات' },
  { key: 'departments', href: '/departments', fallback: 'الأقسام والإدارات' },
] as const

const NAV_COMMUNITY = [
  { key: 'partnerships', href: '/partnerships', fallback: 'الشراكات المؤسسية' },
  { key: 'ambassador', href: '/ambassador', fallback: 'برنامج السفراء' },
  { key: 'volunteer', href: '/volunteer', fallback: 'التطوع والمساهمة' },
  { key: 'volunteerOpportunities', href: '/volunteer-opportunities', fallback: 'فرص التطوع' },
  { key: 'consultants', href: '/consultants', fallback: 'هيئة المستشارين' },
  { key: 'instructors', href: '/instructors', fallback: 'انضم كمدرب' },
] as const

const NAV_PLATFORM = [
  { key: 'platform', href: '/platform', fallback: 'منصة التدريب الذكية' },
  { key: 'submitWorkshop', href: '/submit-workshop', fallback: 'تقديم مقترح ورشة' },
  { key: 'knowledge', href: '/knowledge', fallback: 'قاعدة المعرفة' },
  { key: 'support', href: '/support', fallback: 'مركز الدعم والمساعدة' },
  { key: 'contact', href: '/contact', fallback: 'اتصل بنا' },
] as const

const BOTTOM_LEGAL = [
  { key: 'privacy', href: '/privacy' },
  { key: 'cookies', href: '/cookies' },
  { key: 'terms', href: '/terms' },
  { key: 'refund', href: '/refund-policy' },
  { key: 'disclaimer', href: '/disclaimer' },
  { key: 'complaints', href: '/complaints' },
  { key: 'accessibility', href: '/accessibility' },
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
    <div className="border-b border-white/[0.08] sm:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3.5 text-right sm:hidden"
      >
        <span className="text-xs font-black tracking-wider text-ice">{title}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-white/50 transition-transform duration-200', open && 'rotate-180 text-customOrange')}
          aria-hidden
        />
      </button>
      <h3 className="mb-3 hidden text-[11px] font-black uppercase tracking-[0.14em] text-ice sm:block">{title}</h3>
      <div className={cn(open ? 'block pb-3.5' : 'hidden', 'sm:block sm:pb-0')}>{children}</div>
    </div>
  )
}

function NavLinks({ links }: { links: ReadonlyArray<{ label: string; href: string }> }) {
  return (
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={`${l.href}-${l.label}`}>
          <Link to={l.href} className="text-xs font-semibold text-white/60 transition-colors hover:text-white">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function Footer() {
  const { t } = useTranslation()
  const { dir } = useLanguage()
  const cookieConsent = useCookieConsentOptional()

  const programLinks = NAV_PROGRAMS.map((l) => ({ href: l.href, label: t(`footer.nav.programs.${l.key}`, l.fallback) }))
  const aboutLinks = NAV_ABOUT.map((l) => ({ href: l.href, label: t(`footer.nav.main.${l.key}`, l.fallback) }))
  const communityLinks = NAV_COMMUNITY.map((l) => ({
    href: l.href,
    label: t(`footer.nav.main.${l.key}`, t(`footer.nav.programs.${l.key}`, l.fallback)),
  }))
  const platformLinks = NAV_PLATFORM.map((l) => ({
    href: l.href,
    label: t(`footer.nav.programs.${l.key}`, t(`footer.nav.main.${l.key}`, l.fallback)),
  }))

  return (
    <footer className="relative isolate overflow-hidden bg-navy text-white" dir={dir}>
      {/* Brand edge three SOLID segments, never a gradient: §1 forbids blending
          the fire family into the sea family inside one gradient. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex h-1">
        <span className="w-[22%] bg-customOrange" />
        <span className="w-[36%] bg-sky" />
        <span className="flex-1 bg-white/20" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-8">
          {/* 1. Identity & Wordmark */}
          <div className="text-right sm:col-span-2 md:col-span-1 lg:col-span-1">
            <Link
              to="/"
              aria-label={t('nav.aria.homeLink')}
              className="inline-block font-display text-[2rem] font-black leading-none tracking-[0.14em] text-white transition-opacity hover:opacity-90"
            >
              EMC
            </Link>
            <p className="mt-3 max-w-xs text-[12px] font-medium leading-6 text-white/60">
              {t('footer.tagline')}
            </p>
            <p className="emc-tridot mt-3 inline-flex items-center text-[12.5px] font-bold tracking-wide text-white/80">
              {t('footer.motto')}
            </p>
            <div className="mt-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white shadow-md shadow-customOrange/20 transition hover:bg-customOrange/90"
              >
                {t('footer.contactCta')}
                <ArrowLeftIcon size={14} className="shrink-0 opacity-90" />
              </Link>
            </div>
          </div>

          {/* 2. Academic Programs */}
          <FooterAccordion title={t('footer.headings.programs', 'البرامج والمسارات')}>
            <NavLinks links={programLinks} />
          </FooterAccordion>

          {/* 3. About EMC */}
          <FooterAccordion title={t('footer.headings.main', 'عن المركز')}>
            <NavLinks links={aboutLinks} />
          </FooterAccordion>

          {/* 4. Community & Partnerships */}
          <FooterAccordion title="المجتمع والشراكات">
            <NavLinks links={communityLinks} />
          </FooterAccordion>

          {/* 5. Platform, Support & Contact */}
          <FooterAccordion title={t('footer.headings.contact', 'المنصة والتواصل')} defaultOpen>
            <NavLinks links={platformLinks} />
            <ul className="mt-4 pt-3 border-t border-white/10 space-y-2 text-[12px] font-semibold text-white/55">
              <li>
                <a
                  href={`mailto:${siteContact.email}`}
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-sky" aria-hidden />
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

      <div className="relative border-t border-white/[0.08] bg-night/60">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-center text-[11px] font-semibold text-white/35 lg:text-right">
              © {new Date().getFullYear()} <span className="font-latin text-white/45">EMC</span> · {t('footer.copyright')}
            </p>

            <nav
              aria-label={t('footer.aria.legalNav')}
              className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[10px] font-semibold text-white/40 sm:text-[11px]"
            >
              {BOTTOM_LEGAL.map((link, i) => (
                <span key={link.href} className="inline-flex items-center">
                  {i > 0 ?
                    <span className="mx-1 text-white/15" aria-hidden>
                      ·
                    </span>
                  : null}
                  <Link to={link.href} className="transition hover:text-white">
                    {t(`footer.legal.${link.key}`)}
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
                    className="inline-flex items-center gap-1 transition hover:text-white"
                  >
                    <Cookie className="h-3 w-3" aria-hidden />
                    {t('footer.cookieSettings')}
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
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/40 transition hover:border-white/30 hover:text-white"
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

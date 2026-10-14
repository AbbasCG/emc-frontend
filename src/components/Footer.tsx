import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronDown, Cookie, Mail, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/i18n/useLanguage'
import { siteContact } from '@/data/publicPages'
import { useCookieConsentOptional } from '@/contexts/useCookieConsent'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { cn } from '@/lib/utils'
import { Phone } from 'lucide-react';
/**
 * M3 i18n: link labels live in the catalog under footer.nav.* / footer.legal.*
 * (see src/i18n/locales/ar.json — the source of truth for the Arabic strings).
 *
 * EMC-WEB-001 §2: «للمؤسسات» (/business), «عن المركز» (/about) and
 * «التحقق من الشهادات» (/verify) belong to the FOOTER only — they are never
 * promoted into the five-item main menu.
 */
const NAV_MAIN = [
  { key: 'home', href: '/' },
  { key: 'about', href: '/about' },
  { key: 'business', href: '/business' },
  { key: 'verify', href: '/verify' },
  { key: 'tracks', href: '/tracks' },
  { key: 'team', href: '/ar/team' },
  { key: 'impact', href: '/impact' },
  { key: 'partnerships', href: '/partnerships' },
  { key: 'volunteer', href: '/volunteer' },
  { key: 'consultants', href: '/consultants' },
  { key: 'ambassador', href: '/ambassador' },
  { key: 'departments', href: '/departments' },
  { key: 'contact', href: '/contact' },
] as const

const NAV_PROGRAMS = [
  { key: 'courses', href: '/courses' },
  { key: 'learningPaths', href: '/learning-paths' },
  { key: 'fellowship', href: '/fellowship' },
  { key: 'workshops', href: '/workshops' },
  { key: 'programs', href: '/programs' },
  { key: 'instructors', href: '/instructors' },
  { key: 'platform', href: '/platform' },
  { key: 'submitWorkshop', href: '/submit-workshop' },
  { key: 'support', href: '/support' },
  { key: 'knowledge', href: '/knowledge' },
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
  
  {
    label: 'Facebook',
    href: siteContact.social.facebook,
    path: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  },
  {
    label: 'TikTok',
    href: siteContact.social.tiktok,
    path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  },
  {
    label: 'Telegram',
    href: siteContact.social.telegram,
    path: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
  },
  {
    label: 'WhatsApp',
    href: siteContact.social.whatsapp,
    path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
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
        {/* §1: orange is spent on the primary action only section eyebrows stay
            in the sea family. */}
        <span className="text-[11px] font-black tracking-[0.12em] text-ice">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-white/50 transition', open && 'rotate-180')} aria-hidden />
      </button>
      <h3 className="mb-2.5 hidden text-[10px] font-black tracking-[0.14em] text-ice md:block">{title}</h3>
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
  const { t } = useTranslation()
  const { dir } = useLanguage()
  const cookieConsent = useCookieConsentOptional()

  const mainLinks = NAV_MAIN.map((l) => ({ href: l.href, label: t(`footer.nav.main.${l.key}`) }))
  const programLinks = NAV_PROGRAMS.map((l) => ({ href: l.href, label: t(`footer.nav.programs.${l.key}`) }))

  return (
    <footer className="relative isolate overflow-hidden bg-navy text-white" dir={dir}>
      {/* Brand edge three SOLID segments, never a gradient: §1 forbids blending
          the fire family into the sea family inside one gradient. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex h-1">
        <span className="w-[22%] bg-customOrange" />
        <span className="w-[36%] bg-sky" />
        <span className="flex-1 bg-white/20" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-6">
          <div className="text-right md:col-span-2 lg:col-span-1">
            {/* §1: the logo appears ONCE site-wide in the header. The footer
                carries the wordmark as type, never a second lockup. */}
            <Link
              to="/"
              aria-label={t('nav.aria.homeLink')}
              className="inline-block font-display text-[2rem] font-black leading-none tracking-[0.14em] text-white transition-opacity hover:opacity-90"
            >
              EMC
            </Link>
            <p className="mt-3 max-w-xs text-[12px] font-medium leading-6 text-white/50">
              {t('footer.tagline')}
            </p>
            <p className="emc-tridot mt-3 inline-flex items-center text-[12.5px] font-bold tracking-wide text-white/75">
              {t('footer.motto')}
            </p>
            <Link
              to="/contact"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-customBlue px-3.5 py-2 text-[11px] font-black text-white transition hover:brightness-110"
            >
              {t('footer.contactCta')}
              <ArrowLeftIcon size={14} className="shrink-0 opacity-90" />
            </Link>
          </div>

          <FooterAccordion title={t('footer.headings.main')}>
            <NavLinks links={mainLinks} />
          </FooterAccordion>

          <FooterAccordion title={t('footer.headings.programs')}>
            <NavLinks links={programLinks} />
          </FooterAccordion>

          <FooterAccordion title={t('footer.headings.contact')} defaultOpen>
            <ul className="space-y-2 text-[12px] font-semibold text-white/55">
              {/* Phone row intentionally removed: siteContact.phone is an unconfirmed
                  placeholder (see src/data/publicPages.ts). Restore the row once a
                  real number is confirmed. */}
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
              
<a
  href={siteContact.social.whatsappPhone}
  target="_blank"
  rel="noopener noreferrer"
  aria-label="اتصل بنا عبر WhatsApp"
  title="اتصل بنا عبر WhatsApp"
  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/40 transition hover:border-white/30 hover:text-white"
>
  <Phone className="h-4 w-4" aria-hidden="true" />
</a>

            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

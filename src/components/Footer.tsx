import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react'
import logo from '../assets/logo.png'
import { siteContact, t as contentT } from '@/data/publicPages'

export default function Footer() {
  const { t } = useTranslation()
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterDone, setNewsletterDone] = useState(false)

  const explore = [
    { label: t('footer.links.home'), href: '/' },
    { label: t('footer.links.about'), href: '/about' },
    { label: t('footer.links.tracks'), href: '/tracks' },
    { label: t('footer.links.departments'), href: '/departments' },
    { label: t('footer.links.courses'), href: '/courses' },
  ]

  const engage = [
    { label: t('footer.links.partnerships'), href: '/partnerships' },
    { label: t('footer.links.volunteer'), href: '/volunteer' },
    { label: t('footer.links.team'), href: '/team' },
    { label: t('footer.links.impact'), href: '/impact' },
    { label: t('footer.links.workshop'), href: '/submit-workshop' },
  ]

  const programs = [
    { label: t('footer.links.paths'), href: '/paths' },
    { label: t('footer.links.programs'), href: '/programs' },
    { label: t('footer.links.platform'), href: '/platform' },
  ]

  function onNewsletterSubmit(e: FormEvent) {
    e.preventDefault()
    if (!newsletterEmail.trim()) return
    setNewsletterDone(true)
    setNewsletterEmail('')
  }

  return (
    <footer className="relative isolate overflow-hidden bg-deepBlue text-white">
      {/* Ambient atmospheric glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-customBlue/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-customOrange/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-emc-dots bg-dots-22 opacity-[0.06] [mask-image:radial-gradient(ellipse_at_top,rgba(0,0,0,0.7),transparent_70%)]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-customBlue/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-customOrange/20 to-transparent opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-14 text-right lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr] lg:gap-10">
          <div>
            <Link to="/" className="inline-block rounded-2xl p-1 ring-1 ring-white/0 transition hover:ring-white/10">
              <img src={logo} alt="EMC" className="h-16 w-auto brightness-0 invert" />
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-8 text-white/65">
              {t('footer.description')}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black tracking-wide text-white/75 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-slow-pulse" />
              {t('footer.badge')}
            </div>

            <form onSubmit={onNewsletterSubmit} className="mt-8 space-y-3 text-right">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-customOrange">{t('footer.newsletter.title')}</p>
                <p className="mt-1 text-sm leading-7 text-white/65">{t('footer.newsletter.description')}</p>
              </div>
              <label htmlFor="footer-news-email" className="sr-only">
                البريد للنشرة
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  id="footer-news-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={newsletterEmail}
                  onChange={(ev) => {
                    setNewsletterEmail(ev.target.value)
                    setNewsletterDone(false)
                  }}
                  placeholder={t('footer.newsletter.placeholder')}
                  dir="ltr"
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-3 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/40 focus:border-customBlue/45 focus:ring-customBlue/30"
                />
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-customOrange px-5 py-3 text-sm font-black text-deepBlue shadow-[0_12px_28px_-10px_rgba(236,148,60,0.55)] transition hover:brightness-105"
                >
                  {t('footer.newsletter.submit')}
                  <ArrowLeft size={16} aria-hidden />
                </button>
              </div>
              {newsletterDone ? (
                <p className="text-xs font-bold text-customBlue" role="status">
                  {t('footer.newsletter.success')}
                </p>
              ) : null}
            </form>
          </div>

          <div>
            <h3 className="mb-5 text-xs font-black tracking-[0.14em] text-customOrange">{t('footer.explore')}</h3>
            <ul className="grid gap-3.5 text-sm">
              {explore.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-white/65 transition hover:text-white hover:underline decoration-customOrange/80 underline-offset-8"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-xs font-black tracking-[0.14em] text-customOrange">{t('footer.engage')}</h3>
            <ul className="grid gap-3.5 text-sm">
              {engage.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-white/65 transition hover:text-white hover:underline decoration-customOrange/80 underline-offset-8"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-xs font-black tracking-[0.14em] text-customOrange">{t('footer.programs')}</h3>
            <ul className="grid gap-3.5 text-sm">
              {programs.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-white/65 transition hover:text-white hover:underline decoration-customOrange/80 underline-offset-8"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-md shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-customBlue/30 blur-2xl"
            />
            <h3 className="relative mb-5 text-xs font-black tracking-[0.14em] text-customOrange">{t('footer.contact')}</h3>
            <ul className="relative grid gap-4 text-sm text-white/75">
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-customOrange ring-1 ring-white/10">
                  <Phone size={15} />
                </span>
                <span className="font-latin tracking-wide" dir="ltr">{siteContact.phone}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-customOrange ring-1 ring-white/10">
                  <Mail size={15} />
                </span>
                <a href={`mailto:${siteContact.email}`} className="font-latin transition hover:text-white">
                  {siteContact.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-customOrange ring-1 ring-white/10">
                  <MapPin size={15} />
                </span>
                <span>{contentT(siteContact.location)}</span>
              </li>
            </ul>
            <Link
              to="/contact"
              className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customBlue px-5 py-3 text-sm font-black text-white shadow-[0_12px_32px_-10px_rgba(38,145,194,0.65)] transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:brightness-105"
            >
              {t('footer.fullContactPage')}
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-white/10 pt-10 text-center text-sm text-white/45 sm:flex-row sm:justify-between sm:text-right">
          <span>
            {t('footer.rights', { year: new Date().getFullYear() })}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-end">
            <Link to="/contact" className="font-semibold transition hover:text-customOrange">
              {t('footer.links.support')}
            </Link>
            <Link to="/submit-workshop" className="font-semibold transition hover:text-customOrange">
              {t('footer.links.requestWorkshop')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

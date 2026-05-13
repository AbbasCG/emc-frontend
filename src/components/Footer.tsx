import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import logo from '../assets/logo.png'
import { siteContact } from '@/data/publicPages'

const explore = [
  { label: 'الرئيسية', href: '/' },
  { label: 'عن المركز', href: '/about' },
  { label: 'الثيمات الاثنا عشر', href: '/themes' },
  { label: 'الإدارات', href: '/departments' },
  { label: 'البرامج والدورات', href: '/courses' },
]

const engage = [
  { label: 'الشراكات', href: '/partnerships' },
  { label: 'التطوع والانضمام', href: '/volunteer' },
  { label: 'الفريق', href: '/team' },
  { label: 'الأثر', href: '/impact' },
  { label: 'تقديم ورشة', href: '/submit-workshop' },
]

const programs = [
  { label: 'المسارات التعليمية', href: '/tracks' },
  { label: 'مسارات التعلم', href: '/paths' },
  { label: 'البرامج', href: '/programs' },
  { label: 'المنصة', href: '/platform' },
]

export default function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-deepBlue text-white" dir="rtl">
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
              EMC منصة تعليمية وتطويرية تربط بين البرامج التدريبية، الاستشارات، والشراكات
              لخدمة الطلاب والمهنيين والمجتمع — بجودة واحترافية وهوية عربية واضحة.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/70 font-latin backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-slow-pulse" />
              Operating · Educational OS
            </div>
          </div>

          <div>
            <h3 className="mb-5 text-xs font-black uppercase tracking-[0.12em] text-customOrange font-latin">استكشف</h3>
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
            <h3 className="mb-5 text-xs font-black uppercase tracking-[0.12em] text-customOrange font-latin">المشاركة</h3>
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
            <h3 className="mb-5 text-xs font-black uppercase tracking-[0.12em] text-customOrange font-latin">البرامج</h3>
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
            <h3 className="relative mb-5 text-xs font-black uppercase tracking-[0.12em] text-customOrange font-latin">تواصل</h3>
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
                <span>{siteContact.location.ar}</span>
              </li>
            </ul>
            <Link
              to="/contact"
              className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customBlue px-5 py-3 text-sm font-black text-white shadow-[0_12px_32px_-10px_rgba(38,145,194,0.65)] transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:brightness-105"
            >
              صفحة التواصل الكاملة
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-white/10 pt-10 text-center text-sm text-white/45 sm:flex-row sm:justify-between sm:text-right">
          <span className="font-latin tracking-wide">© {new Date().getFullYear()} EMC. جميع الحقوق محفوظة.</span>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-end">
            <Link to="/contact" className="font-semibold transition hover:text-customOrange">
              دعم واستفسارات
            </Link>
            <Link to="/submit-workshop" className="font-semibold transition hover:text-customOrange">
              طلب ورشة أو برنامج
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

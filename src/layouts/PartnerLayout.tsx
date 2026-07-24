import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, FileStack, LayoutDashboard, Menu, PieChart, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getUserDisplayName, getUserInitials, getUserSidebarSubtitle } from '../utils/userIdentity'

const items = [
  { label: 'لوحة الشراكة', href: '/partner/dashboard', icon: LayoutDashboard },
  { label: 'البرامج المشتركة', href: '/partner/programs', icon: Briefcase },
  { label: 'التقارير', href: '/partner/reports', icon: PieChart },
  { label: 'المستندات', href: '/partner/documents', icon: FileStack },
]

export default function PartnerLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer on navigation. Adjusted during render (react.dev
  // "adjusting state when a prop changes") so the new route never paints with the
  // previous route's drawer still open.
  const [seenPath, setSeenPath] = useState(location.pathname)
  if (seenPath !== location.pathname) {
    setSeenPath(location.pathname)
    setOpen(false)
  }

  const sidebarName = getUserDisplayName(user)
  const sidebarSub = getUserSidebarSubtitle(user)
  const sidebarInitials = getUserInitials(user)

  return (
    <div dir="rtl" className="min-h-screen bg-night">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={[
          'fixed inset-y-0 right-0 z-40 flex w-64 flex-col overflow-hidden border-l border-white/[0.08] bg-gradient-to-b from-[#1A2A3D] via-deepBlue to-[#0F1B2A] shadow-[inset_1px_0_0_rgba(255,255,255,0.05)]',
          'transition-transform duration-300 ease-emc-out lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-customBlue/[0.08] blur-3xl"
        />
        <div className="relative flex h-16 items-center justify-between border-b border-white/[0.08] px-5">
          <Link to="/" className="flex items-center gap-2">
            <img src="/brand/logos/logo_full_white.png" alt="EMC — Educational Mastar Central" className="h-9 w-auto" width={160} height={36} loading="eager" />
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="relative flex-1 space-y-1 px-3 py-4">
          {items.map((it) => {
            const active = location.pathname.startsWith(it.href)
            return (
              <NavLink
                key={it.href}
                to={it.href}
                className={[
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black transition-all duration-200 ease-emc-out',
                  active
                    ? 'bg-gradient-to-l from-customBlue to-[#1e7dab] text-white shadow-[0_8px_22px_-10px_rgba(0,119,182,0.7),inset_0_1px_0_rgba(255,255,255,0.18)]'
                    : 'text-white/70 hover:bg-white/[0.07] hover:text-white',
                ].join(' ')}
              >
                {active ? (
                  <span className="absolute inset-y-2 -right-3 w-1 rounded-full bg-customOrange shadow-[0_0_12px_rgba(242,140,0,0.7)]" />
                ) : null}
                <it.icon size={18} className={active ? 'text-white' : 'text-white/55 transition group-hover:text-white'} />
                {it.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="relative border-t border-white/[0.08] p-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.06] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-customOrange text-[11px] font-black leading-none text-deepBlue font-latin">
              {sidebarInitials}
            </span>
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate text-xs font-black text-white">{sidebarName}</p>
              <p className="truncate text-[11px] text-white/45 font-latin">
                {sidebarSub !== '' ? sidebarSub : 'بوابة الشركاء'}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="text-[11px] font-black text-white/60 hover:text-white"
            >
              خروج
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:mr-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/[0.08] bg-night/85 px-4 backdrop-blur-xl">
          <button
            type="button"
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="القائمة"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber font-latin">Partner Workspace</p>
            <h1 className="truncate text-lg font-black tracking-tight text-white font-display">بوابة الشركاء EMC</h1>
          </div>
          <Link
            to="/dashboard"
            className="rounded-xl bg-white/10 px-4 py-2 text-xs font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
          >
            العودة للوحة العامة
          </Link>
        </header>
        <main className="p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

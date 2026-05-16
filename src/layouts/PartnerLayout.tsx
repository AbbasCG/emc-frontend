import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, FileStack, LayoutDashboard, Menu, PieChart, X } from 'lucide-react'
import logo from '../assets/logo.png'
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

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const sidebarName = getUserDisplayName(user)
  const sidebarSub = getUserSidebarSubtitle(user)
  const sidebarInitials = getUserInitials(user)

  return (
    <div dir="rtl" className="min-h-screen bg-[#0f172a]">
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
          'fixed inset-y-0 right-0 z-40 flex w-64 flex-col border-l border-white/10 bg-gradient-to-b from-deepBlue to-[#152238]',
          'transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="EMC" className="h-9 w-auto brightness-0 invert" />
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
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((it) => {
            const active = location.pathname.startsWith(it.href)
            return (
              <NavLink
                key={it.href}
                to={it.href}
                className={[
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black transition',
                  active ? 'bg-customOrange text-deepBlue shadow-lg' : 'text-white/70 hover:bg-white/10 hover:text-white',
                ].join(' ')}
              >
                <it.icon size={18} />
                {it.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2">
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
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-[#0f172a]/85 px-4 backdrop-blur">
          <button
            type="button"
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="القائمة"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-customOrange">Partner Workspace</p>
            <h1 className="truncate text-lg font-black text-white">بوابة الشركاء EMC</h1>
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

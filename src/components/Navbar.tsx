import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  User,
  X,
} from 'lucide-react'
import logo from '../assets/logo.png'
import { useAuth } from '../contexts/AuthContext'

// ---------------------------------------------------------------------------
// Navigation structure
// ---------------------------------------------------------------------------

type NavItem = { label: string; href: string }
type NavGroup = { label: string; href?: string; items?: NavItem[] }

const navGroups: NavGroup[] = [
  { label: 'الدورات', href: '/courses' },
  {
    label: 'التعليم',
    items: [
      { label: 'الأقسام', href: '/departments' },
      { label: 'المحاور', href: '/tracks' },
      { label: 'المسارات', href: '/paths' },
      { label: 'البرامج', href: '/programs' },
    ],
  },
  {
    label: 'عن المنصة',
    items: [
      { label: 'من نحن', href: '/about' },
      { label: 'المنصة', href: '/platform' },
      { label: 'الفريق', href: '/team' },
      { label: 'الأثر', href: '/impact' },
      { label: 'الشراكات', href: '/partnerships' },
    ],
  },
  {
    label: 'المجتمع',
    items: [
      { label: 'التطوع', href: '/volunteer' },
      { label: 'تواصل معنا', href: '/contact' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.14 } },
}

const mobileMenuVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2 } },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Navbar() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()

  const [scrolled, setScrolled] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)

  const navRef = useRef<HTMLElement>(null)
  const location = useLocation()

  // Shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close everything on route change
  useEffect(() => {
    setOpenGroup(null)
    setUserMenuOpen(false)
    setMobileOpen(false)
    setMobileExpanded(null)
  }, [location.pathname])

  // Click outside → close all dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null)
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Escape key → close all dropdowns
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenGroup(null)
        setUserMenuOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function toggleGroup(label: string) {
    setOpenGroup((prev) => (prev === label ? null : label))
    setUserMenuOpen(false)
  }

  function toggleUserMenu() {
    setUserMenuOpen((prev) => !prev)
    setOpenGroup(null)
  }

  function toggleMobileGroup(label: string) {
    setMobileExpanded((prev) => (prev === label ? null : label))
  }

  // First letter of user's name for the avatar circle
  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? '؟'

  return (
    <header
      ref={navRef}
      dir="rtl"
      className={[
        'fixed inset-x-0 top-0 z-50 bg-white transition-shadow duration-300',
        scrolled ? 'border-b border-slate-100 shadow-md shadow-slate-900/8' : 'shadow-none',
      ].join(' ')}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ── Logo ── */}
        <Link to="/" className="flex shrink-0 items-center">
          <img src={logo} alt="EMC" className="h-12 w-auto" />
        </Link>

        {/* ── Desktop Navigation ── */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="القائمة الرئيسية">
          {navGroups.map((group) => {
            if (group.href) {
              return (
                <NavLink
                  key={group.label}
                  to={group.href}
                  className={({ isActive }) =>
                    [
                      'rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-150',
                      isActive
                        ? 'bg-sky-50 text-customBlue'
                        : 'text-deepBlue hover:bg-slate-50 hover:text-customBlue',
                    ].join(' ')
                  }
                >
                  {group.label}
                </NavLink>
              )
            }

            const isOpen = openGroup === group.label
            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  className={[
                    'flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-150',
                    isOpen
                      ? 'bg-sky-50 text-customBlue'
                      : 'text-deepBlue hover:bg-slate-50 hover:text-customBlue',
                  ].join(' ')}
                >
                  {group.label}
                  <ChevronDown
                    size={15}
                    className={['transition-transform duration-200', isOpen ? '-rotate-180' : ''].join(' ')}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && group.items && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute right-0 top-full mt-2 min-w-[180px] rounded-xl border border-slate-100 bg-white py-2 shadow-xl shadow-slate-900/10"
                      role="menu"
                    >
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          role="menuitem"
                          className="block px-5 py-2.5 text-sm font-bold text-deepBlue transition-colors hover:bg-sky-50 hover:text-customBlue"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </nav>

        {/* ── Desktop Auth Area ── */}
        <div className="hidden items-center gap-3 lg:flex">
          {/* Show nothing while session is being restored */}
          {!isLoading && (
            isAuthenticated && user ? (
              /* ── Logged-in: user avatar + dropdown ── */
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleUserMenu}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  className={[
                    'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-bold transition-colors',
                    userMenuOpen
                      ? 'border-customBlue/30 bg-sky-50 text-customBlue'
                      : 'border-slate-200 bg-white text-deepBlue hover:border-customBlue/20 hover:bg-sky-50 hover:text-customBlue',
                  ].join(' ')}
                >
                  {/* Avatar circle */}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-customBlue text-xs font-black text-white">
                    {userInitial}
                  </span>
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown
                    size={14}
                    className={['transition-transform duration-200', userMenuOpen ? '-rotate-180' : ''].join(' ')}
                  />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-100 bg-white py-2 shadow-xl shadow-slate-900/10"
                      role="menu"
                    >
                      <Link
                        to="/dashboard"
                        role="menuitem"
                        className="flex items-center gap-3 px-5 py-2.5 text-sm font-bold text-deepBlue transition-colors hover:bg-sky-50 hover:text-customBlue"
                      >
                        <LayoutDashboard size={16} />
                        لوحة التحكم
                      </Link>
                      <Link
                        to="/dashboard/profile"
                        role="menuitem"
                        className="flex items-center gap-3 px-5 py-2.5 text-sm font-bold text-deepBlue transition-colors hover:bg-sky-50 hover:text-customBlue"
                      >
                        <User size={16} />
                        الملف الشخصي
                      </Link>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={logout}
                        className="flex w-full items-center gap-3 px-5 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
                      >
                        <LogOut size={16} />
                        تسجيل الخروج
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* ── Logged-out: login + dashboard buttons ── */
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-deepBlue transition-colors hover:bg-slate-50 hover:text-customBlue"
                >
                  <LogIn size={17} />
                  تسجيل الدخول
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg bg-customBlue px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-200 transition-all hover:bg-[#1e7dab] hover:shadow-lg"
                >
                  <LayoutDashboard size={17} />
                  لوحة التحكم
                </Link>
              </>
            )
          )}
        </div>

        {/* ── Mobile Hamburger ── */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-deepBlue transition hover:bg-slate-100 lg:hidden"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden border-t border-slate-100 bg-white lg:hidden"
          >
            <div className="mx-auto max-w-7xl space-y-1 px-4 pb-6 pt-3 sm:px-6">
              {navGroups.map((group) => {
                if (group.href) {
                  return (
                    <NavLink
                      key={group.label}
                      to={group.href}
                      className={({ isActive }) =>
                        [
                          'block rounded-lg px-4 py-3 text-sm font-bold transition-colors',
                          isActive
                            ? 'bg-sky-50 text-customBlue'
                            : 'text-deepBlue hover:bg-slate-50 hover:text-customBlue',
                        ].join(' ')
                      }
                    >
                      {group.label}
                    </NavLink>
                  )
                }

                const isExpanded = mobileExpanded === group.label
                return (
                  <div key={group.label}>
                    <button
                      type="button"
                      onClick={() => toggleMobileGroup(group.label)}
                      className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-bold text-deepBlue transition-colors hover:bg-slate-50"
                    >
                      {group.label}
                      <ChevronDown
                        size={15}
                        className={[
                          'transition-transform duration-200',
                          isExpanded ? '-rotate-180' : '',
                        ].join(' ')}
                      />
                    </button>

                    <AnimatePresence>
                      {isExpanded && group.items && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1, transition: { duration: 0.2 } }}
                          exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
                          className="overflow-hidden"
                        >
                          <div className="mb-1 mr-4 rounded-lg border-r-2 border-customBlue/20 bg-slate-50 py-1">
                            {group.items.map((item) => (
                              <Link
                                key={item.href}
                                to={item.href}
                                className="block px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:text-customBlue"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}

              {/* Mobile Auth Buttons */}
              {!isLoading && (
                <div className="grid gap-2 pt-3">
                  {isAuthenticated && user ? (
                    <>
                      {/* Logged-in mobile */}
                      <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-customBlue text-sm font-black text-white">
                          {userInitial}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-deepBlue">{user.name}</p>
                          <p className="truncate text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                      <Link
                        to="/dashboard"
                        className="flex items-center justify-center gap-2 rounded-lg bg-customBlue px-5 py-3 text-sm font-bold text-white"
                      >
                        <LayoutDashboard size={17} />
                        لوحة التحكم
                      </Link>
                      <button
                        type="button"
                        onClick={logout}
                        className="flex items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-600"
                      >
                        <LogOut size={17} />
                        تسجيل الخروج
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Logged-out mobile */}
                      <Link
                        to="/dashboard"
                        className="flex items-center justify-center gap-2 rounded-lg bg-customBlue px-5 py-3 text-sm font-bold text-white"
                      >
                        <LayoutDashboard size={17} />
                        لوحة التحكم
                      </Link>
                      <Link
                        to="/login"
                        className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-deepBlue"
                      >
                        <LogIn size={17} />
                        تسجيل الدخول
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

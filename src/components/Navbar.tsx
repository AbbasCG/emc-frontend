import { useEffect, useRef, useState, useMemo } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Building2,
  CalendarPlus,
  ChevronDown,
  GraduationCap,
  Handshake,
  HeartHandshake,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  LogIn,
  LogOut,
  Mail,
  MapPinned,
  Menu,
  Monitor,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User,
  UserCircle,
  Users,
  Waypoints,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import logo from '../assets/logo.png'
import MegaDropdown, { type MegaDropdownItem } from './nav/MegaDropdown'
import { useAuth } from '../contexts/AuthContext'
import { dropdownMotion, mobileMenuMotion } from '@/utils/animations'
import { routeMatchesPath } from '@/utils/routeMatch'
import { UserAvatar } from '@/components/UserAvatar'
import LanguageSwitcher from './LanguageSwitcher'

type MegaId = 'about' | 'programs' | 'center' | 'join'

const megaPrefixes: Record<MegaId, readonly string[]> = {
  about: ['/about', '/impact', '/team'],
  programs: ['/courses', '/paths', '/tracks', '/programs', '/instructors', '/submit-workshop'],
  center: ['/departments', '/platform'],
  join: ['/signup', '/contact', '/volunteer', '/partnerships/apply'],
}

function pathActive(pathname: string, mega: MegaId): boolean {
  return megaPrefixes[mega].some((prefix) => routeMatchesPath(pathname, prefix))
}

const navLinkBase =
  'inline-flex min-h-[2.625rem] items-center rounded-xl px-3.5 py-2 text-[13px] font-semibold tracking-tight text-deepBlue transition-all duration-200 hover:bg-customBlue/[0.08] hover:text-customBlue hover:shadow-emc-xs'
const navLinkActive =
  'bg-customBlue/[0.11] text-customBlue shadow-[inset_0_0_0_1px_rgba(38,145,194,0.35)] backdrop-blur-sm'

/** Lightweight secondary actions — center nav stays visually primary */
const loginBtnClass =
  'group/login inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-deepBlue/[0.11] bg-white/90 px-5 text-[13px] font-semibold tracking-tight text-deepBlue shadow-[0_1px_2px_rgba(34,51,74,0.045)] backdrop-blur-sm transition-all duration-200 hover:border-customBlue/25 hover:bg-white hover:text-customBlue hover:shadow-[0_6px_18px_-12px_rgba(34,51,74,0.12)]'

const dashboardBtnClass =
  'group/nav inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-customBlue/[0.18] bg-gradient-to-br from-customBlue/[0.08] via-white to-deepBlue/[0.04] px-5 text-[13px] font-semibold tracking-tight text-deepBlue shadow-[0_1px_2px_rgba(34,51,74,0.05)] backdrop-blur-sm transition-colors duration-200 hover:border-customBlue/35 hover:from-customBlue/[0.12] hover:to-customBlue/[0.06] hover:text-deepBlue hover:shadow-[0_8px_22px_-14px_rgba(38,145,194,0.22)]'

const dashboardIconClass =
  'relative size-[15px] shrink-0 text-customBlue opacity-95 transition-colors duration-200 group-hover/nav:text-customBlue'

const loginIconClass =
  'relative size-[15px] shrink-0 text-deepBlue/78 transition-colors duration-200 group-hover/login:text-customBlue'

export default function Navbar() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [openMega, setOpenMega] = useState<MegaId | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileGroup, setMobileGroup] = useState<MegaId | null>(null)

  const { pathname, hash } = useLocation()
  const navRef = useRef<HTMLElement>(null)

  const aboutItems = useMemo<MegaDropdownItem[]>(() => [
    { href: '/about', label: t('nav.aboutItems.about.label'), description: t('nav.aboutItems.about.description'), icon: Users },
    { href: '/about#vision-mission', label: t('nav.aboutItems.vision.label'), description: t('nav.aboutItems.vision.description'), icon: Target },
    { href: '/about#roadmap', label: t('nav.aboutItems.roadmap.label'), description: t('nav.aboutItems.roadmap.description'), icon: MapPinned },
    { href: '/about#leadership', label: t('nav.aboutItems.leadership.label'), description: t('nav.aboutItems.leadership.description'), icon: Sparkles },
    { href: '/impact', label: t('nav.aboutItems.impact.label'), description: t('nav.aboutItems.impact.description'), icon: TrendingUp },
    { href: '/team', label: t('nav.aboutItems.team.label'), description: t('nav.aboutItems.team.description'), icon: UserCircle },
  ], [t])

  const programsItems = useMemo<MegaDropdownItem[]>(() => [
    { href: '/courses', label: t('nav.programsItems.courses.label'), description: t('nav.programsItems.courses.description'), icon: BookOpen },
    { href: '/programs', label: t('nav.programsItems.programs.label'), description: t('nav.programsItems.programs.description'), icon: Layers },
    { href: '/paths', label: t('nav.programsItems.paths.label'), description: t('nav.programsItems.paths.description'), icon: Waypoints },
    { href: '/tracks', label: t('nav.programsItems.tracks.label'), description: t('nav.programsItems.tracks.description'), icon: LayoutGrid },
    { href: '/instructors', label: t('nav.programsItems.instructors.label'), description: t('nav.programsItems.instructors.description'), icon: UserCircle },
    { href: '/submit-workshop', label: t('nav.programsItems.workshop.label'), description: t('nav.programsItems.workshop.description'), icon: CalendarPlus },
  ], [t])

  const centerItems = useMemo<MegaDropdownItem[]>(() => [
    { href: '/departments', label: t('nav.centerItems.departments.label'), description: t('nav.centerItems.departments.description'), icon: Building2 },
    { href: '/departments#governance', label: t('nav.centerItems.governance.label'), description: t('nav.centerItems.governance.description'), icon: ShieldCheck },
    { href: '/platform', label: t('nav.centerItems.platform.label'), description: t('nav.centerItems.platform.description'), icon: Monitor },
  ], [t])

  const joinItems = useMemo<MegaDropdownItem[]>(() => [
    { href: '/signup', label: t('nav.joinItems.student.label'), description: t('nav.joinItems.student.description'), icon: UserCircle },
    { href: '/contact#trainer', label: t('nav.joinItems.trainer.label'), description: t('nav.joinItems.trainer.description'), icon: GraduationCap },
    { href: '/partnerships/apply', label: t('nav.joinItems.partner.label'), description: t('nav.joinItems.partner.description'), icon: Handshake },
    { href: '/volunteer', label: t('nav.joinItems.volunteer.label'), description: t('nav.joinItems.volunteer.description'), icon: HeartHandshake },
    { href: '/contact', label: t('nav.joinItems.contact.label'), description: t('nav.joinItems.contact.description'), icon: Mail },
  ], [t])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpenMega(null)
    setUserMenuOpen(false)
    setMobileOpen(false)
    setMobileGroup(null)
  }, [pathname])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMega(null)
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenMega(null)
        setUserMenuOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function toggleMega(id: MegaId) {
    setOpenMega((m) => (m === id ? null : id))
    setUserMenuOpen(false)
  }

  return (
    <header
      ref={navRef}
      className={[
        'fixed inset-x-0 top-0 z-50 border-b transition-[box-shadow,border-color,background,backdrop-filter] duration-350 ease-emc-out',
        scrolled
          ? 'border-deepBlue/[0.085] bg-white/[0.9] shadow-emc-lg shadow-deepBlue/[0.06] ring-1 ring-deepBlue/[0.045] backdrop-blur-2xl backdrop-saturate-150'
          : 'border-deepBlue/[0.04] bg-white/[0.78] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/60',
      ].join(' ')}
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:h-[4.25rem] lg:px-8">
        <Link
          to="/"
          className="relative z-20 flex shrink-0 items-center rounded-2xl p-1 ring-deepBlue/0 transition hover:bg-emcBg/90 hover:ring-1 hover:ring-customBlue/18"
        >
          <img src={logo} alt="EMC" className="h-9 w-auto sm:h-10 lg:h-[2.5rem]" />
        </Link>

        <nav
          className="absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-center lg:flex"
          aria-label={t('nav.about')}
        >
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-deepBlue/[0.065] bg-white/[0.55] px-2 py-1.5 shadow-emc-md shadow-deepBlue/[0.04] ring-1 ring-white/75 backdrop-blur-2xl">
            <NavLink to="/" end className={({ isActive }) => [navLinkBase, isActive ? navLinkActive : ''].join(' ')}>
              {t('nav.home')}
            </NavLink>

            <MegaDropdown
              label={t('nav.about')}
              items={aboutItems}
              isOpen={openMega === 'about'}
              onToggle={() => toggleMega('about')}
              isActive={pathActive(pathname, 'about')}
              pathname={pathname}
              locationHash={hash}
            />
            <MegaDropdown
              label={t('nav.programs')}
              items={programsItems}
              isOpen={openMega === 'programs'}
              onToggle={() => toggleMega('programs')}
              isActive={pathActive(pathname, 'programs')}
              pathname={pathname}
              locationHash={hash}
            />
            <MegaDropdown
              label={t('nav.center')}
              items={centerItems}
              isOpen={openMega === 'center'}
              onToggle={() => toggleMega('center')}
              isActive={pathActive(pathname, 'center')}
              pathname={pathname}
              locationHash={hash}
            />

            <NavLink
              to="/partnerships"
              className={({ isActive }) => [navLinkBase, isActive ? navLinkActive : ''].join(' ')}
            >
              {t('nav.partnerships')}
            </NavLink>

            <MegaDropdown
              label={t('nav.join')}
              items={joinItems}
              isOpen={openMega === 'join'}
              onToggle={() => toggleMega('join')}
              isActive={pathActive(pathname, 'join')}
              pathname={pathname}
              locationHash={hash}
            />
            <LanguageSwitcher />
          </div>
        </nav>

        <div className="relative z-20 hidden shrink-0 items-center gap-2 lg:flex">
          {!isLoading &&
            (isAuthenticated && user ? (
              <>
                <motion.span whileHover={{ opacity: 0.96 }} whileTap={{ scale: 0.987 }}>
                  <Link to="/dashboard" className={dashboardBtnClass}>
                    <LayoutDashboard strokeWidth={2} className={dashboardIconClass} aria-hidden />
                    <span className="whitespace-nowrap">{t('nav.dashboard')}</span>
                  </Link>
                </motion.span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen((v) => !v)
                      setOpenMega(null)
                    }}
                    aria-expanded={userMenuOpen}
                    className={[
                      'flex h-11 items-center gap-2 rounded-2xl border px-3.5 text-[13px] font-semibold transition-all duration-200',
                      userMenuOpen
                        ? 'border-customBlue/35 bg-customBlue/[0.08] text-customBlue shadow-emc-xs backdrop-blur-sm'
                        : 'border-deepBlue/[0.1] bg-white/60 text-deepBlue backdrop-blur-sm hover:border-customBlue/25 hover:bg-emcBg/90',
                    ].join(' ')}
                  >
                    <UserAvatar
                      user={user}
                      className="h-8 w-8 shrink-0 rounded-full bg-deepBlue/[0.9] text-xs text-white shadow-inner ring-1 ring-white/20"
                      textClassName="text-xs font-black text-white"
                    />
                    <span className="max-w-[6.5rem] truncate">{user.name}</span>
                    <ChevronDown
                      size={14}
                      className={['opacity-55 transition-transform', userMenuOpen ? '-rotate-180' : ''].join(' ')}
                    />
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        variants={dropdownMotion}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute left-0 top-full z-50 mt-2.5 w-56 overflow-hidden rounded-2xl border border-deepBlue/[0.08] bg-white py-1 shadow-[0_24px_48px_-14px_rgba(15,42,67,0.2)]"
                        role="menu"
                      >
                          <Link
                          to="/dashboard"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-deepBlue transition hover:bg-[#F8FBFE]"
                        >
                          <LayoutDashboard size={16} />
                          {t('nav.dashboard')}
                        </Link>
                        <Link
                          to="/dashboard/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-deepBlue transition hover:bg-[#F8FBFE]"
                        >
                          <User size={16} />
                          {t('nav.profile')}
                        </Link>
                        <div className="my-1 border-t border-deepBlue/[0.06]" />
                        <button
                          type="button"
                          onClick={logout}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-customOrange transition hover:bg-customOrange/[0.08]"
                        >
                          <LogOut size={16} />
                          {t('nav.logout')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <motion.span whileHover={{ opacity: 0.96 }} whileTap={{ scale: 0.987 }}>
                  <Link to="/login" className={loginBtnClass}>
                    <LogIn strokeWidth={2} className={loginIconClass} aria-hidden />
                    <span className="whitespace-nowrap">{t('nav.login')}</span>
                  </Link>
                </motion.span>
                <motion.span whileHover={{ opacity: 0.96 }} whileTap={{ scale: 0.987 }}>
                  <Link to="/dashboard" className={dashboardBtnClass}>
                    <LayoutDashboard strokeWidth={2} className={dashboardIconClass} aria-hidden />
                    <span className="whitespace-nowrap">{t('nav.dashboard')}</span>
                  </Link>
                </motion.span>
              </>
            ))}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? (t('nav.home')) : (t('nav.home'))}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-deepBlue/[0.1] bg-white/70 text-deepBlue shadow-emc-xs backdrop-blur-md transition hover:border-customBlue/25 hover:bg-emcBg/90 lg:hidden"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            variants={mobileMenuMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-h-[80vh] overflow-y-auto border-t border-deepBlue/[0.07] bg-white/98 backdrop-blur-xl lg:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <NavLink
                  to="/"
                  end
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    [
                      'shrink-0 rounded-xl px-3 py-2 text-sm font-black',
                      isActive ? 'bg-customBlue/[0.1] text-customBlue ring-1 ring-customBlue/20' : 'text-deepBlue hover:bg-[#F8FBFE]',
                    ].join(' ')
                  }
                >
                  {t('nav.home')}
                </NavLink>

                {(
                  [
                    ['about', t('nav.about'), aboutItems],
                    ['programs', t('nav.programs'), programsItems],
                    ['center', t('nav.center'), centerItems],
                  ] as const
                ).map(([id, label, items]) => (
                  <div key={id} className="shrink-0 overflow-hidden rounded-xl border border-deepBlue/[0.08] bg-[#F8FBFE]/80">
                    <button
                      type="button"
                      onClick={() => setMobileGroup((g) => (g === id ? null : id))}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-black text-deepBlue whitespace-nowrap"
                    >
                      {label}
                      <ChevronDown
                        size={14}
                        className={['text-deepBlue/45 transition-transform shrink-0', mobileGroup === id ? '-rotate-180' : ''].join(' ')}
                      />
                    </button>
                    <AnimatePresence>
                      {mobileGroup === id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-deepBlue/[0.06] bg-white"
                        >
                          {items.map((item) => {
                            const Icon = item.icon
                            return (
                              <Link
                                key={item.href}
                                to={item.href}
                                onClick={() => setMobileOpen(false)}
                                className="flex gap-3 border-b border-deepBlue/[0.04] px-4 py-2.5 text-right last:border-0 hover:bg-customBlue/[0.05]"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-deepBlue/[0.04] text-customBlue">
                                  <Icon size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-deepBlue">{item.label}</p>
                                  <p className="text-xs leading-relaxed text-deepBlue/55">{item.description}</p>
                                </div>
                              </Link>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                <div className="shrink-0 overflow-hidden rounded-xl border border-deepBlue/[0.08] bg-[#F8FBFE]/80">
                  <div className="flex items-center gap-1 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setMobileGroup((g) => (g === 'join' ? null : 'join'))}
                      className="flex items-center gap-1 text-sm font-black text-deepBlue whitespace-nowrap"
                    >
                      {t('nav.join')}
                      <ChevronDown
                        size={14}
                        className={['text-deepBlue/45 transition-transform shrink-0', mobileGroup === 'join' ? '-rotate-180' : ''].join(' ')}
                      />
                    </button>
                  </div>
                  <AnimatePresence>
                    {mobileGroup === 'join' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-deepBlue/[0.06] bg-white"
                      >
                        {joinItems.map((item) => {
                          const Icon = item.icon
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setMobileOpen(false)}
                              className="flex gap-3 border-b border-deepBlue/[0.04] px-4 py-2.5 text-right last:border-0 hover:bg-customBlue/[0.05]"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-deepBlue/[0.04] text-customBlue">
                                <Icon size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-deepBlue">{item.label}</p>
                                <p className="text-xs leading-relaxed text-deepBlue/55">{item.description}</p>
                              </div>
                            </Link>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="shrink-0 self-center">
                  <LanguageSwitcher />
                </div>

                <NavLink
                  to="/partnerships"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    [
                      'shrink-0 rounded-xl px-3 py-2 text-sm font-black',
                      isActive ? 'bg-customBlue/[0.1] text-customBlue ring-1 ring-customBlue/20' : 'text-deepBlue hover:bg-[#F8FBFE]',
                    ].join(' ')
                  }
                >
                  {t('nav.partnerships')}
                </NavLink>
              </div>

              {!isLoading && (
                <div className="grid gap-2 border-t border-deepBlue/[0.07] pt-3">
                  {isAuthenticated && user ? (
                    <>
                      <div className="flex items-center gap-3 rounded-xl border border-deepBlue/[0.08] bg-[#F8FBFE] px-3 py-2">
                        <UserAvatar
                          user={user}
                          className="h-10 w-10 shrink-0 rounded-full bg-deepBlue text-sm text-white shadow-sm ring-1 ring-white/20"
                          textClassName="text-sm font-black text-white"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-deepBlue">{user.name}</p>
                          <p className="truncate text-xs text-deepBlue/50">{user.email}</p>
                        </div>
                      </div>
                        <Link
                        to="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm ${dashboardBtnClass}`}
                      >
                        <LayoutDashboard strokeWidth={2} className={dashboardIconClass} aria-hidden />
                        <span className="whitespace-nowrap">{t('nav.dashboard')}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout()
                          setMobileOpen(false)
                        }}
                        className="rounded-xl border border-customOrange/30 py-2.5 text-sm font-black text-customOrange"
                      >
                        {t('nav.logout')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setMobileOpen(false)}
                        className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm ${loginBtnClass}`}
                      >
                        <LogIn strokeWidth={2} className={loginIconClass} aria-hidden />
                        <span className="whitespace-nowrap">{t('nav.login')}</span>
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm ${dashboardBtnClass}`}
                      >
                        <LayoutDashboard strokeWidth={2} className={dashboardIconClass} aria-hidden />
                        <span className="whitespace-nowrap">{t('nav.dashboard')}</span>
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

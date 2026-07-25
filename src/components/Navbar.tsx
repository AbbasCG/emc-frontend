import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Building2,
  CalendarPlus,
  Check,
  ChevronDown,
  Globe,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Monitor,
  Sparkles,
  TrendingUp,
  User,
  UserCircle,
  Users,
  Waypoints,
  HeartHandshake,
  Handshake,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import MegaDropdown, { type MegaDropdownItem } from './nav/MegaDropdown'
import { useAuth } from '../contexts/AuthContext'
import { dropdownMotion, mobileMenuMotion } from '@/utils/animations'
import { routeMatchesPath } from '@/utils/routeMatch'
import { UserAvatar } from '@/components/UserAvatar'
import { LANGS } from '@/i18n'
import { useLanguage } from '@/i18n/useLanguage'

/**
 * M3 i18n: mega-menu items are defined by catalog key; labels/descriptions
 * live in src/i18n/locales/*.json under nav.<group>.items.<key>.
 */
type MegaItemDef = { href: string; key: string; icon: LucideIcon }

const ABOUT_ITEM_DEFS: readonly MegaItemDef[] = [
  { href: '/about', key: 'about', icon: Users },
  { href: '/impact', key: 'impact', icon: TrendingUp },
  { href: '/ar/team', key: 'team', icon: UserCircle },
  { href: '/departments', key: 'departments', icon: Building2 },
  { href: '/platform', key: 'platform', icon: Monitor },
]

const PROGRAMS_ITEM_DEFS: readonly MegaItemDef[] = [
  { href: '/courses', key: 'courses', icon: BookOpen },
  { href: '/workshops', key: 'workshops', icon: Sparkles },
  { href: '/learning-paths', key: 'learningPaths', icon: Waypoints },
  { href: '/tracks', key: 'tracks', icon: LayoutGrid },
  { href: '/instructors', key: 'instructors', icon: UserCircle },
]

const JOIN_ITEM_DEFS: readonly MegaItemDef[] = [
  { href: '/partnerships', key: 'partnerships', icon: Handshake },
  { href: '/signup', key: 'student', icon: UserCircle },
  { href: '/contact#trainer', key: 'trainer', icon: GraduationCap },
  { href: '/partnerships/apply', key: 'partner', icon: Handshake },
  { href: '/volunteer', key: 'volunteer', icon: HeartHandshake },
  { href: '/ambassador', key: 'ambassador', icon: Sparkles },
  { href: '/submit-workshop', key: 'submitWorkshop', icon: CalendarPlus },
  { href: '/contact', key: 'contact', icon: Mail },
]

function buildMegaItems(t: TFunction, group: 'about' | 'programs' | 'join', defs: readonly MegaItemDef[]): MegaDropdownItem[] {
  return defs.map(({ href, key, icon }) => ({
    href,
    icon,
    label: t(`nav.${group}.items.${key}.label`),
    description: t(`nav.${group}.items.${key}.description`),
  }))
}

type MegaId = 'about' | 'programs' | 'join'

const megaPrefixes: Record<MegaId, readonly string[]> = {
  about: ['/about', '/impact', '/ar/impact', '/team', '/ar/team', '/departments', '/platform'],
  programs: ['/courses', '/workshops', '/learning-paths', '/paths', '/tracks', '/programs', '/instructors'],
  join: ['/signup', '/contact', '/volunteer', '/partnerships', '/partnerships/apply', '/ambassador', '/submit-workshop'],
}

function pathActive(pathname: string, mega: MegaId): boolean {
  return megaPrefixes[mega].some((prefix) => routeMatchesPath(pathname, prefix))
}

const navLinkBase =
  'inline-flex min-h-[2.625rem] items-center rounded-xl px-3.5 py-2 text-[13px] font-semibold tracking-tight text-deepBlue transition-all duration-200 ease-emc-out hover:bg-customBlue/[0.06] hover:text-customBlue hover:shadow-emc-xs'
const navLinkActive =
  'bg-customBlue/[0.11] text-customBlue shadow-[inset_0_0_0_1px_rgba(0,119,182,0.35)] backdrop-blur-sm'

/** Lightweight secondary actions — center nav stays visually primary */
const loginBtnClass =
  'group/login inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-customBlue px-5 text-[13px] font-bold tracking-tight text-white shadow-[0_4px_18px_-4px_rgba(0,119,182,0.5)] transition-all duration-200 hover:bg-[#1a78a8] hover:shadow-[0_8px_28px_-6px_rgba(0,119,182,0.65)] active:scale-[0.98]'

const dashboardBtnClass =
  'group/nav inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-customBlue/[0.18] bg-gradient-to-br from-customBlue/[0.08] via-white to-deepBlue/[0.04] px-5 text-[13px] font-semibold tracking-tight text-deepBlue shadow-[0_1px_2px_rgba(12,42,75,0.05)] backdrop-blur-sm transition-colors duration-200 hover:border-customBlue/35 hover:from-customBlue/[0.12] hover:to-customBlue/[0.06] hover:text-deepBlue hover:shadow-[0_8px_22px_-14px_rgba(0,119,182,0.22)]'

const dashboardIconClass =
  'relative size-[15px] shrink-0 text-customBlue opacity-95 transition-colors duration-200 group-hover/nav:text-customBlue'

const loginIconClass =
  'relative size-[15px] shrink-0 text-white/85 transition-colors duration-200 group-hover/login:text-white'

export default function Navbar() {
  const { t } = useTranslation()
  const { lang, dir, setLang } = useLanguage()
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [openMega, setOpenMega] = useState<MegaId | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileGroup, setMobileGroup] = useState<MegaId | null>(null)

  const aboutItems = useMemo(() => buildMegaItems(t, 'about', ABOUT_ITEM_DEFS), [t])
  const programsItems = useMemo(() => buildMegaItems(t, 'programs', PROGRAMS_ITEM_DEFS), [t])
  const joinItems = useMemo(() => buildMegaItems(t, 'join', JOIN_ITEM_DEFS), [t])
  const currentLang = LANGS.find((l) => l.code === lang) ?? LANGS[0]

  const navRef = useRef<HTMLElement>(null)
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Collapse every open surface on navigation. Adjusted during render (react.dev
  // "adjusting state when a prop changes") so the new route never paints with the
  // previous route's menus still open.
  const [seenPath, setSeenPath] = useState(pathname)
  if (seenPath !== pathname) {
    setSeenPath(pathname)
    setOpenMega(null)
    setUserMenuOpen(false)
    setLangMenuOpen(false)
    setMobileOpen(false)
    setMobileGroup(null)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMega(null)
        setUserMenuOpen(false)
        setLangMenuOpen(false)
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
        setLangMenuOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function toggleMega(id: MegaId) {
    setOpenMega((m) => (m === id ? null : id))
    setUserMenuOpen(false)
    setLangMenuOpen(false)
  }

  return (
    <header
      ref={navRef}
      dir={dir}
      className={[
        'fixed inset-x-0 top-0 z-50 border-b transition-[box-shadow,border-color,background,backdrop-filter] duration-500 ease-emc-out',
        scrolled
          ? 'border-deepBlue/[0.085] bg-white/[0.9] shadow-emc-lg shadow-deepBlue/[0.06] ring-1 ring-deepBlue/[0.045] backdrop-blur-2xl backdrop-saturate-150'
          : 'border-deepBlue/[0.04] bg-white/[0.78] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/60',
      ].join(' ')}
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:h-[4.25rem] lg:px-8">
        <Link
          to="/"
          aria-label={t('nav.aria.homeLink')}
          className="relative z-20 flex shrink-0 items-center rounded-2xl p-1.5 ring-1 ring-transparent transition-all duration-200 ease-emc-out hover:bg-emcBg/90 hover:ring-customBlue/18 hover:shadow-emc-xs"
        >
          <img src="/brand/logos/logo_full_color.png" alt={t('brand.logoAlt')} className="h-10 w-auto sm:h-12 lg:h-[3.25rem]" width={180} height={52} loading="eager" fetchPriority="high" />
        </Link>

        <nav
          className="absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-center lg:flex"
          aria-label={t('nav.aria.mainMenu')}
        >
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-0.5 rounded-2xl border border-deepBlue/[0.065] bg-white/[0.55] px-2 py-1.5 shadow-emc-md shadow-deepBlue/[0.04] ring-1 ring-white/75 backdrop-blur-2xl backdrop-saturate-150">
            <NavLink to="/" end className={({ isActive }) => [navLinkBase, isActive ? navLinkActive : ''].join(' ')}>
              {t('nav.home')}
            </NavLink>

            <MegaDropdown
              label={t('nav.about.label')}
              items={aboutItems}
              isOpen={openMega === 'about'}
              onToggle={() => toggleMega('about')}
              isActive={pathActive(pathname, 'about')}
              pathname={pathname}
              locationHash={hash}
            />
            <MegaDropdown
              label={t('nav.programs.label')}
              items={programsItems}
              isOpen={openMega === 'programs'}
              onToggle={() => toggleMega('programs')}
              isActive={pathActive(pathname, 'programs')}
              pathname={pathname}
              locationHash={hash}
            />
            <MegaDropdown
              label={t('nav.join.label')}
              items={joinItems}
              isOpen={openMega === 'join'}
              onToggle={() => toggleMega('join')}
              isActive={pathActive(pathname, 'join')}
              pathname={pathname}
              locationHash={hash}
            />
          </div>
        </nav>

        <div className="relative z-20 hidden shrink-0 items-center gap-3 lg:flex">
          {!isLoading &&
            (isAuthenticated && user ? (
              <>
                <motion.span whileHover={{ opacity: 0.96 }} whileTap={{ scale: 0.987 }}>
                  <Link to="/dashboard" className={dashboardBtnClass}>
                    <LayoutDashboard strokeWidth={2} className={dashboardIconClass} aria-hidden />
                    <span className="whitespace-nowrap">{t('nav.auth.dashboard')}</span>
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
                      className={['transition-transform duration-300 ease-emc-out', userMenuOpen ? '-rotate-180 opacity-80' : 'opacity-55'].join(' ')}
                    />
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        variants={dropdownMotion}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute left-0 top-full z-50 mt-2.5 w-56 overflow-hidden rounded-2xl border border-deepBlue/[0.08] bg-white/[0.97] p-1.5 shadow-emc-lg ring-1 ring-white/80 backdrop-blur-2xl backdrop-saturate-150"
                        role="menu"
                      >
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-deepBlue transition-all duration-200 ease-emc-out hover:bg-customBlue/[0.06] hover:text-customBlue"
                        >
                          <LayoutDashboard size={16} />
                          {t('nav.auth.dashboard')}
                        </Link>
                        <Link
                          to="/dashboard/profile"
                          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-deepBlue transition-all duration-200 ease-emc-out hover:bg-customBlue/[0.06] hover:text-customBlue"
                        >
                          <User size={16} />
                          {t('nav.auth.profile')}
                        </Link>
                        <div className="my-1 border-t border-deepBlue/[0.06]" />
                        <button
                          type="button"
                          onClick={logout}
                          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-customOrange transition-all duration-200 ease-emc-out hover:bg-customOrange/[0.08]"
                        >
                          <LogOut size={16} />
                          {t('nav.auth.logout')}
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
                    <span className="whitespace-nowrap">{t('nav.auth.login')}</span>
                  </Link>
                </motion.span>
              </>
            ))}

          {/* M3: language switcher — trailing utility at the outer edge of the cluster */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setLangMenuOpen((v) => !v)
                setOpenMega(null)
                setUserMenuOpen(false)
              }}
              aria-expanded={langMenuOpen}
              aria-haspopup="menu"
              aria-label={t('nav.aria.changeLanguage')}
              className={[
                'flex h-11 items-center gap-1.5 rounded-2xl border px-3.5 text-[13px] font-semibold transition-all duration-200',
                langMenuOpen
                  ? 'border-customBlue/35 bg-customBlue/[0.08] text-customBlue shadow-emc-xs backdrop-blur-sm'
                  : 'border-deepBlue/[0.1] bg-white/60 text-deepBlue backdrop-blur-sm hover:border-customBlue/25 hover:bg-emcBg/90',
              ].join(' ')}
            >
              <Globe size={15} strokeWidth={2} className="shrink-0 text-customBlue opacity-95" aria-hidden />
              <span className="whitespace-nowrap">{currentLang.label}</span>
              <ChevronDown
                size={14}
                className={['transition-transform duration-300 ease-emc-out', langMenuOpen ? '-rotate-180 opacity-80' : 'opacity-55'].join(' ')}
              />
            </button>
            <AnimatePresence>
              {langMenuOpen && (
                <motion.div
                  variants={dropdownMotion}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute left-0 top-full z-50 mt-2.5 w-44 overflow-hidden rounded-2xl border border-deepBlue/[0.08] bg-white/[0.97] p-1.5 shadow-emc-lg ring-1 ring-white/80 backdrop-blur-2xl backdrop-saturate-150"
                  role="menu"
                >
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setLang(l.code)
                        setLangMenuOpen(false)
                      }}
                      className={[
                        'flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all duration-200 ease-emc-out',
                        l.code === lang
                          ? 'bg-customBlue/[0.08] text-customBlue'
                          : 'text-deepBlue hover:bg-customBlue/[0.06] hover:text-customBlue',
                      ].join(' ')}
                    >
                      {l.label}
                      {l.code === lang ? <Check size={14} strokeWidth={2.5} aria-hidden /> : null}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? t('nav.aria.closeMenu') : t('nav.aria.openMenu')}
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
            className="max-h-[min(88vh,600px)] overflow-y-auto border-t border-deepBlue/[0.07] bg-white/[0.97] backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
          >
            <div className="space-y-1.5 px-4 py-4">
              <NavLink
                to="/"
                end
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    'block rounded-2xl px-4 py-3.5 text-sm font-black',
                    isActive ? 'bg-customBlue/[0.1] text-customBlue ring-1 ring-customBlue/20' : 'text-deepBlue hover:bg-[#F8FBFE]',
                  ].join(' ')
                }
              >
                {t('nav.home')}
              </NavLink>

              {(
                [
                  ['about', t('nav.about.label'), aboutItems],
                  ['programs', t('nav.programs.label'), programsItems],
                  ['join', t('nav.join.label'), joinItems],
                ] as const
              ).map(([id, label, items]) => (
                <div
                  key={id}
                  className={[
                    'overflow-hidden rounded-2xl border bg-[#F8FBFE]/80 transition-all duration-200 ease-emc-out',
                    mobileGroup === id ? 'border-customBlue/20 shadow-emc-xs' : 'border-deepBlue/[0.08]',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => setMobileGroup((g) => (g === id ? null : id))}
                    aria-expanded={mobileGroup === id}
                    className={[
                      'flex w-full items-center justify-between px-4 py-3.5 text-sm font-black transition-colors duration-200 ease-emc-out',
                      mobileGroup === id ? 'text-customBlue' : 'text-deepBlue',
                    ].join(' ')}
                  >
                    {label}
                    <ChevronDown
                      size={16}
                      className={[
                        'transition-transform duration-300 ease-emc-out',
                        mobileGroup === id ? '-rotate-180 text-customBlue' : 'text-deepBlue/45',
                      ].join(' ')}
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
                              className="group flex gap-3 border-b border-deepBlue/[0.04] px-4 py-3.5 text-right transition-colors duration-200 ease-emc-out last:border-0 hover:bg-customBlue/[0.05]"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-deepBlue/[0.04] text-customBlue transition-all duration-200 ease-emc-out group-hover:bg-customBlue group-hover:text-white group-hover:shadow-emc-xs">
                                <Icon size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-deepBlue transition-colors duration-200 ease-emc-out group-hover:text-customBlue">{item.label}</p>
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

              {/* M3: language switcher (mobile) */}
              <div className="flex items-center gap-2 rounded-2xl border border-deepBlue/[0.08] bg-[#F8FBFE]/80 px-4 py-2.5">
                <Globe size={16} strokeWidth={2} className="shrink-0 text-customBlue" aria-hidden />
                <div className="flex flex-1 items-center justify-end gap-1.5" role="group" aria-label={t('nav.aria.changeLanguage')}>
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLang(l.code)}
                      aria-pressed={l.code === lang}
                      className={[
                        'rounded-xl px-3.5 py-2 text-[13px] font-black transition-colors duration-200 ease-emc-out',
                        l.code === lang
                          ? 'bg-customBlue text-white shadow-emc-xs'
                          : 'text-deepBlue hover:bg-customBlue/[0.08] hover:text-customBlue',
                      ].join(' ')}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {!isLoading && (
                <div className="grid gap-3 border-t border-deepBlue/[0.07] pt-4">
                  {isAuthenticated && user ? (
                    <>
                      <div className="flex items-center gap-3 rounded-2xl border border-deepBlue/[0.08] bg-[#F8FBFE] px-4 py-3">
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
                        className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm ${dashboardBtnClass}`}
                      >
                        <LayoutDashboard strokeWidth={2} className={dashboardIconClass} aria-hidden />
                        <span className="whitespace-nowrap">{t('nav.auth.dashboard')}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout()
                          setMobileOpen(false)
                        }}
                        className="rounded-2xl border border-customOrange/30 py-3.5 text-sm font-black text-customOrange"
                      >
                        {t('nav.auth.logout')}
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm ${loginBtnClass}`}
                    >
                      <LogIn strokeWidth={2} className={loginIconClass} aria-hidden />
                      <span className="whitespace-nowrap">{t('nav.auth.login')}</span>
                    </Link>
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

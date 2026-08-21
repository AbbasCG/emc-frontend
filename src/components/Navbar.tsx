import { memo, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  User,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { dropdownMotion, mobileMenuMotion } from '@/utils/animations'
import { UserAvatar } from '@/components/UserAvatar'
import SiteIndexPanel from '@/components/nav/SiteIndexPanel'
import { SITE_INDEX } from '@/components/nav/siteIndex'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { LANGS } from '@/i18n'
import { useLanguage } from '@/i18n/useLanguage'
import CommandPalette from '@/components/ai/CommandPalette'

/**
 * The bar carries «الرئيسية» and ONE «كل الأقسام» trigger; every other
 * destination lives in the site-index panel, grouped under four main sections
 * (تعلّم · المركز · انضم إلينا · خدمات ودعم). Founder's call: a single
 * unfolding column instead of loose links strung across the bar.
 */
const NAV_ITEMS = [{ href: '/', labelKey: 'nav.home', end: true }] as const

/* §1: no shadows on public surfaces — depth is carried by 1px hairlines (border/ring). */
const navLinkBase =
  'relative inline-flex min-h-[2.625rem] items-center px-1 py-2 text-[13.5px] font-bold tracking-tight text-ink-500 transition-colors duration-200 ease-emc-out hover:text-customBlue'
const navLinkActive = 'text-deepBlue emc-cta-line after:scale-x-100'

const navLinkDarkBase =
  'relative inline-flex min-h-[2.625rem] items-center px-1 py-2 text-[13.5px] font-bold tracking-tight transition-colors duration-200 ease-emc-out'
const navLinkDarkActive = 'text-white emc-cta-line after:scale-x-100'
const navLinkDarkIdle = 'text-white/70 hover:text-white'

/**
 * §1: orange is the primary-action colour and nothing else. It is spent once per
 * screen — here on «ابدأ رحلتك» — so every other header control stays in the sea
 * family or goes glass. Solid fill only; the fire family is never gradiented
 * into the sea family.
 */
const startJourneyBase =
  'group/start inline-flex items-center justify-center gap-2 rounded-2xl bg-customOrange px-5 font-bold tracking-tight text-white transition-colors duration-200 ease-emc-out hover:bg-ember'
const startJourneyClass = `${startJourneyBase} h-11 shrink-0 text-[13px]`
/** §1 mobile-first at 380px: the single primary action is a full-width button. */
const startJourneyMobileClass = `${startJourneyBase} h-12 w-full text-sm`

/** Lightweight secondary actions — the primary decision stays the orange CTA. */
const loginBtnClass =
  'group/login inline-flex h-11 items-center justify-center gap-2 px-2 text-[13px] font-bold tracking-tight text-ink-500 transition-colors duration-200 hover:text-customBlue'

const dashboardBtnClass =
  'group/nav inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-customBlue/[0.18] bg-white px-5 text-[13px] font-semibold tracking-tight text-deepBlue transition-colors duration-200 hover:border-customBlue/35 hover:bg-customBlue/[0.06]'

const dashboardIconClass = 'relative size-[15px] shrink-0 text-customBlue opacity-95'

const loginIconClass = 'relative size-[15px] shrink-0 opacity-80 transition-opacity duration-200 group-hover/login:opacity-100'

/* Over-dark (home hero) variants — the bar melts into the navy field; only the
   orange CTA keeps its fill so the single primary decision stays obvious. */
const loginBtnDarkClass =
  'group/login inline-flex h-11 items-center justify-center gap-2 px-2 text-[13px] font-bold tracking-tight text-white/75 transition-colors duration-200 hover:text-white'
const dashboardBtnDarkClass =
  'group/nav inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-[13px] font-semibold tracking-tight text-white backdrop-blur-sm transition-colors duration-200 hover:border-white/35 hover:bg-white/15'
const utilityDarkChip =
  'border-white/20 bg-white/10 text-white backdrop-blur-md hover:border-white/35 hover:bg-white/15'

function Navbar() {
  const { t } = useTranslation()
  const { lang, dir, setLang } = useLanguage()
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [indexOpen, setIndexOpen] = useState(false)
  const [openSection, setOpenSection] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const currentLang = LANGS.find((l) => l.code === lang) ?? LANGS[0]

  const navRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  /**
   * Adaptive shell: over the home page's dark cinematic hero the bar melts into
   * the field (dark glass, white items, white logo) and turns into the familiar
   * light glass once the user scrolls. Light-hero pages keep the light shell in
   * both states.
   */
  const overDark = pathname === '/' && !scrolled

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
    setUserMenuOpen(false)
    setLangMenuOpen(false)
    setIndexOpen(false)
    setMobileOpen(false)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
        setLangMenuOpen(false)
        setIndexOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setUserMenuOpen(false)
        setLangMenuOpen(false)
        setIndexOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <header
      ref={navRef}
      dir={dir}
      className={[
        'fixed inset-x-0 top-0 z-50 border-b transition-[border-color,background,backdrop-filter] duration-500 ease-emc-out',
        overDark
          ? 'border-white/[0.08] bg-deepBlue/25 backdrop-blur-md'
          : scrolled
            ? 'border-b border-line bg-white/80 backdrop-blur-xl backdrop-saturate-150'
            : 'border-b border-line/70 bg-white/70 backdrop-blur-lg backdrop-saturate-150',
      ].join(' ')}
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:h-[4.25rem] lg:px-8">
        {/* §1: the logo is final and appears ONCE site-wide here. It is never
            recoloured, redrawn or stretched; only the approved colour/white
            lockups are swapped for contrast. */}
        <Link
          to="/"
          aria-label={t('nav.aria.homeLink')}
          className={[
            'relative z-20 flex shrink-0 items-center rounded-2xl p-1.5 ring-1 ring-transparent transition-colors duration-200 ease-emc-out',
            overDark ? 'hover:bg-white/10 hover:ring-white/20' : 'hover:bg-paper hover:ring-customBlue/20',
          ].join(' ')}
        >
          <img src={overDark ? '/brand/logos/logo_full_white.png' : '/brand/logos/logo_full_color.png'} alt={t('brand.logoAlt')} className="h-10 w-auto sm:h-12 lg:h-[3.25rem]" width={180} height={52} loading="eager" fetchPriority="high" />
        </Link>

        <nav
          className="hidden flex-1 items-center justify-center gap-3 px-4 lg:flex"
          aria-label={t('nav.aria.mainMenu')}
        >
          <div
            className={[
              'pointer-events-auto flex items-center justify-center gap-6',
            ].join(' ')}
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                className={({ isActive }) =>
                  overDark
                    ? [navLinkDarkBase, isActive ? navLinkDarkActive : navLinkDarkIdle].join(' ')
                    : [navLinkBase, isActive ? navLinkActive : ''].join(' ')
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}

            {/* The four main sections sit on the bar; each opens the index panel
                already showing its own pages. */}
            {SITE_INDEX.map((group, i) => {
              const isOpen = indexOpen && openSection === i
              return (
                <button
                  key={group.title}
                  type="button"
                  onClick={() => {
                    setOpenSection(i)
                    setIndexOpen(!(indexOpen && openSection === i))
                    setUserMenuOpen(false)
                    setLangMenuOpen(false)
                  }}
                  onMouseEnter={() => {
                    if (indexOpen) setOpenSection(i)
                  }}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  className={[
                    overDark ? navLinkDarkBase : navLinkBase,
                    overDark
                      ? isOpen
                        ? navLinkDarkActive
                        : navLinkDarkIdle
                      : isOpen
                        ? navLinkActive
                        : '',
                    'gap-1',
                  ].join(' ')}
                >
                  {group.title}
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-300 ease-emc-out ${isOpen ? '-rotate-180' : 'opacity-50'}`}
                    aria-hidden
                  />
                </button>
              )
            })}
          </div>

          {/* The one primary decision on every public screen. */}
          <Link to="/learn" className={startJourneyClass}>
            <span className="whitespace-nowrap">{t('nav.startJourney')}</span>
            <ArrowLeftIcon size={14} className="shrink-0 opacity-90" />
          </Link>
        </nav>

        <div className="relative z-20 hidden shrink-0 items-center gap-3 lg:flex">
          {/* Quick Search Ctrl + K trigger button */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={[
              'flex h-11 items-center gap-2 px-2 text-[13px] font-bold transition-colors duration-200',
              overDark ? 'text-white/70 hover:text-white' : 'text-ink-500 hover:text-customBlue',
            ].join(' ')}
            aria-label="البحث السريع (Ctrl + K)"
          >
            <Search size={15} className={overDark ? 'shrink-0 text-ice' : 'text-customBlue shrink-0'} />
            <span className="whitespace-nowrap">بحث سريع</span>
            <kbd
              className={[
                'rounded-lg border px-2 py-0.5 font-latin text-[10px] font-extrabold',
                overDark ? 'border-white/20 bg-white/10 text-white/70' : 'border-line bg-paper2 text-ink-400',
              ].join(' ')}
            >
              Ctrl K
            </kbd>
          </button>

          {/* Never an empty gap: cached-user sessions render the dashboard cluster
              instantly (background /auth/me corrects later); a token with no cached
              user shows a placeholder chip instead of nothing; guests get the login
              button immediately (isLoading is false without a token). */}
          {isLoading && !user ? (
            <span
              aria-hidden
              className={[
                'h-11 w-28 animate-pulse rounded-2xl',
                overDark ? 'border border-white/15 bg-white/10' : 'border border-line bg-paper2',
              ].join(' ')}
            />
          ) : (
            (isAuthenticated && user ? (
              <>
                <motion.span whileHover={{ opacity: 0.96 }} whileTap={{ scale: 0.987 }}>
                  <Link to="/dashboard" className={overDark ? dashboardBtnDarkClass : dashboardBtnClass}>
                    <LayoutDashboard strokeWidth={2} className={overDark ? 'relative size-[15px] shrink-0 text-ice' : dashboardIconClass} aria-hidden />
                    <span className="whitespace-nowrap">{t('nav.auth.dashboard')}</span>
                  </Link>
                </motion.span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    aria-expanded={userMenuOpen}
                    className={[
                      'flex h-11 items-center gap-2 rounded-2xl border px-3.5 text-[13px] font-semibold transition-colors duration-200',
                      userMenuOpen
                        ? 'border-customBlue/35 bg-customBlue/[0.08] text-customBlue backdrop-blur-sm'
                        : 'border-line bg-white/60 text-deepBlue backdrop-blur-sm hover:border-customBlue/25 hover:bg-paper',
                    ].join(' ')}
                  >
                    <UserAvatar
                      user={user}
                      className="h-8 w-8 shrink-0 rounded-full bg-deepBlue/[0.9] text-xs text-white ring-1 ring-white/20"
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
                        className="absolute left-0 top-full z-50 mt-2.5 w-56 overflow-hidden rounded-2xl border border-line bg-white/[0.97] p-1.5 ring-1 ring-line backdrop-blur-2xl backdrop-saturate-150"
                        role="menu"
                      >
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-deepBlue transition-colors duration-200 ease-emc-out hover:bg-customBlue/[0.06] hover:text-customBlue"
                        >
                          <LayoutDashboard size={16} />
                          {t('nav.auth.dashboard')}
                        </Link>
                        <Link
                          to="/dashboard/profile"
                          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-deepBlue transition-colors duration-200 ease-emc-out hover:bg-customBlue/[0.06] hover:text-customBlue"
                        >
                          <User size={16} />
                          {t('nav.auth.profile')}
                        </Link>
                        <div className="my-1 border-t border-line" />
                        <button
                          type="button"
                          onClick={logout}
                          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-ink-400 transition-colors duration-200 ease-emc-out hover:bg-paper2 hover:text-deepBlue"
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
              <motion.span whileHover={{ opacity: 0.96 }} whileTap={{ scale: 0.987 }}>
                <Link to="/login" className={overDark ? loginBtnDarkClass : loginBtnClass}>
                  <LogIn strokeWidth={2} className={loginIconClass} aria-hidden />
                  <span className="whitespace-nowrap">{t('nav.auth.login')}</span>
                </Link>
              </motion.span>
            ))
          )}

          {/* M3: language switcher trailing utility at the outer edge of the cluster */}
          {LANGS.length > 1 && <div className="relative">
            <button
              type="button"
              onClick={() => {
                setLangMenuOpen((v) => !v)
                setUserMenuOpen(false)
              }}
              aria-expanded={langMenuOpen}
              aria-haspopup="menu"
              aria-label={t('nav.aria.changeLanguage')}
              className={[
                'flex h-11 items-center gap-1.5 px-2 text-[13px] font-semibold transition-colors duration-200',
                overDark
                  ? langMenuOpen
                    ? 'text-white'
                    : 'text-white/70 hover:text-white'
                  : langMenuOpen
                    ? 'text-customBlue'
                    : 'text-ink-500 hover:text-customBlue',
              ].join(' ')}
            >
              <Globe size={15} strokeWidth={2} className={overDark ? 'shrink-0 text-ice' : 'shrink-0 text-customBlue opacity-95'} aria-hidden />
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
                  className="absolute left-0 top-full z-50 mt-2.5 w-44 overflow-hidden rounded-2xl border border-line bg-white/[0.97] p-1.5 ring-1 ring-line backdrop-blur-2xl backdrop-saturate-150"
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
                        'flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors duration-200 ease-emc-out',
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
          </div>}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="البحث السريع"
            className={[
              'flex h-11 w-11 items-center justify-center rounded-xl border transition-colors',
              overDark
                ? utilityDarkChip
                : 'border-line bg-white/70 text-customBlue backdrop-blur-md hover:border-customBlue/25 hover:bg-customBlue/[0.08]',
            ].join(' ')}
          >
            <Search size={20} />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? t('nav.aria.closeMenu') : t('nav.aria.openMenu')}
            className={[
              'flex h-11 w-11 items-center justify-center rounded-xl border transition-colors',
              overDark
                ? utilityDarkChip
                : 'border-line bg-white/70 text-deepBlue backdrop-blur-md hover:border-customBlue/25 hover:bg-paper',
            ].join(' ')}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Desktop site index the destinations the old mega-menus carried, in one
          editorial sheet instead of four dropdowns. */}
      <AnimatePresence>
        {indexOpen && (
          <div className="hidden lg:block">
            <SiteIndexPanel
              dark={overDark}
              activeIndex={openSection}
              onActiveIndexChange={setOpenSection}
              onClose={() => setIndexOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            variants={mobileMenuMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-h-[min(88vh,600px)] overflow-y-auto border-t border-line bg-white/[0.97] backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
          >
            <div className="space-y-1.5 px-4 py-4">
              {/* §2: the same five flat items the drawer mirrors the bar, no accordions. */}
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    [
                      'block rounded-2xl px-4 py-3.5 text-sm font-black',
                      isActive ? 'bg-customBlue/[0.1] text-customBlue ring-1 ring-customBlue/20' : 'text-deepBlue hover:bg-paper',
                    ].join(' ')
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}

              {/* §1 mobile-first: the primary action is full width. */}
              <Link
                to="/learn"
                onClick={() => setMobileOpen(false)}
                className={startJourneyMobileClass}
              >
                <span className="whitespace-nowrap">{t('nav.startJourney')}</span>
                <ArrowLeftIcon size={15} className="shrink-0 opacity-90" />
              </Link>

              {/* Site index on mobile the same destinations as the desktop sheet,
                  so a phone visitor never loses a page the old drawer reached. */}
              {SITE_INDEX.map((group) => (
                <div key={group.title} className="pt-3">
                  <p className="px-4 pb-1 text-[11px] font-black tracking-[0.14em] text-ocean">
                    {group.title}
                  </p>
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block border-b border-line px-4 py-3 text-sm font-bold text-ink-700 last:border-b-0 hover:bg-paper"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ))}

              {/* M3: language switcher (mobile) */}
              {LANGS.length > 1 && <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper px-4 py-2.5">
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
                          ? 'bg-customBlue text-white'
                          : 'text-deepBlue hover:bg-customBlue/[0.08] hover:text-customBlue',
                      ].join(' ')}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>}

              {isLoading && !user ? (
                <div className="grid gap-3 border-t border-line pt-4">
                  <span aria-hidden className="h-12 w-full animate-pulse rounded-2xl border border-line bg-paper2" />
                </div>
              ) : (
                <div className="grid gap-3 border-t border-line pt-4">
                  {isAuthenticated && user ? (
                    <>
                      <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3">
                        <UserAvatar
                          user={user}
                          className="h-10 w-10 shrink-0 rounded-full bg-deepBlue text-sm text-white ring-1 ring-white/20"
                          textClassName="text-sm font-black text-white"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-deepBlue">{user.name}</p>
                          <p className="truncate text-xs text-ink-400">{user.email}</p>
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
                        className="rounded-2xl border border-line py-3.5 text-sm font-black text-ink-400 transition-colors hover:text-deepBlue"
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
      <CommandPalette
        open={searchOpen}
        onOpen={() => setSearchOpen(true)}
        onClose={() => setSearchOpen(false)}
      />
    </header>
  )
}

/**
 * M5.E: Navbar takes no props, so memo() skips re-renders triggered by
 * ancestors re-rendering. Context updates it consumes (auth, language,
 * router location) still propagate normally.
 */
export default memo(Navbar)

import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Building2,
  CalendarPlus,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  LogIn,
  LogOut,
  Mail,
  MapPinned,
  Menu,
  Monitor,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User,
  UserCircle,
  Users,
  Waypoints,
  HeartHandshake,
  Handshake,
  X,
} from 'lucide-react'
import logo from '../assets/logo.png'
import MegaDropdown, { type MegaDropdownItem } from './nav/MegaDropdown'
import { useAuth } from '../contexts/AuthContext'
import { dropdownMotion, mobileMenuMotion } from '@/utils/animations'
import { routeMatchesPath } from '@/utils/routeMatch'
import { UserAvatar } from '@/components/UserAvatar'
import CommandPalette from '@/components/ai/CommandPalette'

const aboutItems: MegaDropdownItem[] = [
  { href: '/about', label: 'من نحن', description: 'تعريف بالمنصة وأسلوب عملها', icon: Users },
  { href: '/about#vision-mission', label: 'الرؤية والرسالة', description: 'ما نسعى إليه وكيف نخدم المتعلم', icon: Target },
  { href: '/about#roadmap', label: 'خارطة الطريق', description: 'مراحل تطوير المنظومة والأولويات', icon: MapPinned },
  { href: '/about#leadership', label: 'رسالة القيادة', description: 'التزام مؤسسي بالجودة والشفافية', icon: Sparkles },
  { href: '/impact', label: 'الأثر والإنجازات', description: 'اتجاهات أثر واقعية وشفافة', icon: TrendingUp },
  { href: '/ar/team', label: 'الفريق', description: 'الهيكل والأدوار والقيم', icon: UserCircle },
]

const programsItems: MegaDropdownItem[] = [
  { href: '/courses', label: 'البرامج والدورات', description: 'استعرض البرامج وسجّل مباشرة', icon: BookOpen },
  { href: '/workshops', label: 'الورش', description: 'ورش تدريبية قصيرة ومجتمعية', icon: Sparkles },
  { href: '/learning-paths', label: 'مسارات التعلم', description: 'مسارات تعليمية مترابطة مع شهادات', icon: Waypoints },
  { href: '/programs', label: 'البرامج', description: 'عرض البرامج والمسارات المؤسسية', icon: Layers },
  { href: '/tracks', label: 'المجالات والمحاور', description: 'المجالات الاثنا عشر والمحاور التفصيلية', icon: LayoutGrid },
  { href: '/instructors', label: 'المدربون', description: 'تعرّف على خبراء التدريب', icon: UserCircle },
  { href: '/submit-workshop', label: 'تقديم ورشة', description: 'طلب ورشة أو برنامج عبر النموذج الرسمي', icon: CalendarPlus },
]

const centerItems: MegaDropdownItem[] = [
  { href: '/departments', label: 'الإدارات', description: 'الهيكل التنظيمي لـ EMC', icon: Building2 },
  { href: '/departments#governance', label: 'الحوكمة والجودة', description: 'سياسات الجودة والامتثال', icon: ShieldCheck },
  { href: '/platform', label: 'المنصة', description: 'التجربة الرقمية والخدمات', icon: Monitor },
]

const joinItems: MegaDropdownItem[] = [
  { href: '/signup', label: 'انضم كطالب', description: 'إنشاء حساب للتعلّم والتسجيل في البرامج', icon: UserCircle },
  { href: '/contact#trainer', label: 'انضم كمدرب', description: 'تواصل للانضمام كمدّرب مع EMC', icon: GraduationCap },
  { href: '/partnerships/apply', label: 'انضم كشريك', description: 'تقديم طلب شراكة مؤسسية أو خدمية', icon: Handshake },
  { href: '/volunteer', label: 'انضم كمتطوّع', description: 'شارك مهاراتك وفق أطر EMC التطوعية', icon: HeartHandshake },
  { href: '/ambassador', label: 'سفير التحول الرقمي', description: 'برنامج سفراء EMC في الجامعات العربية', icon: Sparkles },
  { href: '/contact', label: 'تواصل معنا', description: 'قنوات التواصل والاستفسارات العامّة', icon: Mail },
]

type MegaId = 'about' | 'programs' | 'center' | 'join'

const megaPrefixes: Record<MegaId, readonly string[]> = {
  about: ['/about', '/impact', '/ar/impact', '/team', '/ar/team'],
  programs: ['/courses', '/workshops', '/learning-paths', '/paths', '/tracks', '/programs', '/instructors', '/submit-workshop'],
  center: ['/departments', '/platform'],
  join: ['/signup', '/contact', '/volunteer', '/partnerships/apply', '/ambassador'],
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
  'group/login inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-customBlue px-5 text-[13px] font-bold tracking-tight text-white shadow-[0_4px_18px_-4px_rgba(38,145,194,0.5)] transition-all duration-200 hover:bg-[#1a78a8] hover:shadow-[0_8px_28px_-6px_rgba(38,145,194,0.65)] active:scale-[0.98]'

const dashboardBtnClass =
  'group/nav inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-customBlue/[0.18] bg-gradient-to-br from-customBlue/[0.08] via-white to-deepBlue/[0.04] px-5 text-[13px] font-semibold tracking-tight text-deepBlue shadow-[0_1px_2px_rgba(34,51,74,0.05)] backdrop-blur-sm transition-colors duration-200 hover:border-customBlue/35 hover:from-customBlue/[0.12] hover:to-customBlue/[0.06] hover:text-deepBlue hover:shadow-[0_8px_22px_-14px_rgba(38,145,194,0.22)]'

const dashboardIconClass =
  'relative size-[15px] shrink-0 text-customBlue opacity-95 transition-colors duration-200 group-hover/nav:text-customBlue'

const loginIconClass =
  'relative size-[15px] shrink-0 text-white/85 transition-colors duration-200 group-hover/login:text-white'

export default function Navbar() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [openMega, setOpenMega] = useState<MegaId | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileGroup, setMobileGroup] = useState<MegaId | null>(null)

  const navRef = useRef<HTMLElement>(null)
  const { pathname, hash } = useLocation()

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
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      } else if (e.key === 'Escape') {
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
      dir="rtl"
      className={[
        'fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-emc-out',
        scrolled
          ? 'border-b border-white/40 bg-white/80 shadow-lg shadow-deepBlue/[0.04] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-deepBlue/[0.03]'
          : 'border-b border-white/20 bg-white/70 backdrop-blur-lg backdrop-saturate-150 ring-1 ring-white/50',
      ].join(' ')}
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:h-[4.25rem] lg:px-8">
        <Link
          to="/"
          className="relative z-20 flex shrink-0 items-center rounded-2xl p-1 transition-all duration-200 hover:bg-customBlue/[0.06] hover:scale-[1.02]"
        >
          <img src={logo} alt="EMC" className="h-10 w-auto sm:h-12 lg:h-[3.25rem]" width={180} height={52} loading="eager" fetchPriority="high" />
        </Link>

        <nav
          className="hidden flex-1 items-center justify-center px-4 lg:flex"
          aria-label="القائمة الرئيسية"
        >
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/50 bg-white/60 p-1.5 shadow-md shadow-deepBlue/[0.03] ring-1 ring-white/80 backdrop-blur-xl">
            <NavLink to="/" end className={({ isActive }) => [navLinkBase, isActive ? navLinkActive : ''].join(' ')}>
              الرئيسية
            </NavLink>

            <MegaDropdown
              label="عن EMC"
              items={aboutItems}
              isOpen={openMega === 'about'}
              onToggle={() => toggleMega('about')}
              isActive={pathActive(pathname, 'about')}
              pathname={pathname}
              locationHash={hash}
            />
            <MegaDropdown
              label="البرامج"
              items={programsItems}
              isOpen={openMega === 'programs'}
              onToggle={() => toggleMega('programs')}
              isActive={pathActive(pathname, 'programs')}
              pathname={pathname}
              locationHash={hash}
            />
            <MegaDropdown
              label="المركز"
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
              الشراكات
            </NavLink>

            <MegaDropdown
              label="انضم إلينا"
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
          {/* Quick Search Ctrl + K trigger button */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-11 items-center gap-2.5 rounded-2xl border border-deepBlue/[0.1] bg-white/80 px-4 text-[13px] font-bold text-deepBlue shadow-sm backdrop-blur-md transition-all duration-200 hover:border-customBlue/35 hover:bg-customBlue/[0.06] hover:text-customBlue"
            aria-label="البحث السريع (Ctrl + K)"
          >
            <Search size={15} className="text-customBlue shrink-0" />
            <span className="whitespace-nowrap">بحث سريع</span>
            <kbd className="rounded-lg border border-slate-200/90 bg-slate-100/90 px-2 py-0.5 font-latin text-[10px] font-extrabold text-slate-500 shadow-inner">
              Ctrl K
            </kbd>
          </button>

          {!isLoading &&
            (isAuthenticated && user ? (
              <>
                <motion.span whileHover={{ opacity: 0.96 }} whileTap={{ scale: 0.987 }}>
                  <Link to="/dashboard" className={dashboardBtnClass}>
                    <LayoutDashboard strokeWidth={2} className={dashboardIconClass} aria-hidden />
                    <span className="whitespace-nowrap">لوحة التحكم</span>
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
                          لوحة التحكم
                        </Link>
                        <Link
                          to="/dashboard/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-deepBlue transition hover:bg-[#F8FBFE]"
                        >
                          <User size={16} />
                          الملف الشخصي
                        </Link>
                        <div className="my-1 border-t border-deepBlue/[0.06]" />
                        <button
                          type="button"
                          onClick={logout}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-customOrange transition hover:bg-customOrange/[0.08]"
                        >
                          <LogOut size={16} />
                          تسجيل الخروج
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
                    <span className="whitespace-nowrap">تسجيل الدخول</span>
                  </Link>
                </motion.span>
              </>
            ))}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="البحث السريع"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-deepBlue/[0.1] bg-white/70 text-customBlue shadow-emc-xs backdrop-blur-md transition hover:border-customBlue/25 hover:bg-customBlue/[0.08]"
          >
            <Search size={20} />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-deepBlue/[0.1] bg-white/70 text-deepBlue shadow-emc-xs backdrop-blur-md transition hover:border-customBlue/25 hover:bg-emcBg/90"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            variants={mobileMenuMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-h-[min(88vh,600px)] overflow-y-auto border-t border-deepBlue/[0.07] bg-white/98 backdrop-blur-xl lg:hidden"
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
                الرئيسية
              </NavLink>

              {(
                [
                  ['about', 'عن EMC', aboutItems],
                  ['programs', 'البرامج', programsItems],
                  ['center', 'المركز', centerItems],
                  ['join', 'انضم إلينا', joinItems],
                ] as const
              ).map(([id, label, items]) => (
                <div key={id} className="overflow-hidden rounded-2xl border border-deepBlue/[0.08] bg-[#F8FBFE]/80">
                  <button
                    type="button"
                    onClick={() => setMobileGroup((g) => (g === id ? null : id))}
                    className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-black text-deepBlue"
                  >
                    {label}
                    <ChevronDown
                      size={16}
                      className={['text-deepBlue/45 transition-transform', mobileGroup === id ? '-rotate-180' : ''].join(' ')}
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
                              className="flex gap-3 border-b border-deepBlue/[0.04] px-4 py-3.5 text-right last:border-0 hover:bg-customBlue/[0.05]"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-deepBlue/[0.04] text-customBlue">
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

              <NavLink
                to="/partnerships"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    'block rounded-2xl px-4 py-3.5 text-sm font-black',
                    isActive ? 'bg-customBlue/[0.1] text-customBlue ring-1 ring-customBlue/20' : 'text-deepBlue hover:bg-[#F8FBFE]',
                  ].join(' ')
                }
              >
                الشراكات
              </NavLink>

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
                        <span className="whitespace-nowrap">لوحة التحكم</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout()
                          setMobileOpen(false)
                        }}
                        className="rounded-2xl border border-customOrange/30 py-3.5 text-sm font-black text-customOrange"
                      >
                        تسجيل الخروج
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm ${loginBtnClass}`}
                    >
                      <LogIn strokeWidth={2} className={loginIconClass} aria-hidden />
                      <span className="whitespace-nowrap">تسجيل الدخول</span>
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

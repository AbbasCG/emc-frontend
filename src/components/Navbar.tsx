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
  HeartHandshake,
  X,
} from 'lucide-react'
import logo from '../assets/logo.png'
import MegaDropdown, { type MegaDropdownItem } from './nav/MegaDropdown'
import { useAuth } from '../contexts/AuthContext'
import { dropdownMotion, mobileMenuMotion } from '@/utils/animations'
import { routeMatchesPath } from '@/utils/routeMatch'

const aboutItems: MegaDropdownItem[] = [
  { href: '/about', label: 'من نحن', description: 'تعريف بالمنصة وأسلوب عملها', icon: Users },
  { href: '/about#vision-mission', label: 'الرؤية والرسالة', description: 'ما نسعى إليه وكيف نخدم المتعلم', icon: Target },
  { href: '/about#roadmap', label: 'خارطة الطريق', description: 'مراحل تطوير المنظومة والأولويات', icon: MapPinned },
  { href: '/about#leadership', label: 'رسالة القيادة', description: 'التزام مؤسسي بالجودة والشفافية', icon: Sparkles },
  { href: '/impact', label: 'الأثر والإنجازات', description: 'اتجاهات أثر واقعية وشفافة', icon: TrendingUp },
  { href: '/team', label: 'الفريق', description: 'الهيكل والأدوار والقيم', icon: UserCircle },
]

const programsItems: MegaDropdownItem[] = [
  { href: '/courses', label: 'البرامج والدورات', description: 'تصفح الكتالوج والتسجيل', icon: BookOpen },
  { href: '/programs', label: 'البرامج', description: 'عرض البرامج والمسارات المؤسسية', icon: Layers },
  { href: '/paths', label: 'المسارات', description: 'مسارات تعلم مترابطة', icon: Waypoints },
  { href: '/themes', label: 'الثيمات', description: 'اثنا عشر مجالاً للتعلم', icon: LayoutGrid },
  { href: '/tracks', label: 'المحاور', description: 'محاور تعليمية تفصيلية', icon: Sparkles },
  { href: '/instructors', label: 'المدربون', description: 'تعرّف على خبراء التدريب', icon: UserCircle },
]

const centerItems: MegaDropdownItem[] = [
  { href: '/departments', label: 'الإدارات', description: 'الهيكل التنظيمي لـ EMC', icon: Building2 },
  { href: '/departments#governance', label: 'الحوكمة والجودة', description: 'سياسات الجودة والامتثال', icon: ShieldCheck },
  { href: '/platform', label: 'المنصة', description: 'التجربة الرقمية والخدمات', icon: Monitor },
]

const joinItems: MegaDropdownItem[] = [
  { href: '/volunteer', label: 'التطوع', description: 'انضم كمساهم في البرامج', icon: HeartHandshake },
  { href: '/submit-workshop', label: 'تقديم ورشة', description: 'نموذج رسمي لطلب ورشة أو برنامج', icon: CalendarPlus },
  { href: '/contact#trainer', label: 'كن مدرباً', description: 'تواصل للانضمام كمدرب معتمد', icon: GraduationCap },
]

type MegaId = 'about' | 'programs' | 'center' | 'join'

const megaPrefixes: Record<MegaId, readonly string[]> = {
  about: ['/about', '/impact', '/team'],
  programs: ['/courses', '/paths', '/themes', '/tracks', '/programs', '/instructors'],
  center: ['/departments', '/platform'],
  join: ['/volunteer', '/submit-workshop'],
}

function pathActive(pathname: string, mega: MegaId): boolean {
  return megaPrefixes[mega].some((prefix) => routeMatchesPath(pathname, prefix))
}

const navLinkBase =
  'rounded-2xl px-4 py-2.5 text-[13px] font-bold tracking-tight text-deepBlue transition-all duration-200 hover:bg-customBlue/[0.06] hover:text-customBlue'
const navLinkActive =
  'bg-customBlue/[0.09] text-customBlue shadow-[inset_0_0_0_1px_rgba(38,145,201,0.22)]'

export default function Navbar() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [openMega, setOpenMega] = useState<MegaId | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? '؟'

  const joinCtaActive = pathActive(pathname, 'join')

  return (
    <header
      ref={navRef}
      dir="rtl"
      className={[
        'fixed inset-x-0 top-0 z-50 border-b transition-[box-shadow,border-color,background] duration-300',
        scrolled
          ? 'border-deepBlue/[0.08] bg-white/94 shadow-[0_14px_48px_-18px_rgba(15,42,67,0.18)] backdrop-blur-xl'
          : 'border-transparent bg-white/88 backdrop-blur-lg',
      ].join(' ')}
    >
      <div className="relative mx-auto flex min-h-[4.75rem] max-w-[1520px] items-center justify-between gap-4 px-4 sm:px-6 lg:min-h-[5rem] lg:gap-8 lg:px-10">
        <Link
          to="/"
          className="relative z-20 flex shrink-0 items-center rounded-2xl p-1.5 ring-deepBlue/0 transition hover:bg-[#F8FBFE] hover:ring-1 hover:ring-customBlue/15"
        >
          <img src={logo} alt="EMC" className="h-10 w-auto sm:h-[2.75rem]" />
        </Link>

        <nav
          className="absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-center lg:flex"
          aria-label="القائمة الرئيسية"
        >
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-[1.35rem] border border-deepBlue/[0.06] bg-white/75 px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_18px_-10px_rgba(15,42,67,0.12)] backdrop-blur-xl">
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

            <NavLink
              to="/contact"
              className={({ isActive }) => [navLinkBase, isActive ? navLinkActive : ''].join(' ')}
            >
              تواصل معنا
            </NavLink>
          </div>
        </nav>

        <div className="relative z-20 hidden items-center gap-2.5 lg:flex">
          <Link
            to="/volunteer"
            onClick={() => setOpenMega(null)}
            className={[
              'inline-flex items-center justify-center rounded-2xl border-2 px-4 py-2.5 text-[13px] font-black tracking-tight transition-all duration-200 ease-emc-out',
              joinCtaActive
                ? 'border-customOrange bg-customOrange/[0.1] text-deepBlue shadow-[inset_0_0_0_1px_rgba(247,148,29,0.25)]'
                : 'border-customOrange/85 bg-white text-deepBlue hover:-translate-y-px hover:border-customOrange hover:bg-customOrange/[0.07] hover:shadow-[0_10px_24px_-12px_rgba(236,148,60,0.5)]',
            ].join(' ')}
          >
            انضم إلينا
          </Link>

          {!isLoading &&
            (isAuthenticated && user ? (
              <>
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-customBlue to-[#1B6489] px-5 py-2.5 text-[13px] font-black text-white shadow-[0_12px_30px_-12px_rgba(38,145,201,0.6)] transition-all duration-200 ease-emc-out hover:-translate-y-px hover:shadow-[0_18px_36px_-12px_rgba(38,145,201,0.7)]"
                >
                  <LayoutDashboard size={17} strokeWidth={2.25} className="transition group-hover:scale-110" />
                  لوحة التحكم
                </Link>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen((v) => !v)
                      setOpenMega(null)
                    }}
                    aria-expanded={userMenuOpen}
                    className={[
                      'flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-[13px] font-bold transition-all duration-200',
                      userMenuOpen
                        ? 'border-customBlue/35 bg-customBlue/[0.07] text-customBlue'
                        : 'border-deepBlue/10 text-deepBlue hover:border-customBlue/25 hover:bg-[#F8FBFE]',
                    ].join(' ')}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-deepBlue text-xs font-black text-white">
                      {userInitial}
                    </span>
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
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-deepBlue/12 bg-white px-4 py-2.5 text-[13px] font-black text-deepBlue transition-all duration-200 ease-emc-out hover:-translate-y-px hover:border-customBlue/30 hover:bg-[#F8FBFE] hover:text-customBlue hover:shadow-emc-xs"
                >
                  <LogIn size={17} strokeWidth={2.25} />
                  دخول
                </Link>
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-customBlue to-[#1B6489] px-5 py-2.5 text-[13px] font-black text-white shadow-[0_12px_30px_-12px_rgba(38,145,201,0.6)] transition-all duration-200 ease-emc-out hover:-translate-y-px hover:shadow-[0_18px_36px_-12px_rgba(38,145,201,0.7)]"
                >
                  <LayoutDashboard size={17} strokeWidth={2.25} className="transition group-hover:scale-110" />
                  لوحة التحكم
                </Link>
              </>
            ))}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-deepBlue/10 text-deepBlue transition hover:bg-[#F8FBFE] lg:hidden"
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
            className="max-h-[min(88vh,600px)] overflow-y-auto border-t border-deepBlue/[0.07] bg-white lg:hidden"
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
              <NavLink
                to="/contact"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    'block rounded-2xl px-4 py-3.5 text-sm font-black',
                    isActive ? 'bg-customBlue/[0.1] text-customBlue ring-1 ring-customBlue/20' : 'text-deepBlue hover:bg-[#F8FBFE]',
                  ].join(' ')
                }
              >
                تواصل معنا
              </NavLink>

              {!isLoading && (
                <div className="grid gap-2.5 border-t border-deepBlue/[0.07] pt-4">
                  <Link
                    to="/volunteer"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center rounded-2xl border-2 border-customOrange py-3.5 text-sm font-black text-deepBlue"
                  >
                    انضم إلينا
                  </Link>
                  {isAuthenticated && user ? (
                    <>
                      <div className="flex items-center gap-3 rounded-2xl border border-deepBlue/[0.08] bg-[#F8FBFE] px-4 py-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-deepBlue text-sm font-black text-white">
                          {userInitial}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-deepBlue">{user.name}</p>
                          <p className="truncate text-xs text-deepBlue/50">{user.email}</p>
                        </div>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-customBlue py-3.5 text-sm font-black text-white"
                      >
                        لوحة التحكم
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
                    <>
                      <Link
                        to="/login"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-deepBlue/12 py-3.5 text-sm font-black text-deepBlue"
                      >
                        دخول
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-customBlue py-3.5 text-sm font-black text-white"
                      >
                        لوحة التحكم
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

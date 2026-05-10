import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  ChevronLeft,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import logo from '../assets/logo.png'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types'

// ---------------------------------------------------------------------------
// Sidebar navigation data — role-aware
// ---------------------------------------------------------------------------

type SidebarItem  = { label: string; href: string; icon: React.ElementType }
type SidebarGroup = { title?: string; items: SidebarItem[] }

// Routes where the home link must be an EXACT match (prevent false positives)
const exactMatchRoutes = new Set([
  '/dashboard',
  '/dashboard/student',
  '/dashboard/teacher',
  '/dashboard/admin',
])

function getRoleSidebar(role?: UserRole): SidebarGroup[] {
  const home =
    role === 'admin'   ? '/dashboard/admin' :
    role === 'teacher' ? '/dashboard/teacher' :
    '/dashboard/student'

  if (role === 'admin') {
    return [
      { items: [{ label: 'لوحة التحكم', href: home, icon: LayoutDashboard }] },
      {
        title: 'الإدارة الأكاديمية',
        items: [
          { label: 'الدورات',  href: '/dashboard/courses',  icon: BookOpen     },
          { label: 'البرامج',  href: '/dashboard/programs', icon: GraduationCap },
        ],
      },
      {
        title: 'الطلاب',
        items: [
          { label: 'قائمة الطلاب', href: '/dashboard/students',      icon: Users        },
          { label: 'التسجيلات',    href: '/dashboard/registrations',  icon: ClipboardList },
        ],
      },
      {
        title: 'الجدولة',
        items: [{ label: 'الجدول الزمني', href: '/dashboard/schedule', icon: Calendar }],
      },
      {
        title: 'الإدارة',
        items: [
          { label: 'المستخدمون', href: '/dashboard/users',    icon: UserCog  },
          { label: 'التقارير',   href: '/dashboard/reports',  icon: BarChart3 },
          { label: 'الإعدادات', href: '/dashboard/settings', icon: Settings  },
        ],
      },
      {
        title: 'التواصل',
        items: [{ label: 'الإشعارات', href: '/dashboard/notifications', icon: Bell }],
      },
    ]
  }

  if (role === 'teacher') {
    return [
      { items: [{ label: 'لوحة التحكم', href: home, icon: LayoutDashboard }] },
      {
        title: 'التدريس',
        items: [
          { label: 'دوراتي',        href: '/dashboard/courses',  icon: BookOpen },
          { label: 'الجدول الزمني', href: '/dashboard/schedule', icon: Calendar },
        ],
      },
      {
        title: 'التقييمات',
        items: [{ label: 'الاختبارات والتقييمات', href: '/dashboard/assessments', icon: FileText }],
      },
      {
        title: 'الموارد',
        items: [{ label: 'المواد التعليمية', href: '/dashboard/resources', icon: FolderOpen }],
      },
      {
        title: 'التواصل',
        items: [{ label: 'الإشعارات', href: '/dashboard/notifications', icon: Bell }],
      },
    ]
  }

  // Default: student
  return [
    { items: [{ label: 'لوحة التحكم', href: home, icon: LayoutDashboard }] },
    {
      title: 'التعلم',
      items: [
        { label: 'دوراتي',        href: '/dashboard/courses',  icon: BookOpen },
        { label: 'الجدول الزمني', href: '/dashboard/schedule', icon: Calendar },
      ],
    },
    {
      title: 'الإنجازات',
      items: [{ label: 'الشهادات', href: '/dashboard/certificates', icon: GraduationCap }],
    },
    {
      title: 'التواصل',
      items: [{ label: 'الإشعارات', href: '/dashboard/notifications', icon: Bell }],
    },
    {
      title: 'الحساب',
      items: [{ label: 'الملف الشخصي', href: '/dashboard/profile', icon: UserCog }],
    },
  ]
}

// ---------------------------------------------------------------------------
// Route → page title map (used by topbar)
// ---------------------------------------------------------------------------

const pageTitles: Record<string, string> = {
  '/dashboard':              'لوحة التحكم',
  '/dashboard/student':      'لوحة الطالب',
  '/dashboard/teacher':      'لوحة المدرب',
  '/dashboard/admin':        'لوحة الإدارة',
  '/dashboard/courses':      'الدورات',
  '/dashboard/programs':     'البرامج',
  '/dashboard/students':     'الطلاب',
  '/dashboard/registrations':'التسجيلات',
  '/dashboard/schedule':     'الجدول الزمني',
  '/dashboard/assessments':  'التقييمات',
  '/dashboard/notifications': 'الإشعارات',
  '/dashboard/resources':    'الموارد',
  '/dashboard/users':        'المستخدمون',
  '/dashboard/reports':      'التقارير',
  '/dashboard/settings':     'الإعدادات',
  '/dashboard/profile':      'الملف الشخصي',
  '/dashboard/certificates': 'شهاداتي',
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? '؟'

  const groups = getRoleSidebar(user?.role)

  function isActive(href: string) {
    if (exactMatchRoutes.has(href)) return location.pathname === href
    return location.pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <aside
        dir="rtl"
        className={[
          'fixed inset-y-0 right-0 z-40 flex w-64 flex-col bg-deepBlue',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* ── Logo ── */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="EMC" className="h-9 w-auto brightness-0 invert" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="قائمة لوحة التحكم">
          {groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
              {group.title && (
                <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-widest text-white/35">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <NavLink
                        to={item.href}
                        end={exactMatchRoutes.has(item.href)}
                        className={[
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors',
                          active
                            ? 'bg-customBlue text-white shadow-sm'
                            : 'text-white/65 hover:bg-white/10 hover:text-white',
                        ].join(' ')}
                      >
                        <item.icon
                          size={17}
                          className={active ? 'text-white' : 'text-white/50'}
                        />
                        <span className="flex-1">{item.label}</span>
                        {!active && (
                          <ChevronLeft size={14} className="text-white/25" />
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── User card at bottom ── */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-customBlue text-sm font-black text-white">
              {userInitial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{user?.name ?? '—'}</p>
              <p className="truncate text-xs text-white/45">{user?.email ?? '—'}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              className="shrink-0 rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-red-400"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

// ---------------------------------------------------------------------------
// Topbar component
// ---------------------------------------------------------------------------

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const pageTitle = pageTitles[location.pathname] ?? 'لوحة التحكم'
  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? '؟'

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  return (
    <header
      dir="rtl"
      className="fixed right-0 top-0 z-20 flex h-16 w-full items-center gap-4 border-b border-slate-100 bg-white px-4 lg:right-64 lg:w-[calc(100%-256px)]"
    >
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="فتح القائمة"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-black text-deepBlue">{pageTitle}</h1>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          {searchOpen ? (
            <div className="flex items-center gap-2 rounded-xl border border-customBlue/30 bg-sky-50 px-3 py-2">
              <Search size={16} className="shrink-0 text-customBlue" />
              <input
                ref={searchRef}
                type="search"
                placeholder="بحث..."
                onBlur={() => setSearchOpen(false)}
                className="w-40 bg-transparent text-sm font-bold text-deepBlue outline-none placeholder:text-slate-400"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="بحث"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue"
            >
              <Search size={18} />
            </button>
          )}
        </div>

        {/* Notifications */}
        <Link
          to="/dashboard/notifications"
          aria-label="الإشعارات"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue"
        >
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-customOrange ring-2 ring-white" />
        </Link>

        {/* User avatar */}
        <Link
          to="/dashboard/profile"
          aria-label="الملف الشخصي"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-customBlue text-sm font-black text-white shadow-sm transition hover:opacity-90"
        >
          {userInitial}
        </Link>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// DashboardLayout
// ---------------------------------------------------------------------------

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F8FB]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onMenuClick={() => setSidebarOpen(true)} />

      <main className="pt-16 lg:mr-64">
        <div className="p-5 md:p-7 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

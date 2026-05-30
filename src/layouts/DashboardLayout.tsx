import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot,
  ChevronDown,
  ChevronLeft,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react'
import logo from '../assets/logo.png'
import CommandPalette from '../components/ai/CommandPalette'
import ImpersonationBanner from '../components/ImpersonationBanner'
import NotificationBell from '../components/platform/NotificationBell'
import NotificationDrawer from '../components/platform/NotificationDrawer'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_REFRESH_EVENT,
} from '../api/notificationsApi'
import { useAuth } from '../contexts/AuthContext'
import type { PlatformNotification } from '../types/platform'
import { exactMatchSidebarRoutes, getSidebarByRole } from './dashboardSidebar'
import { StudentDashboardProvider } from '@/hooks/useStudentDashboardData'
import { getUserDisplayName, getUserRoleLabel, getUserSidebarSubtitle } from '../utils/userIdentity'
import { UserAvatar } from '@/components/UserAvatar'

// ---------------------------------------------------------------------------
// Route → page title map (used by topbar)
// ---------------------------------------------------------------------------

const pageTitles: Record<string, string> = {
  '/dashboard':              'لوحة التحكم',
  '/dashboard/student':      'لوحة الطالب',
  '/dashboard/instructor':      'لوحة المدرب',
  '/dashboard/admin':        'لوحة الإدارة',
  '/dashboard/super-admin': 'السوبر مشرف — نظرة عامة',
  '/dashboard/super-admin/audit-logs': 'سجل التغييرات — السوبر مشرف',
  '/dashboard/super-admin/crud': 'إدارة الكيانات',
  '/dashboard/super-admin/crud/users': 'مركز المستخدمين',
  '/dashboard/super-admin/crud/roles': 'الأدوار والصلاحيات',
  '/dashboard/super-admin/crud/departments': 'الإدارات',
  '/dashboard/super-admin/crud/team': 'إدارة الفريق',
  '/dashboard/super-admin/crud/students': 'الطلاب — السوبر مشرف',
  '/dashboard/super-admin/crud/instructors': 'المدربون — السوبر مشرف',
  '/dashboard/super-admin/crud/programs': 'البرامج — السوبر مشرف',
  '/dashboard/super-admin/crud/tracks': 'المسارات — السوبر مشرف',
  '/dashboard/super-admin/crud/workshops': 'الورش — السوبر مشرف',
  '/dashboard/super-admin/crud/registrations': 'التسجيلات — السوبر مشرف',
  '/dashboard/super-admin/crud/partners': 'الشراكات — السوبر مشرف',
  '/dashboard/executive': 'اللوحة التنفيذية',
  '/dashboard/finance': 'لوحة المالية',
  '/dashboard/quality': 'مراجعة الجودة',
  '/dashboard/hr': 'لوحة الموارد البشرية',
  '/dashboard/partner': 'لوحة الشركاء',
  '/dashboard/marketing': 'التسويق',
  '/dashboard/support': 'تذاكر الدعم',
  '/dashboard/volunteer': 'المتطوعون',
  '/dashboard/department': 'الإدارات',
  '/dashboard/department/programs': 'البرامج — الإدارة',
  '/dashboard/teacher':      'لوحة المدرب',
  '/dashboard/student/sessions':     'جلساتي',
  '/dashboard/student/courses':      'دوراتي',
  '/dashboard/student/learn':        'مساحة التعلّم',
  '/dashboard/student/registrations': 'التسجيلات',
  '/dashboard/student/available-courses': 'دورات متاحة',
  '/dashboard/student/materials':    'المواد التعليمية',
  '/dashboard/student/assignments':  'الواجبات',
  '/dashboard/student/progress':     'التقدّم',
  '/dashboard/student/evaluation':   'تقييم الدورة',
  '/dashboard/instructor/sessions':    'جلسات المدرب',
  '/dashboard/instructor/courses':    'دوراتي المسندة',
  '/dashboard/instructor/workshops':   'ورش العمل',
  '/dashboard/instructor/attendance':  'الحضور',
  '/dashboard/instructor/submissions':'مراجعة التسليمات',
  '/dashboard/teacher/sessions':    'جلسات المدرب',
  '/dashboard/teacher/attendance':  'الحضور',
  '/dashboard/teacher/submissions':'مراجعة التسليمات',
  '/dashboard/admin/lms/sessions':    'إدارة الجلسات',
  '/dashboard/admin/lms/attendance':  'إدارة الحضور',
  '/dashboard/admin/lms/assignments': 'إدارة الواجبات',
  '/dashboard/admin/lms/materials':   'إدارة المواد',
  '/dashboard/admin/lms/evaluations': 'التقييمات',
  '/dashboard/admin/lms/courses':     'محتوى الدورة — إدارة LMS',
  '/dashboard/admin/lms/progress':    'التقدّم الإداري',
  '/dashboard/admin/operations': 'لوحة العمليات التشغيلية',
  '/dashboard/admin/programs': 'إدارة البرامج والدورات',
  '/dashboard/admin/departments': 'الإدارات',
  '/dashboard/admin/tasks': 'المهام',
  '/dashboard/admin/tasks/kanban': 'كانبان المهام',
  '/dashboard/admin/tasks/my': 'مهامي',
  '/dashboard/admin/tasks/overdue': 'المهام المتأخرة',
  '/dashboard/admin/meetings': 'الاجتماعات',
  '/dashboard/admin/forms': 'النماذج',
  '/dashboard/admin/forms/create': 'إنشاء نموذج',
  '/dashboard/admin/volunteers': 'المتطوعون',
  '/dashboard/admin/partners': 'الشركاء',
  '/dashboard/admin/partnership-requests': 'طلبات الشراكة',
  '/dashboard/admin/marketing': 'التسويق',
  '/dashboard/admin/support-tickets': 'تذاكر الدعم',
  '/dashboard/admin/finance': 'لوحة المالية',
  '/dashboard/admin/finance/payments': 'المدفوعات',
  '/dashboard/admin/finance/transactions': 'المعاملات المالية',
  '/dashboard/admin/coupons': 'الكوبونات',
  '/dashboard/admin/scholarships': 'المنح',
  '/dashboard/admin/certificates': 'إدارة الشهادات',
  '/dashboard/admin/quality': 'مراجعة الجودة',
  '/dashboard/admin/kpi': 'مؤشرات الأداء',
  '/dashboard/admin/reports': 'التقارير التحليلية',
  '/dashboard/courses':      'الدورات',
  '/dashboard/programs':     'البرامج',
  '/dashboard/students':     'الطلاب',
  '/dashboard/registrations':'التسجيلات',
  '/dashboard/schedule':     'الجدول الزمني',
  '/dashboard/assessments':  'التقييمات',
  '/dashboard/notifications': 'الإشعارات',
  '/dashboard/settings/notifications': 'تفضيلات الإشعارات',
  '/calendar': 'التقويم',
  '/dashboard/resources':    'الموارد',
  '/dashboard/users':        'المستخدمون',
  '/dashboard/reports':      'التقارير',
  '/dashboard/settings':     'الإعدادات',
  '/dashboard/profile':      'الملف الشخصي',
  '/dashboard/certificates': 'شهاداتي',
  '/dashboard/learning': 'مسار التعلّم المتقدم',
  '/documents': 'الملفات',
  '/ai': 'المساعد الذكي',
  '/dashboard/admin/knowledge': 'إدارة المعرفة',
  '/dashboard/admin/knowledge/categories': 'فئات المعرفة',
  '/dashboard/admin/knowledge/articles/create': 'إنشاء مقال',
  '/dashboard/admin/knowledge/articles': 'محرر المقالات',
  '/dashboard/admin/modules': 'الوحدات التعليمية',
  '/dashboard/admin/lessons': 'إدارة الدروس',
  '/dashboard/admin/quizzes': 'إدارة الاختبارات',
  '/dashboard/admin/automations': 'الأتمتة',
  '/dashboard/admin/automations/runs': 'سجل الأتمتة',
  '/dashboard/admin/documents': 'مستندات الإدارة',
  '/dashboard/admin/audit-logs': 'سجل التدقيق',
  '/dashboard/admin/platform-scale': 'نمو المنصة',
  '/dashboard/admin/integrations': 'مركز التكاملات',
  '/dashboard/admin/integrations/whatsapp': 'واتساب — التكامل',
  '/dashboard/admin/integrations/email': 'البريد — التكامل',
  '/dashboard/admin/calendar': 'تقويم الإدارة',
  '/dashboard/admin/webhooks': 'الويبهوكس',
  '/dashboard/admin/developer/api-tokens': 'رموز المطوّر',
  '/dashboard/admin/mobile-readiness': 'جاهزية الجوال',
  '/dashboard/admin/ai': 'AI Command Center',
  '/dashboard/admin/ai/automations': 'AI Automations',
  '/dashboard/admin/ai/insights': 'AI Insights',
  '/dashboard/admin/ai/usage': 'AI Usage',
  '/dashboard/executive/operations': 'لوحة العمليات التشغيلية',
  '/dashboard/executive/kpi': 'مؤشرات الأداء',
  '/dashboard/executive/reports': 'التقارير التحليلية',
  '/dashboard/executive/programs': 'البرامج والدورات — التنفيذي',
  '/dashboard/finance/payments': 'المدفوعات',
  '/dashboard/finance/transactions': 'المعاملات المالية',
  '/dashboard/hr/team': 'أعضاء الفريق',
  '/dashboard/hr/volunteers': 'المتطوعون',
  '/dashboard/hr/instructors': 'المدربون',
  '/dashboard/hr/applications': 'طلبات الانضمام',
  '/dashboard/hr/departments': 'الإدارات والأدوار',
  '/dashboard/hr/onboarding': 'التأهيل والانضمام',
  '/dashboard/hr/tasks': 'مهام الموارد البشرية',
  '/dashboard/hr/documents': 'ملفات الموارد البشرية',
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const sidebarName = getUserDisplayName(user)
  const sidebarSubtitle = getUserSidebarSubtitle(user)
  const showRoleBadge = Boolean(user?.role != null && String(user.role).trim() !== '')

  const groups = useMemo(() => {
    return getSidebarByRole(user?.role)
  }, [user?.role])
  const [collapsibleExpanded, setCollapsibleExpanded] = useState<Record<string, boolean>>({})

  function collapsibleSectionOpen(title?: string, collapsible?: boolean) {
    if (!collapsible || !title) return true
    return collapsibleExpanded[title] ?? true
  }

  function toggleCollapsibleSection(title?: string) {
    if (!title) return
    setCollapsibleExpanded((prev) => ({ ...prev, [title]: !(prev[title] ?? true) }))
  }

  function isActive(href: string) {
    if (exactMatchSidebarRoutes.has(href)) return location.pathname === href
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

      {/* Sidebar panel — premium gradient + inset highlights + ambient glow */}
      <aside
        dir="rtl"
        className={[
          'fixed inset-y-0 right-0 z-40 flex w-60 flex-col overflow-hidden',
          'bg-gradient-to-b from-[#1A2A3D] via-deepBlue to-[#0F1B2A]',
          'border-l border-white/[0.06] shadow-[inset_1px_0_0_rgba(255,255,255,0.05)]',
          'transition-transform duration-300 ease-emc-out',
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Ambient orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-customBlue/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-customOrange/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-emc-dots bg-dots-16 opacity-[0.04]"
        />

        {/* ── Logo ── */}
        <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-5">
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
        <nav className="relative flex-1 overflow-y-auto emc-scroll px-3 py-4" aria-label="قائمة لوحة التحكم">
          {groups.map((group, gi) => {
            const open = collapsibleSectionOpen(group.title, group.collapsible)

            return (
            <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
              {group.collapsible && group.title ?
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggleCollapsibleSection(group.title)}
                  className="group/cap mb-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/46 transition hover:bg-white/[0.05]"
                >
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-customOrange transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
                    aria-hidden
                  />
                  <span className="font-latin flex-1 text-right leading-tight text-white/55">{group.title}</span>
                </button>
              : group.title ?
                <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/40 font-latin">
                  {group.title}
                </p>
              : null}
              {open ?
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <li key={item.href}>
                        <NavLink
                          to={item.href}
                          end={exactMatchSidebarRoutes.has(item.href)}
                          className={[
                            'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-all duration-200 ease-emc-out',
                            active
                              ? 'bg-gradient-to-l from-customBlue to-[#1e7dab] text-white shadow-[0_8px_22px_-10px_rgba(38,145,194,0.7),inset_0_1px_0_rgba(255,255,255,0.18)]'
                              : 'text-white/70 hover:bg-white/[0.07] hover:text-white',
                          ].join(' ')}
                        >
                          {active ?
                            <span className="absolute inset-y-2 -right-3 w-1 rounded-full bg-customOrange shadow-[0_0_12px_rgba(236,148,60,0.7)]" />
                          : null}
                          <item.icon
                            size={17}
                            className={active ? 'text-white' : 'text-white/55 transition group-hover:text-white'}
                          />
                          <span className="flex-1">{item.label}</span>
                          {!active ?
                            <ChevronLeft size={14} className="text-white/25 transition group-hover:text-white/50" />
                          : null}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              : null}
            </div>
            )
          })}
        </nav>

        {/* ── User card at bottom ── */}
        <div className="relative shrink-0 border-t border-white/[0.08] p-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.06] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
            <UserAvatar
              user={user}
              className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-customBlue to-[#1B6489] text-[10px] leading-none text-white ring-2 ring-white/10 font-latin"
              textClassName="text-[10px] font-black text-white font-latin"
            />
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate text-sm font-bold text-white">{sidebarName}</p>
              <p className="truncate text-xs leading-snug text-white/55 font-latin">
                {sidebarSubtitle !== '' ? sidebarSubtitle : '\u2014'}
              </p>
              {showRoleBadge ?
                <span className="mt-1 inline-block max-w-full truncate rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-customOrange ring-1 ring-white/10 font-latin">
                  {getUserRoleLabel(user)}
                </span>
              : null}
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              className="shrink-0 rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-rose-400"
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

function Topbar({
  onMenuClick,
  onOpenSearch,
  unread,
  onOpenNotifications,
}: {
  onMenuClick: () => void
  onOpenSearch: () => void
  unread: number
  onOpenNotifications: () => void
}) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const pageTitle =
    pageTitles[location.pathname] ??
    Object.entries(pageTitles)
      .filter(([path]) => location.pathname.startsWith(path + '/') || location.pathname === path)
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    'لوحة التحكم'

  const displayName = getUserDisplayName(user)
  const roleLabel = getUserRoleLabel(user)

  useEffect(() => {
    if (!menuOpen) return
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <header
      dir="rtl"
      className="fixed right-0 top-0 z-20 flex h-16 w-full items-center gap-4 border-b border-deepBlue/[0.07] bg-white/78 px-4 shadow-[0_1px_0_rgba(15,42,67,0.04)] backdrop-blur-2xl lg:right-60 lg:w-[calc(100%-15rem)]"
    >
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="فتح القائمة"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-deepBlue/65 transition hover:border-deepBlue/10 hover:bg-deepBlue/[0.04] hover:text-deepBlue lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-black tracking-tight text-deepBlue sm:text-base">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="بحث عام"
          className="group flex h-9 items-center gap-2 rounded-xl border border-deepBlue/[0.08] bg-[#F6F8FB] px-3 text-xs font-black text-deepBlue/60 transition-all duration-200 ease-emc-out hover:-translate-y-px hover:border-customBlue/30 hover:bg-white hover:text-deepBlue hover:shadow-emc-xs"
        >
          <Search size={16} className="text-customBlue transition group-hover:scale-110" />
          <span className="hidden sm:inline">بحث سريع</span>
          <kbd className="hidden rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black text-deepBlue/45 ring-1 ring-deepBlue/[0.08] font-latin md:inline">
            Ctrl K
          </kbd>
        </button>

        <NotificationBell unread={unread} onClick={onOpenNotifications} />

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={[
              'flex max-w-[min(100vw-10rem,17rem)] items-center gap-2 rounded-2xl border border-deepBlue/[0.08] bg-[#F6F8FB] py-1.5 ps-2 pe-2.5 sm:pe-3',
              'text-deepBlue transition hover:border-customBlue/25 hover:bg-white hover:shadow-emc-xs',
              menuOpen ? 'border-customBlue/30 bg-white shadow-emc-xs' : '',
            ].join(' ')}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="قائمة المستخدم"
          >
            <UserAvatar
              user={user}
              className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-customBlue to-[#1B6489] text-[11px] leading-none text-white shadow-[0_6px_14px_-4px_rgba(38,145,194,0.55)] ring-2 ring-white font-latin"
              textClassName="text-[11px] font-black text-white font-latin"
            />
            <div className="min-w-0 flex-1 text-right max-sm:hidden">
              <p className="truncate text-[13px] font-black leading-tight tracking-tight text-deepBlue">{displayName}</p>
              {roleLabel ?
                <p className="truncate text-[11px] font-bold text-deepBlue/48 font-latin">{roleLabel}</p>
              : null}
            </div>
            <ChevronDown
              aria-hidden
              className={`size-4 shrink-0 text-deepBlue/40 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
              strokeWidth={2.25}
            />
          </button>

          {menuOpen ?
            <div
              dir="rtl"
              role="menu"
              aria-label="خيارات المستخدم"
              className="absolute end-0 top-[calc(100%+0.375rem)] z-[100] min-w-[15.5rem] rounded-2xl border border-deepBlue/[0.08] bg-white py-2 shadow-[0_14px_40px_-14px_rgba(15,42,67,0.22)] ring-1 ring-deepBlue/[0.04]"
            >
              <Link
                to="/dashboard/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-deepBlue transition hover:bg-deepBlue/[0.04]"
              >
                <User className="size-[17px] shrink-0 text-customBlue opacity-90" aria-hidden />
                الملف الشخصي
              </Link>
              <Link
                to="/dashboard/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-deepBlue transition hover:bg-deepBlue/[0.04]"
              >
                <Settings className="size-[17px] shrink-0 text-customBlue opacity-90" aria-hidden />
                الإعدادات
              </Link>
              <div className="my-2 h-px bg-deepBlue/[0.06]" role="presentation" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-right text-sm font-black text-rose-600 transition hover:bg-rose-50"
              >
                <LogOut className="size-[17px] shrink-0 opacity-90" aria-hidden />
                تسجيل الخروج
              </button>
            </div>
          : null}
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// DashboardLayout
// ---------------------------------------------------------------------------

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifications, setNotifications] = useState<PlatformNotification[]>([])
  const location = useLocation()

  const refreshNotifications = useCallback(() => {
    void fetchNotifications().then((n) => setNotifications(n))
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  useEffect(() => {
    function onNotifRefresh() {
      refreshNotifications()
    }
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onNotifRefresh)
    return () => window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onNotifRefresh)
  }, [refreshNotifications])

  useEffect(() => {
    const id = setInterval(refreshNotifications, 90_000)
    return () => clearInterval(id)
  }, [refreshNotifications])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const unread = notifications.filter((n) => !n.is_read).length

  async function handleMarkRead(id: number) {
    const stamp = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, is_read: true, read_at: x.read_at ?? stamp } : x,
      ),
    )
    await markNotificationRead(id)
  }

  async function handleMarkAll() {
    const stamp = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((x) => ({ ...x, is_read: true, read_at: x.read_at ?? stamp })),
    )
    await markAllNotificationsRead()
  }

  return (
    <StudentDashboardProvider>
    <div dir="rtl" className="relative min-h-screen bg-[#F6F8FB]">
      {/* Ambient dashboard atmosphere — fixed, subtle, behind content */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-0 bg-gradient-to-br from-[#F6F8FB] via-[#F3F7FC] to-[#EEF4FA]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-0 bg-emc-grid bg-grid-32 opacity-[0.4] [mask-image:radial-gradient(ellipse_at_top_left,rgba(0,0,0,0.45),transparent_70%)]"
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar
        onMenuClick={() => setSidebarOpen(true)}
        onOpenSearch={() => setPaletteOpen(true)}
        unread={unread}
        onOpenNotifications={() => {
          setDrawerOpen(true)
          refreshNotifications()
        }}
      />

      <CommandPalette
        open={paletteOpen}
        onOpen={() => setPaletteOpen(true)}
        onClose={() => setPaletteOpen(false)}
      />
      <NotificationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={notifications}
        onMarkRead={(id) => void handleMarkRead(id)}
        onMarkAll={() => void handleMarkAll()}
      />

      <Link
        to="/ai"
        aria-label="المساعد الذكي"
        className="group fixed bottom-6 left-6 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-deepBlue via-[#1A3A52] to-customBlue text-white shadow-[0_18px_44px_-10px_rgba(15,42,67,0.55),0_0_0_1px_rgba(38,145,194,0.25)] ring-4 ring-white transition-all duration-300 ease-emc-out hover:scale-[1.05] hover:shadow-[0_22px_52px_-10px_rgba(38,145,194,0.6),0_0_0_1px_rgba(38,145,194,0.35)]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-customBlue/20 to-transparent opacity-0 transition group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-2xl bg-customBlue/30 blur-xl opacity-0 transition group-hover:opacity-60"
        />
        <Bot size={26} className="relative" />
      </Link>

      <main className="relative pt-16 lg:mr-60" id="dashboard-main-content" tabIndex={-1}>
        <div className="p-5 md:p-7 lg:p-8">
          <ImpersonationBanner />
          <Outlet />
        </div>
      </main>
    </div>
    </StudentDashboardProvider>
  )
}

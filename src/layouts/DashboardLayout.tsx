import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Award,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Code2,
  Cpu,
  FileBarChart,
  FileText,
  FolderLock,
  FolderOpen,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  Percent,
  PieChart,
  Plug2,
  Search,
  Settings,
  ShieldCheck,
  ShieldQuestion,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  Wallet,
  Webhook as WebhookIcon,
  X,
} from 'lucide-react'
import logo from '../assets/logo.png'
import CommandPalette from '../components/ai/CommandPalette'
import NotificationBell from '../components/platform/NotificationBell'
import NotificationDrawer from '../components/platform/NotificationDrawer'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notificationsApi'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types'
import type { PlatformNotification } from '../types/platform'

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
  '/dashboard/admin/operations',
  '/dashboard/learning',
])

function getRoleSidebar(role?: UserRole): SidebarGroup[] {
  const home =
    role === 'admin'   ? '/dashboard/admin' :
    role === 'teacher' ? '/dashboard/teacher' :
    role === 'partner' ? '/partner/dashboard' :
    '/dashboard/student'

  if (role === 'partner') {
    return [
      { items: [{ label: 'لوحة الشركاء', href: '/partner/dashboard', icon: LayoutDashboard }] },
      {
        title: 'مساحة المعرفة',
        items: [
          { label: 'المستندات', href: '/documents', icon: FolderOpen },
          { label: 'المساعد الذكي', href: '/ai', icon: Bot },
          { label: 'الإشعارات', href: '/dashboard/notifications', icon: Bell },
        ],
      },
    ]
  }

  if (role === 'admin') {
    return [
      { items: [{ label: 'لوحة التحكم', href: home, icon: LayoutDashboard }] },
      {
        title: 'نظام التعلّم LMS',
        items: [
          { label: 'الجلسات', href: '/dashboard/admin/lms/sessions', icon: Calendar },
          { label: 'الحضور', href: '/dashboard/admin/lms/attendance', icon: Users },
          { label: 'الواجبات', href: '/dashboard/admin/lms/assignments', icon: ClipboardList },
          { label: 'المواد', href: '/dashboard/admin/lms/materials', icon: FolderOpen },
          { label: 'التقييمات', href: '/dashboard/admin/lms/evaluations', icon: FileText },
          { label: 'التقدّم', href: '/dashboard/admin/lms/progress', icon: BarChart3 },
        ],
      },
      {
        title: 'مركز العمليات',
        items: [
          { label: 'لوحة العمليات', href: '/dashboard/admin/operations', icon: Sparkles },
          { label: 'الإدارات', href: '/dashboard/admin/departments', icon: Building2 },
          { label: 'المهام', href: '/dashboard/admin/tasks', icon: ClipboardList },
          { label: 'الاجتماعات', href: '/dashboard/admin/meetings', icon: Calendar },
          { label: 'النماذج', href: '/dashboard/admin/forms', icon: FileText },
          { label: 'المتطوعون', href: '/dashboard/admin/volunteers', icon: Users },
          { label: 'الشركاء', href: '/dashboard/admin/partners', icon: Briefcase },
          { label: 'طلبات الشراكة', href: '/dashboard/admin/partnership-requests', icon: HeartHandshake },
          { label: 'التسويق', href: '/dashboard/admin/marketing', icon: Megaphone },
          { label: 'تذاكر الدعم', href: '/dashboard/admin/support-tickets', icon: ShieldQuestion },
        ],
      },
      {
        title: 'الإيرادات والذكاء',
        items: [
          { label: 'لوحة المالية', href: '/dashboard/admin/finance', icon: Wallet },
          { label: 'الكوبونات', href: '/dashboard/admin/coupons', icon: Percent },
          { label: 'المنح', href: '/dashboard/admin/scholarships', icon: GraduationCap },
          { label: 'الشهادات', href: '/dashboard/admin/certificates', icon: Award },
          { label: 'مراجعة الجودة', href: '/dashboard/admin/quality', icon: ClipboardCheck },
          { label: 'مؤشرات الأداء', href: '/dashboard/admin/kpi', icon: PieChart },
          { label: 'التقارير التحليلية', href: '/dashboard/admin/reports', icon: FileBarChart },
        ],
      },
      {
        title: 'منظومة EMC المتقدمة',
        items: [
          { label: 'قاعدة المعرفة', href: '/dashboard/admin/knowledge', icon: BookMarked },
          { label: 'فئات المعرفة', href: '/dashboard/admin/knowledge/categories', icon: Layers },
          { label: 'الوحدات التعليمية', href: '/dashboard/admin/modules', icon: BookOpen },
          { label: 'الدروس', href: '/dashboard/admin/lessons', icon: FileText },
          { label: 'الاختبارات', href: '/dashboard/admin/quizzes', icon: ClipboardCheck },
          { label: 'الأتمتة', href: '/dashboard/admin/automations', icon: Cpu },
          { label: 'مستندات الإدارة', href: '/dashboard/admin/documents', icon: FolderLock },
          { label: 'سجل التدقيق', href: '/dashboard/admin/audit-logs', icon: ShieldCheck },
          { label: 'نمو المنصة', href: '/dashboard/admin/platform-scale', icon: TrendingUp },
        ],
      },
      {
        title: 'التكامل والمنظومة المفتوحة',
        items: [
          { label: 'مركز التكاملات', href: '/dashboard/admin/integrations', icon: Plug2 },
          { label: 'الويبهوكس', href: '/dashboard/admin/webhooks', icon: WebhookIcon },
          { label: 'رموز المطوّر', href: '/dashboard/admin/developer/api-tokens', icon: Code2 },
          { label: 'جاهزية الجوال', href: '/dashboard/admin/mobile-readiness', icon: Smartphone },
          { label: 'تقويم الإدارة', href: '/dashboard/admin/calendar', icon: CalendarDays },
        ],
      },
      {
        title: 'طبقة الذكاء الاصطناعي',
        items: [
          { label: 'AI Command Center', href: '/dashboard/admin/ai', icon: Bot },
          { label: 'AI Automations', href: '/dashboard/admin/ai/automations', icon: Cpu },
          { label: 'AI Insights', href: '/dashboard/admin/ai/insights', icon: PieChart },
          { label: 'AI Usage', href: '/dashboard/admin/ai/usage', icon: BarChart3 },
        ],
      },
      {
        title: 'الإدارة الأكاديمية',
        items: [
          { label: 'الدورات', href: '/dashboard/courses', icon: BookOpen },
          { label: 'البرامج', href: '/dashboard/programs', icon: GraduationCap },
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
          { label: 'التقارير العامة',   href: '/dashboard/reports',  icon: BarChart3 },
          { label: 'الإعدادات', href: '/dashboard/settings', icon: Settings  },
        ],
      },
      {
        title: 'التواصل والمعرفة',
        items: [
          { label: 'الإشعارات', href: '/dashboard/notifications', icon: Bell },
          { label: 'تفضيلات الإشعارات', href: '/dashboard/settings/notifications', icon: SlidersHorizontal },
          { label: 'التقويم', href: '/calendar', icon: CalendarDays },
          { label: 'الملفات', href: '/documents', icon: FolderOpen },
          { label: 'المساعد الذكي', href: '/ai', icon: Bot },
        ],
      },
    ]
  }

  if (role === 'teacher') {
    return [
      { items: [{ label: 'لوحة التحكم', href: home, icon: LayoutDashboard }] },
      {
        title: 'التدريس والجلسات',
        items: [
          { label: 'جلساتي', href: '/dashboard/teacher/sessions', icon: Calendar },
          { label: 'الحضور', href: '/dashboard/teacher/attendance', icon: UserCheck },
          { label: 'التسليمات', href: '/dashboard/teacher/submissions', icon: ClipboardList },
          { label: 'كتالوج الدورات', href: '/courses', icon: BookOpen },
        ],
      },
      {
        title: 'الموارد',
        items: [{ label: 'المواد التعليمية', href: '/dashboard/resources', icon: FolderOpen }],
      },
      {
        title: 'التواصل والمعرفة',
        items: [
          { label: 'الإشعارات', href: '/dashboard/notifications', icon: Bell },
          { label: 'تفضيلات الإشعارات', href: '/dashboard/settings/notifications', icon: SlidersHorizontal },
          { label: 'التقويم', href: '/calendar', icon: CalendarDays },
          { label: 'الملفات', href: '/documents', icon: FolderOpen },
          { label: 'المساعد الذكي', href: '/ai', icon: Bot },
        ],
      },
    ]
  }

  // Default: student
  return [
    { items: [{ label: 'لوحة التحكم', href: home, icon: LayoutDashboard }] },
    {
      title: 'التعلّم',
      items: [
        { label: 'مسار التعلّم المتقدم', href: '/dashboard/learning', icon: Brain },
        { label: 'جلساتي', href: '/dashboard/student/sessions', icon: Calendar },
        { label: 'المواد', href: '/dashboard/student/materials', icon: FolderOpen },
        { label: 'الواجبات', href: '/dashboard/student/assignments', icon: ClipboardList },
        { label: 'التقدّم', href: '/dashboard/student/progress', icon: TrendingUp },
        { label: 'تقييم الدورة', href: '/dashboard/student/evaluation', icon: Sparkles },
      ],
    },
    {
      title: 'الإنجازات',
      items: [{ label: 'الشهادات', href: '/dashboard/certificates', icon: GraduationCap }],
    },
    {
      title: 'التواصل والمعرفة',
      items: [
        { label: 'الإشعارات', href: '/dashboard/notifications', icon: Bell },
        { label: 'تفضيلات الإشعارات', href: '/dashboard/settings/notifications', icon: SlidersHorizontal },
        { label: 'التقويم', href: '/calendar', icon: CalendarDays },
        { label: 'الملفات', href: '/documents', icon: FolderOpen },
        { label: 'المساعد الذكي', href: '/ai', icon: Bot },
      ],
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
  '/dashboard/student/sessions':     'جلساتي',
  '/dashboard/student/materials':    'المواد التعليمية',
  '/dashboard/student/assignments':  'الواجبات',
  '/dashboard/student/progress':     'التقدّم',
  '/dashboard/student/evaluation':   'تقييم الدورة',
  '/dashboard/teacher/sessions':    'جلسات المدرب',
  '/dashboard/teacher/attendance':  'الحضور',
  '/dashboard/teacher/submissions':'مراجعة التسليمات',
  '/dashboard/admin/lms/sessions':    'إدارة الجلسات',
  '/dashboard/admin/lms/attendance':  'إدارة الحضور',
  '/dashboard/admin/lms/assignments': 'إدارة الواجبات',
  '/dashboard/admin/lms/materials':   'إدارة المواد',
  '/dashboard/admin/lms/evaluations': 'التقييمات',
  '/dashboard/admin/lms/progress':    'التقدّم الإداري',
  '/dashboard/admin/operations': 'لوحة العمليات التشغيلية',
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

      {/* Sidebar panel — premium gradient + inset highlights + ambient glow */}
      <aside
        dir="rtl"
        className={[
          'fixed inset-y-0 right-0 z-40 flex w-64 flex-col overflow-hidden',
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
          {groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
              {group.title && (
                <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/40 font-latin">
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
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ease-emc-out',
                          active
                            ? 'bg-gradient-to-l from-customBlue to-[#1e7dab] text-white shadow-[0_8px_22px_-10px_rgba(38,145,194,0.7),inset_0_1px_0_rgba(255,255,255,0.18)]'
                            : 'text-white/70 hover:bg-white/[0.07] hover:text-white',
                        ].join(' ')}
                      >
                        {active && (
                          <span className="absolute inset-y-2 -right-3 w-1 rounded-full bg-customOrange shadow-[0_0_12px_rgba(236,148,60,0.7)]" />
                        )}
                        <item.icon
                          size={17}
                          className={active ? 'text-white' : 'text-white/55 transition group-hover:text-white'}
                        />
                        <span className="flex-1">{item.label}</span>
                        {!active && (
                          <ChevronLeft
                            size={14}
                            className="text-white/25 transition group-hover:text-white/50"
                          />
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
        <div className="relative shrink-0 border-t border-white/[0.08] p-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.06] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-customBlue to-[#1B6489] text-sm font-black text-white ring-2 ring-white/10">
              {userInitial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{user?.name ?? '—'}</p>
              <p className="truncate text-xs text-white/50 font-latin">{user?.email ?? '—'}</p>
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
  const { user } = useAuth()
  const location = useLocation()

  const pageTitle =
    pageTitles[location.pathname] ??
    Object.entries(pageTitles)
      .filter(([path]) => location.pathname.startsWith(path + '/') || location.pathname === path)
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    'لوحة التحكم'
  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? '؟'

  return (
    <header
      dir="rtl"
      className="fixed right-0 top-0 z-20 flex h-16 w-full items-center gap-4 border-b border-deepBlue/[0.07] bg-white/85 px-4 shadow-[0_1px_0_rgba(15,42,67,0.04)] backdrop-blur-xl lg:right-64 lg:w-[calc(100%-256px)]"
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

        <Link
          to="/dashboard/profile"
          aria-label="الملف الشخصي"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-customBlue to-[#1B6489] text-sm font-black text-white shadow-[0_8px_18px_-6px_rgba(38,145,194,0.6)] ring-2 ring-white transition hover:scale-[1.04] hover:shadow-[0_10px_22px_-6px_rgba(38,145,194,0.7)]"
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
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifications, setNotifications] = useState<PlatformNotification[]>([])
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    let cancelled = false
    fetchNotifications().then((n) => {
      if (!cancelled) setNotifications(n)
    })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

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

  const unread = notifications.filter((n) => !n.read_at).length

  async function handleMarkRead(id: number) {
    setNotifications((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, read_at: x.read_at ?? new Date().toISOString().slice(0, 10) } : x,
      ),
    )
    await markNotificationRead(id)
  }

  async function handleMarkAll() {
    const stamp = new Date().toISOString().slice(0, 10)
    setNotifications((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? stamp })))
    await markAllNotificationsRead()
  }

  return (
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
        onOpenNotifications={() => setDrawerOpen(true)}
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

      <main className="relative pt-16 lg:mr-64" id="dashboard-main-content" tabIndex={-1}>
        <div className="p-5 md:p-7 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

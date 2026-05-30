import type { ElementType } from 'react'
import {
  Award,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Code2,
  Cpu,
  Crown,
  FileBarChart,
  FileText,
  FolderLock,
  FolderOpen,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  Layers,
  Megaphone,
  Percent,
  PieChart,
  Plug2,
  Rocket,
  ScrollText,
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
} from 'lucide-react'
import { normalizeRole } from '@/utils/dashboardAccess'

export type SidebarNavItem = { label: string; href: string; icon: ElementType }
export type SidebarNavGroup = {
  title?: string
  items: SidebarNavItem[]
  /** When true, renders a collapsible section (RTL). Default expanded. */
  collapsible?: boolean
}

export const exactMatchSidebarRoutes = new Set([
  '/dashboard',
  '/dashboard/student',
  '/dashboard/instructor',
  '/dashboard/admin',
  '/dashboard/partner',
  '/dashboard/executive',
  '/dashboard/finance',
  '/dashboard/quality',
  '/dashboard/hr',
  '/dashboard/marketing',
  '/dashboard/support',
  '/dashboard/volunteer',
  '/dashboard/department',
  '/dashboard/super-admin',
  '/dashboard/super-admin/audit-logs',
  '/dashboard/admin/operations',
  '/dashboard/learning',
])

function communicationsBlock(): SidebarNavGroup[] {
  return [
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

function adminSuperAdminSidebar(home = '/dashboard/admin'): SidebarNavGroup[] {
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
        { label: 'البرامج والدورات', href: '/dashboard/admin/programs', icon: BookMarked },
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
        { label: 'قائمة الطلاب', href: '/dashboard/students', icon: Users },
        { label: 'التسجيلات', href: '/dashboard/registrations', icon: ClipboardList },
      ],
    },
    {
      title: 'الجدولة',
      items: [{ label: 'الجدول الزمني', href: '/dashboard/schedule', icon: Calendar }],
    },
    {
      title: 'الإدارة',
      items: [
        { label: 'المستخدمون', href: '/dashboard/users', icon: UserCog },
        { label: 'التقارير العامة', href: '/dashboard/reports', icon: BarChart3 },
        { label: 'الإعدادات', href: '/dashboard/settings', icon: Settings },
      ],
    },
    ...communicationsBlock(),
  ]
}

/** Master navigation for `super_admin` — full platform reach + CRUD anchors. */
function superMasterSidebar(): SidebarNavGroup[] {
  return [
    {
      items: [
        { label: 'نظرة عامة', href: '/dashboard/super-admin', icon: Crown },
        { label: 'سجل التغييرات', href: '/dashboard/super-admin/audit-logs', icon: ScrollText },
      ],
    },
    {
      title: 'إدارة الكيانات (CRUD)',
      collapsible: true,
      items: [
        { label: 'المستخدمون', href: '/dashboard/super-admin/crud/users', icon: Users },
        { label: 'الأدوار والصلاحيات', href: '/dashboard/super-admin/crud/roles', icon: ShieldCheck },
        { label: 'الإدارات', href: '/dashboard/super-admin/crud/departments', icon: Building2 },
        { label: 'الفريق', href: '/dashboard/super-admin/crud/team', icon: UserCheck },
        { label: 'الطلاب', href: '/dashboard/super-admin/crud/students', icon: GraduationCap },
        { label: 'المدربون', href: '/dashboard/super-admin/crud/instructors', icon: UserCog },
        { label: 'البرامج', href: '/dashboard/super-admin/crud/programs', icon: BookMarked },
        { label: 'المسارات', href: '/dashboard/super-admin/crud/tracks', icon: Layers },
        { label: 'الورش', href: '/dashboard/super-admin/crud/workshops', icon: Sparkles },
        { label: 'التسجيلات', href: '/dashboard/super-admin/crud/registrations', icon: ClipboardList },
        { label: 'الشراكات', href: '/dashboard/super-admin/crud/partners', icon: HeartHandshake },
      ],
    },
    {
      title: 'لوحات الأدوار (وصول كامل)',
      items: [
        { label: 'الإدارة العامة', href: '/dashboard/admin', icon: LayoutDashboard },
        { label: 'الطالب', href: '/dashboard/student', icon: GraduationCap },
        { label: 'المدرب', href: '/dashboard/instructor', icon: UserCheck },
        { label: 'المالية', href: '/dashboard/finance', icon: Wallet },
        { label: 'الموارد البشرية', href: '/dashboard/hr', icon: Briefcase },
        { label: 'الجودة والحوكمة', href: '/dashboard/quality', icon: ClipboardCheck },
        { label: 'التسويق والإعلام', href: '/dashboard/marketing', icon: Megaphone },
        { label: 'الدعم الفني', href: '/dashboard/support', icon: ShieldQuestion },
        { label: 'الشركاء', href: '/dashboard/partner', icon: HeartHandshake },
        { label: 'المتطوعون', href: '/dashboard/volunteer', icon: Users },
        { label: 'مساحة الإدارات', href: '/dashboard/department', icon: Building2 },
        { label: 'اللوحة التنفيذية', href: '/dashboard/executive', icon: PieChart },
      ],
    },
    {
      title: 'العمليات والإيرادات',
      items: [
        { label: 'المدفوعات', href: '/dashboard/finance/payments', icon: Wallet },
        { label: 'المعاملات المالية', href: '/dashboard/finance/transactions', icon: BarChart3 },
        { label: 'التقارير والتحليلات', href: '/dashboard/admin/reports', icon: FileBarChart },
        { label: 'شركاء التشغيل', href: '/dashboard/admin/partners', icon: Briefcase },
      ],
    },
    {
      title: 'المنصّة',
      items: [
        { label: 'الإعدادات', href: '/dashboard/settings/notifications', icon: Settings },
        { label: 'الملف الشخصي', href: '/dashboard/profile', icon: UserCog },
      ],
    },
    ...communicationsBlock(),
  ]
}

/** Role-specific sidebar navigation (Arabic RTL labels). */
export function getSidebarByRole(roleRaw?: string | null): SidebarNavGroup[] {
  const n = normalizeRole(roleRaw ?? null)

  if (n === 'super_admin') return superMasterSidebar()

  if (n === 'admin') return adminSuperAdminSidebar('/dashboard/admin')

  if (n === 'executive_admin') {
    return [
      { items: [{ label: 'اللوحة التنفيذية', href: '/dashboard/executive', icon: LayoutDashboard }] },
        {
        title: 'القرار والمتابعة',
        items: [
          { label: 'لوحة العمليات', href: '/dashboard/executive/operations', icon: Sparkles },
          { label: 'مؤشرات الأداء', href: '/dashboard/executive/kpi', icon: PieChart },
          { label: 'التقارير التحليلية', href: '/dashboard/executive/reports', icon: FileBarChart },
          { label: 'البرامج والدورات', href: '/dashboard/executive/programs', icon: BookMarked },
        ],
      },
      ...communicationsBlock(),
    ]
  }

  if (n === 'finance_manager') {
    return [
      { items: [{ label: 'لوحة المالية', href: '/dashboard/finance', icon: Wallet }] },
      {
        title: 'العمليات المالية',
        items: [
          { label: 'المدفوعات', href: '/dashboard/finance/payments', icon: ClipboardList },
          { label: 'المعاملات', href: '/dashboard/finance/transactions', icon: BarChart3 },
        ],
      },
      ...communicationsBlock(),
    ]
  }

  if (n === 'quality_manager') {
    return [
      { items: [{ label: 'مراجعة الجودة', href: '/dashboard/quality', icon: ClipboardCheck }] },
      ...communicationsBlock(),
    ]
  }

  if (n === 'hr_manager') {
    return [
      { items: [{ label: 'لوحة الموارد البشرية', href: '/dashboard/hr', icon: LayoutDashboard }] },
      {
        title: 'الفريق والانضمام',
        items: [
          { label: 'أعضاء الفريق', href: '/dashboard/hr/team', icon: Users },
          { label: 'المتطوعون', href: '/dashboard/hr/volunteers', icon: HeartHandshake },
          { label: 'المدربون', href: '/dashboard/hr/instructors', icon: GraduationCap },
          { label: 'طلبات الانضمام', href: '/dashboard/hr/applications', icon: ClipboardList },
        ],
      },
      {
        title: 'الهيكل والمهام',
        items: [
          { label: 'الإدارات والأدوار', href: '/dashboard/hr/departments', icon: Building2 },
          { label: 'التأهيل والانضمام', href: '/dashboard/hr/onboarding', icon: Rocket },
          { label: 'مهام الموارد البشرية', href: '/dashboard/hr/tasks', icon: ClipboardCheck },
          { label: 'ملفات الموارد البشرية', href: '/dashboard/hr/documents', icon: FolderLock },
        ],
      },
      ...communicationsBlock(),
    ]
  }

  if (n === 'marketing_manager') {
    return [
      { items: [{ label: 'التسويق', href: '/dashboard/marketing', icon: Megaphone }] },
      ...communicationsBlock(),
    ]
  }

  if (n === 'support_agent') {
    return [
      { items: [{ label: 'تذاكر الدعم', href: '/dashboard/support', icon: ShieldQuestion }] },
      ...communicationsBlock(),
    ]
  }

  if (n === 'volunteer') {
    return [
      { items: [{ label: 'المتطوعون', href: '/dashboard/volunteer', icon: Users }] },
      ...communicationsBlock(),
    ]
  }

  if (n === 'department_manager') {
    return [
      { items: [{ label: 'إدارتي', href: '/dashboard/department', icon: Building2 }] },
      {
        title: 'التعلّم والبرامج',
        items: [{ label: 'البرامج والدورات', href: '/dashboard/department/programs', icon: BookMarked }],
      },
      ...communicationsBlock(),
    ]
  }

  if (n === 'partner') {
    return [
      { items: [{ label: 'لوحة الشركاء', href: '/dashboard/partner', icon: LayoutDashboard }] },
      {
        title: 'مساحة الشراكة',
        items: [
          { label: 'البرامج المشتركة', href: '/dashboard/partner/programs', icon: Briefcase },
          { label: 'التقارير', href: '/dashboard/partner/reports', icon: PieChart },
          { label: 'المستندات', href: '/dashboard/partner/documents', icon: FolderOpen },
        ],
      },
      ...communicationsBlock(),
    ]
  }

  if (n === 'instructor') {
    const home = '/dashboard/instructor'
    return [
      { items: [{ label: 'لوحة التحكم', href: home, icon: LayoutDashboard }] },
      {
        title: 'التدريس والجلسات',
        items: [
          { label: 'دوراتي المسندة', href: '/dashboard/instructor/courses', icon: BookMarked },
          { label: 'ورشي', href: '/dashboard/instructor/workshops', icon: Sparkles },
          { label: 'جلساتي', href: '/dashboard/instructor/sessions', icon: Calendar },
          { label: 'الحضور', href: '/dashboard/instructor/attendance', icon: UserCheck },
          { label: 'التسليمات', href: '/dashboard/instructor/submissions', icon: ClipboardList },
          { label: 'كتالوج الدورات', href: '/courses', icon: BookOpen },
        ],
      },
      {
        title: 'الموارد',
        items: [{ label: 'المواد التعليمية', href: '/dashboard/resources', icon: FolderOpen }],
      },
      ...communicationsBlock(),
    ]
  }

  if (!n || n === 'student') {
    const home = '/dashboard/student'
    return [
      { items: [{ label: 'لوحة التحكم', href: home, icon: LayoutDashboard }] },
      {
        title: 'التعلّم',
        items: [
          { label: 'دوراتي', href: '/dashboard/student/courses', icon: BookOpen },
          { label: 'التسجيلات', href: '/dashboard/student/registrations', icon: ClipboardList },
          { label: 'دورات متاحة', href: '/dashboard/student/available-courses', icon: Sparkles },
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
      ...communicationsBlock(),
    ]
  }

  /* Unknown/non-standard slug: safest minimal shell */
  return [
    {
      items: [{ label: 'مركز حسابي', href: '/dashboard/profile', icon: LayoutDashboard }],
    },
    ...communicationsBlock(),
  ]
}

export function getSidebarItemsByRole(role: string | undefined | null): SidebarNavItem[] {
  return getSidebarByRole(role).flatMap((g) => g.items)
}

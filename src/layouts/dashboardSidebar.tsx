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
  FolderTree,
  GraduationCap,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  Layers,
  Mail,
  Megaphone,
  Percent,
  PieChart,
  Plug2,
  Receipt,
  Rocket,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  Webhook as WebhookIcon,
  Presentation,
} from 'lucide-react'
import { normalizeRole } from '@/utils/dashboardAccess'
import { isHidden } from '@/lib/featureFlags'

export type SidebarNavItem = { label: string; href: string; icon: ElementType }
export type SidebarNavGroup = {
  title?: string
  items: SidebarNavItem[]
  /** When true, renders a collapsible section (RTL). Default expanded. */
  collapsible?: boolean
  /** Controls initial state when no localStorage value is stored. Defaults to true (open). */
  defaultOpen?: boolean
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
  '/dashboard/super-admin/product-updates',
  '/dashboard/admin/operations',
  '/dashboard/tech-admin',
  '/dashboard/programs-manager',
  '/dashboard/operations-manager',
  '/dashboard/partnerships-manager',
  '/dashboard/community-manager',
  '/dashboard/section-lead',
  '/dashboard/learning',
  '/dashboard/members',
  // Student-prefixed top-level routes
  '/dashboard/student/certificates',
  '/dashboard/student/orders',
  '/dashboard/student/payment-success',
  '/dashboard/student/notifications',
  '/dashboard/student/calendar',
  '/dashboard/student/files',
  '/dashboard/student/assistant',
  '/dashboard/student/profile',
])

function membersNavItem(): SidebarNavItem {
  return { label: 'الأعضاء', href: '/dashboard/members', icon: UserCheck }
}

function resourceCenterBlock(opts: { collapsible?: boolean } = {}): SidebarNavGroup[] {
  return [
    {
      title: 'مركز الموارد',
      ...(opts.collapsible ? { collapsible: true, defaultOpen: false } : {}),
      items: [
        { label: 'مكتبة الدورات', href: '/dashboard/resources/courses', icon: BookMarked },
      ],
    },
  ]
}

function communicationsBlock(opts: { collapsible?: boolean } = {}): SidebarNavGroup[] {
  return [
    {
      title: 'التواصل والمعرفة',
      ...(opts.collapsible ? { collapsible: true, defaultOpen: false } : {}),
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
    // ── 1. الرئيسية ───────────────────────────────────────────────────────────
    {
      items: [{ label: 'لوحة التحكم', href: home, icon: LayoutDashboard }],
    },

    // ── 2. التعليم والبرامج ───────────────────────────────────────────────────
    {
      title: 'التعليم والبرامج',
      collapsible: true,
      defaultOpen: true,
      items: [
        { label: 'البرامج والدورات',  href: '/dashboard/admin/programs',                  icon: BookMarked    },
        { label: 'المسارات التعليمية',href: '/dashboard/super-admin/crud/learning-paths', icon: Layers        },
        { label: 'الجلسات',           href: '/dashboard/admin/lms/sessions',              icon: Calendar      },
        { label: 'الحضور',            href: '/dashboard/admin/lms/attendance',            icon: Users         },
        { label: 'الواجبات',          href: '/dashboard/admin/lms/assignments',           icon: ClipboardList },
        { label: 'المواد',            href: '/dashboard/admin/lms/materials',             icon: FolderOpen    },
        { label: 'التقييمات',         href: '/dashboard/admin/lms/evaluations',           icon: FileText      },
        { label: 'التقدّم',           href: '/dashboard/admin/lms/progress',              icon: BarChart3     },
        { label: 'الشهادات',          href: '/dashboard/admin/certificates',              icon: Award         },
        { label: 'الاختبارات',        href: '/dashboard/admin/quizzes',                   icon: ClipboardCheck},
        { label: 'الدروس',            href: '/dashboard/admin/lessons',                   icon: FileText      },
        { label: 'الوحدات التعليمية', href: '/dashboard/admin/modules',                   icon: BookOpen      },
      ],
    },

    // ── المعهد الإنجليزي ──────────────────────────────────────────────────────
    {
      title: 'المعهد الإنجليزي',
      collapsible: true,
      defaultOpen: true,
      items: [
        { label: 'لوحة إدارة المعهد', href: '/dashboard/admin/institute', icon: Building2 },
      ],
    },

    // ── 3. الطلاب والمستخدمون ────────────────────────────────────────────────
    {
      title: 'الطلاب والمستخدمون',
      collapsible: true,
      defaultOpen: true,
      items: [
        { label: 'قائمة الطلاب', href: '/dashboard/students',                      icon: GraduationCap },
        // Hide-before-delete (M2b): «التسجيلات» و«المستخدمون» point at AdminComingSoonPage
        // placeholder routes (/dashboard/registrations, /dashboard/users) — see the orphan
        // list in docs/01-assessment/route-map.md §6.2. Routes stay reachable by URL; links
        // reappear by flipping LEGACY_HIDDEN.comingSoonAdminLinks. Deletion gated later.
        ...(isHidden('comingSoonAdminLinks')
          ? []
          : [
              { label: 'التسجيلات',  href: '/dashboard/registrations', icon: ClipboardList },
              { label: 'المستخدمون', href: '/dashboard/users',         icon: UserCog       },
            ]),
        { label: 'المدرسون',     href: '/dashboard/super-admin/crud/instructors',   icon: UserCheck     },
        { label: 'طلبات الاحتياج (HR والإدارات)', href: '/dashboard/hr/incoming-requests', icon: Inbox         },
        { label: 'تقديم طلب احتیاج كادر', href: '/dashboard/hr/my-requests', icon: UserPlus },
      ],
    },

    // ── 4. الإدارة المالية ────────────────────────────────────────────────────
    {
      title: 'الإدارة المالية',
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'لوحة المالية',     href: '/dashboard/admin/finance',                          icon: Wallet        },
        { label: 'المدفوعات',       href: '/dashboard/admin/finance/payments',                 icon: Receipt       },
        { label: 'الطلبات',         href: '/dashboard/admin/finance/orders',                   icon: ClipboardList },
        { label: 'الفواتير',        href: '/dashboard/admin/finance/invoices',                 icon: FileText      },
        { label: 'المعاملات',       href: '/dashboard/admin/finance/transactions',             icon: BarChart3     },
        { label: 'المدفوعات اليدوية', href: '/dashboard/admin/finance/manual-payments',        icon: ClipboardCheck },
        { label: 'النقدية والحسابات', href: '/dashboard/admin/finance/accounts',               icon: Wallet        },
        { label: 'شجرة الحسابات (CoA)', href: '/dashboard/finance/chart-of-accounts',            icon: FolderTree    },
        { label: 'الكوبونات',          href: '/dashboard/admin/coupons',                         icon: Percent       },
        { label: 'الطلبات المالية الداخلية', href: '/dashboard/admin/finance/financial-requests', icon: FileText  },
        { label: 'طلبات الموارد البشرية', href: '/dashboard/department/hr-requests', icon: Users },
        { label: 'اعتماد البرامج المالية',  href: '/dashboard/finance/program-approvals',       icon: ShieldCheck },
      ],
    },

    // ── 5. الدعم والتواصل ─────────────────────────────────────────────────────
    {
      title: 'الدعم والتواصل',
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'الدعم / التذاكر',         href: '/dashboard/admin/support-tickets',      icon: ShieldQuestion },
        { label: 'طلبات التطوع',            href: '/dashboard/admin/volunteers',            icon: HeartHandshake },
        { label: 'المتطوعون',               href: '/dashboard/hr/volunteers',               icon: UserCheck      },
        { label: 'المتطوعون المقبولون',     href: '/dashboard/volunteer',                   icon: Users          },
        { label: 'الشركاء',                 href: '/dashboard/admin/partners',              icon: Briefcase      },
        { label: 'طلبات الشراكة',           href: '/dashboard/admin/partnership-requests', icon: HeartHandshake },
        { label: 'النماذج',                 href: '/dashboard/admin/forms',                 icon: FileText       },
      ],
    },

    // ── 6. النظام والإعدادات ─────────────────────────────────────────────────
    {
      title: 'النظام والإعدادات',
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'الإعدادات',         href: '/dashboard/settings',                      icon: Settings     },
        { label: 'إعدادات الحضور',    href: '/dashboard/super-admin/attendance-settings', icon: ClipboardCheck },
        { label: 'البريد الإلكتروني', href: '/dashboard/super-admin/email-settings',    icon: Mail         },
        { label: 'سجلات البريد',      href: '/dashboard/super-admin/email-logs',        icon: ScrollText   },
        { label: 'الإشعارات',         href: '/dashboard/notifications',                 icon: Bell         },
        { label: 'تفضيلات الإشعارات', href: '/dashboard/settings/notifications',        icon: SlidersHorizontal },
        { label: 'التقويم',           href: '/dashboard/admin/calendar',                icon: CalendarDays },
        { label: 'الملفات',           href: '/documents',                               icon: FolderOpen   },
        { label: 'المساعد الذكي',     href: '/ai',                                      icon: Bot          },
      ],
    },

    ...resourceCenterBlock({ collapsible: true }),

    // ── الحساب ───────────────────────────────────────────────────────────────
    {
      title: 'الحساب',
      items: [{ label: 'الملف الشخصي', href: '/dashboard/profile', icon: UserCog }],
    },
  ]
}

/** Master navigation for `super_admin` — full platform reach + CRUD anchors. */
function superMasterSidebar(): SidebarNavGroup[] {
  return [
    {
      items: [
        { label: 'نظرة عامة', href: '/dashboard/super-admin', icon: Crown },
        { label: 'سجل التغييرات', href: '/dashboard/super-admin/audit-logs', icon: ScrollText },
        { label: 'الطلبات المالية', href: '/dashboard/super-admin/financial-requests', icon: Wallet },
        { label: 'طلبات الموارد البشرية', href: '/dashboard/department/hr-requests', icon: Users },
      ],
    },
    {
      title: 'إدارة الكيانات (CRUD)',
      collapsible: true,
      defaultOpen: true,
      items: [
        { label: 'المستخدمون', href: '/dashboard/super-admin/crud/users', icon: Users },
        { label: 'الأدوار والصلاحيات', href: '/dashboard/super-admin/crud/roles', icon: ShieldCheck },
        { label: 'الإدارات', href: '/dashboard/super-admin/crud/departments', icon: Building2 },
        { label: 'الفريق', href: '/dashboard/super-admin/crud/team', icon: UserCheck },
        membersNavItem(),
        { label: 'الطلاب', href: '/dashboard/super-admin/crud/students', icon: GraduationCap },
        { label: 'المدربون', href: '/dashboard/super-admin/crud/instructors', icon: UserCog },
        { label: 'البرامج', href: '/dashboard/super-admin/crud/programs', icon: BookMarked },
        { label: 'المسارات التعليمية', href: '/dashboard/super-admin/crud/learning-paths', icon: BookOpen },
        { label: 'الورش', href: '/dashboard/super-admin/crud/workshops', icon: Sparkles },
        { label: 'التسجيلات', href: '/dashboard/super-admin/crud/registrations', icon: ClipboardList },
        { label: 'الشراكات', href: '/dashboard/super-admin/crud/partners', icon: HeartHandshake },
        { label: 'طلبات التطوع', href: '/dashboard/super-admin/volunteer-requests', icon: HeartHandshake },
        { label: 'سفراء التحول الرقمي', href: '/dashboard/super-admin/ambassador-applications', icon: Star },
        { label: 'طلبات البرامج التدريبية', href: '/dashboard/admin/workshop-requests', icon: Presentation },
      ],
    },
    {
      title: 'المعهد الإنجليزي',
      collapsible: true,
      defaultOpen: true,
      items: [
        { label: 'لوحة إدارة المعهد', href: '/dashboard/admin/institute', icon: Building2 },
      ],
    },
    {
      title: 'لوحات الأدوار (وصول كامل)',
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'الإدارة العامة',          href: '/dashboard/admin',              icon: LayoutDashboard },
        { label: 'الطالب',                  href: '/dashboard/student',             icon: GraduationCap   },
        { label: 'المدرب',                  href: '/dashboard/instructor',          icon: UserCheck       },
        { label: 'المالية',                 href: '/dashboard/finance',             icon: Wallet          },
        { label: 'الموارد البشرية',         href: '/dashboard/hr',                  icon: Briefcase       },
        { label: 'الجودة والحوكمة',         href: '/dashboard/quality',             icon: ClipboardCheck  },
        { label: 'التسويق والإعلام',        href: '/dashboard/marketing',           icon: Megaphone       },
        { label: 'الدعم الفني',             href: '/dashboard/support',             icon: ShieldQuestion  },
        { label: 'الشركاء',                 href: '/dashboard/partner',             icon: HeartHandshake  },
        { label: 'المتطوعون',               href: '/dashboard/hr/volunteers',       icon: UserCheck       },
        { label: 'المتطوعون المقبولون',     href: '/dashboard/volunteer',           icon: Users           },
        { label: 'مساحة الإدارات',          href: '/dashboard/department',          icon: Building2       },
        { label: 'اللوحة التنفيذية',        href: '/dashboard/executive',           icon: PieChart        },
        { label: 'مدير البرامج',            href: '/dashboard/admin/programs',      icon: BookMarked      },
        { label: 'مدير العمليات',           href: '/dashboard/admin/operations',    icon: Sparkles        },
        { label: 'مدير الشراكات',          href: '/dashboard/admin/partners',      icon: HeartHandshake  },
        { label: 'مدير المجتمع',           href: '/dashboard/admin/volunteers',    icon: Users           },
      ],
    },
    {
      title: 'العمليات والإيرادات',
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'المدفوعات', href: '/dashboard/finance/payments', icon: Wallet },
        { label: 'المعاملات المالية', href: '/dashboard/finance/transactions', icon: BarChart3 },
        { label: 'الكوبونات', href: '/dashboard/admin/coupons', icon: Percent },
        { label: 'التقارير والتحليلات', href: '/dashboard/admin/reports', icon: FileBarChart },
        { label: 'شركاء التشغيل', href: '/dashboard/admin/partners', icon: Briefcase },
        { label: 'شجرة الحسابات (CoA)', href: '/dashboard/finance/chart-of-accounts', icon: FolderTree },
      ],
    },
    {
      title: 'المنصّة',
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'الإعدادات', href: '/dashboard/settings/notifications', icon: Settings },
        { label: 'الملف الشخصي', href: '/dashboard/profile', icon: UserCog },
      ],
    },
    ...resourceCenterBlock({ collapsible: true }),
    ...communicationsBlock({ collapsible: true }),
  ]
}

/** Dedicated sidebar for tech_admin — 7 collapsible groups, full platform reach. */
function techAdminSidebar(): SidebarNavGroup[] {
  return [
    // ── Group 1: لوحة التقنية ──────────────────────────────────────────────
    {
      title: 'لوحة التقنية',
      collapsible: true,
      defaultOpen: true,
      items: [
        { label: 'لوحة التحكم',     href: '/dashboard/tech-admin',              icon: LayoutDashboard },
        { label: 'حالة النظام',      href: '/dashboard/admin/platform-scale',    icon: Cpu             },
        { label: 'سجلات التدقيق',   href: '/dashboard/super-admin/audit-logs',  icon: ScrollText      },
      ],
    },
    // ── Group 2: المستخدمون والصلاحيات ────────────────────────────────────
    {
      title: 'المستخدمون والصلاحيات',
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'المستخدمون',         href: '/dashboard/super-admin/crud/users',        icon: Users       },
        { label: 'الطلاب',             href: '/dashboard/super-admin/crud/students',     icon: GraduationCap },
        { label: 'المدرسون',           href: '/dashboard/super-admin/crud/instructors',  icon: UserCheck   },
        { label: 'الأدوار والصلاحيات', href: '/dashboard/super-admin/crud/roles',        icon: ShieldCheck },
        { label: 'الأقسام',            href: '/dashboard/super-admin/crud/departments',  icon: Building2   },
        { label: 'الفريق',             href: '/dashboard/super-admin/crud/team',         icon: UserCog     },
        membersNavItem(),
      ],
    },
    // ── Group 3: التعليم والمسارات ────────────────────────────────────────
    {
      title: 'التعليم والمسارات',
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'البرامج والدورات',   href: '/dashboard/admin/programs',                  icon: BookMarked    },
        { label: 'المسارات التعليمية', href: '/dashboard/super-admin/crud/learning-paths', icon: Layers        },
        { label: 'الجلسات',            href: '/dashboard/admin/lms/sessions',              icon: Calendar      },
        { label: 'الحضور',             href: '/dashboard/admin/lms/attendance',            icon: Users         },
        { label: 'الواجبات',           href: '/dashboard/admin/lms/assignments',           icon: ClipboardList },
        { label: 'المواد',             href: '/dashboard/admin/lms/materials',             icon: FolderOpen    },
        { label: 'التقييمات',          href: '/dashboard/admin/lms/evaluations',           icon: FileText      },
        { label: 'التقدّم',            href: '/dashboard/admin/lms/progress',             icon: BarChart3     },
        { label: 'الشهادات',           href: '/dashboard/admin/certificates',             icon: Award         },
        { label: 'الاختبارات',         href: '/dashboard/admin/quizzes',                  icon: ClipboardCheck},
        { label: 'الدروس',             href: '/dashboard/admin/lessons',                  icon: FileText      },
        { label: 'الوحدات التعليمية',  href: '/dashboard/admin/modules',                  icon: BookOpen      },
      ],
    },
    // ── Group 4: العمليات والطلبات ────────────────────────────────────────
    {
      title: 'العمليات والطلبات',
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'طلبات التطوع',            href: '/dashboard/super-admin/volunteer-requests',         icon: HeartHandshake },
        { label: 'سفراء التحول الرقمي',    href: '/dashboard/super-admin/ambassador-applications',    icon: Star           },
        { label: 'المتطوعون',               href: '/dashboard/hr/volunteers',                          icon: UserCheck      },
        { label: 'المتطوعون المقبولون',     href: '/dashboard/volunteer',                             icon: Users          },
        { label: 'الشركاء',                  href: '/dashboard/admin/partners',                icon: Briefcase      },
        { label: 'طلبات الشراكة',           href: '/dashboard/admin/partnership-requests',    icon: HeartHandshake },
        { label: 'طلبات البرامج التدريبية', href: '/dashboard/admin/workshop-requests',       icon: Presentation   },
        { label: 'المهام',                   href: '/dashboard/admin/tasks',                   icon: ClipboardList  },
        { label: 'الاجتماعات',              href: '/dashboard/admin/meetings',                icon: Calendar       },
        { label: 'التقويم',                 href: '/dashboard/admin/calendar',               icon: CalendarDays   },
        { label: 'النماذج',                  href: '/dashboard/admin/forms',                   icon: FileText       },
        { label: 'الدعم / التذاكر',         href: '/dashboard/admin/support-tickets',         icon: ShieldQuestion },
      ],
    },
    // ── Group 5: المالية والجودة والتقارير ───────────────────────────────
    {
      title: 'المالية والجودة والتقارير',
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'المالية',             href: '/dashboard/admin/finance',          icon: Wallet         },
        { label: 'الكوبونات',           href: '/dashboard/admin/coupons',          icon: Percent        },
        { label: 'المنح',               href: '/dashboard/admin/scholarships',     icon: GraduationCap  },
        { label: 'الجودة',              href: '/dashboard/admin/quality',          icon: ClipboardCheck },
        { label: 'مؤشرات الأداء',       href: '/dashboard/admin/kpi',              icon: PieChart       },
        { label: 'التقارير والتحليلات', href: '/dashboard/admin/reports',          icon: FileBarChart   },
      ],
    },
    // ── Group 6: النظام والتكاملات ────────────────────────────────────────
    {
      title: 'النظام والتكاملات',
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'تحديثات المنصة',     href: '/dashboard/super-admin/product-updates',  icon: Megaphone         },
        { label: 'الإعدادات',          href: '/dashboard/settings/notifications',     icon: Settings          },
        { label: 'إعدادات الحضور',     href: '/dashboard/super-admin/attendance-settings', icon: ClipboardCheck },
        { label: 'البريد الإلكتروني',  href: '/dashboard/super-admin/email-settings', icon: Mail              },
        { label: 'سجلات البريد',       href: '/dashboard/super-admin/email-logs',     icon: ScrollText        },
        { label: 'الإشعارات',          href: '/dashboard/notifications',              icon: Bell              },
        { label: 'الملفات',            href: '/documents',                            icon: FolderOpen        },
        { label: 'التكاملات',          href: '/dashboard/admin/integrations',         icon: Plug2             },
        { label: 'الويبهوكس',          href: '/dashboard/admin/webhooks',             icon: WebhookIcon       },
        { label: 'API Tokens',         href: '/dashboard/admin/developer/api-tokens', icon: Code2             },
      ],
    },
    // ── Group 7: الحساب ───────────────────────────────────────────────────
    {
      title: 'الحساب',
      items: [
        { label: 'الملف الشخصي', href: '/dashboard/profile', icon: UserCog },
      ],
    },
    ...resourceCenterBlock({ collapsible: true }),
  ]
}

export interface SidebarContext {
  /** True when the instructor teaches at least one course with requires_placement_test=true — gates المعهد الإنجليزي. Source of truth: courses.requires_placement_test, never role/department/title. */
  hasEnglishCourses?: boolean
}

/** Role-specific sidebar navigation (Arabic RTL labels). */
export function getSidebarByRole(roleRaw?: string | null, ctx?: SidebarContext): SidebarNavGroup[] {
  const n = normalizeRole(roleRaw ?? null)

  if (n === 'super_admin') return superMasterSidebar()

  if (n === 'tech_admin') return techAdminSidebar()

  if (n === 'admin') return adminSuperAdminSidebar('/dashboard/admin')

  if (n === 'executive_admin') {
    return [
      { items: [{ label: 'اللوحة التنفيذية', href: '/dashboard/executive', icon: LayoutDashboard }] },
      {
        title: 'القرار والمتابعة',
        collapsible: true,
        defaultOpen: true,
        items: [
          { label: 'لوحة العمليات', href: '/dashboard/executive/operations', icon: Sparkles },
          { label: 'مؤشرات الأداء', href: '/dashboard/executive/kpi', icon: PieChart },
          { label: 'التقارير التحليلية', href: '/dashboard/executive/reports', icon: FileBarChart },
          { label: 'البرامج والدورات', href: '/dashboard/executive/programs', icon: BookMarked },
          { label: 'طلبات البرامج التدريبية', href: '/dashboard/admin/workshop-requests', icon: Presentation },
          { label: 'الطلبات المالية', href: '/dashboard/executive/financial-requests', icon: Wallet },
          { label: 'طلبات الموارد البشرية', href: '/dashboard/department/hr-requests', icon: Users },
          membersNavItem(),
        ],
      },
      ...resourceCenterBlock({ collapsible: true }),
      ...communicationsBlock({ collapsible: true }),
    ]
  }

  if (n === 'finance_manager') {
    return [
      { items: [{ label: 'لوحة المالية', href: '/dashboard/finance', icon: Wallet }] },
      {
        title: 'العمليات المالية',
        collapsible: true,
        defaultOpen: true,
        items: [
          { label: 'المدفوعات',           href: '/dashboard/finance/payments',        icon: Receipt       },
          { label: 'المدفوعات اليدوية',  href: '/dashboard/finance/manual-payments', icon: ClipboardCheck },
          { label: 'الطلبات',            href: '/dashboard/finance/orders',          icon: ClipboardList },
          { label: 'الفواتير',           href: '/dashboard/finance/invoices',        icon: FileText      },
          { label: 'المعاملات',          href: '/dashboard/finance/transactions',    icon: BarChart3     },
          { label: 'النقدية والحسابات',  href: '/dashboard/finance/accounts',        icon: Wallet        },
          { label: 'شجرة الحسابات',      href: '/dashboard/finance/chart-of-accounts', icon: FolderTree  },
          { label: 'الكوبونات',          href: '/dashboard/admin/coupons',            icon: Percent      },
          { label: 'الطلبات المالية الداخلية', href: '/dashboard/finance/financial-requests', icon: Wallet },
          { label: 'طلبات الموارد البشرية', href: '/dashboard/department/hr-requests', icon: Users },
          { label: 'اعتماد البرامج المالية',  href: '/dashboard/finance/program-approvals', icon: ShieldCheck },
          { label: 'طلبات البرامج التدريبية', href: '/dashboard/admin/workshop-requests', icon: Presentation },
          membersNavItem(),
        ],
      },
      ...resourceCenterBlock({ collapsible: true }),
      ...communicationsBlock({ collapsible: true }),
    ]
  }

  if (n === 'quality_manager') {
    return [
      {
        items: [
          { label: 'لوحة الجودة', href: '/dashboard/quality', icon: LayoutDashboard },
        ],
      },
      {
        title: 'المراجعة والتقييم',
        collapsible: true,
        defaultOpen: true,
        items: [
          { label: 'مراجعات البرامج', href: '/dashboard/quality/reviews', icon: ClipboardCheck },
          { label: 'طلبات البرامج التدريبية', href: '/dashboard/admin/workshop-requests', icon: Presentation },
        ],
      },
      {
        title: 'الإدارة والمتابعة',
        collapsible: true,
        defaultOpen: false,
        items: [
          { label: 'الحوادث', href: '/dashboard/quality/incidents', icon: ShieldAlert },
          { label: 'إجراءات التحسين', href: '/dashboard/quality/corrective-actions', icon: TrendingUp },
          { label: 'قوائم التحقق', href: '/dashboard/quality/checklists', icon: ClipboardList },
        ],
      },
      {
        title: 'الحوكمة والامتثال',
        collapsible: true,
        defaultOpen: false,
        items: [
          { label: 'الامتثال', href: '/dashboard/quality/compliance', icon: ShieldCheck },
          { label: 'الحوكمة', href: '/dashboard/quality/governance', icon: FolderLock },
          { label: 'سجلات التدقيق', href: '/dashboard/quality/audit-logs', icon: ScrollText },
        ],
      },
      {
        title: 'التحليل والفريق',
        collapsible: true,
        defaultOpen: false,
        items: [
          { label: 'التقارير', href: '/dashboard/quality/reports', icon: BarChart3 },
          { label: 'الفريق', href: '/dashboard/quality/team', icon: Users },
        ],
      },
      ...resourceCenterBlock({ collapsible: true }),
      ...communicationsBlock({ collapsible: true }),
    ]
  }

  if (n === 'hr_manager') {
    return [
      { items: [{ label: 'لوحة الموارد البشرية', href: '/dashboard/hr', icon: LayoutDashboard }] },
      {
        title: 'طلبات الاحتياج الكادر',
        items: [
          { label: 'طلبات الإدارات الواردة (HR)', href: '/dashboard/hr/incoming-requests', icon: Inbox },
          { label: 'تقديم طلب احتیاج قسم HR (للإدارة العليا)', href: '/dashboard/hr/my-requests', icon: UserPlus },
        ],
      },
      {
        title: 'الفريق والأعضاء',
        collapsible: true,
        defaultOpen: true,
        items: [
          { label: 'الأعضاء',      href: '/dashboard/members',  icon: Users      },
          { label: 'أعضاء الفريق', href: '/dashboard/hr/team',  icon: UserCheck  },
        ],
      },
      {
        title: 'التوظيف والمتطوعين',
        collapsible: true,
        defaultOpen: false,
        items: [
          { label: 'طلبات التطوع',          href: '/dashboard/hr/volunteer-requests',          icon: HeartHandshake },
          { label: 'المتطوعون',              href: '/dashboard/hr/volunteers',                  icon: UserCheck      },
          { label: 'المتطوعون المقبولون',    href: '/dashboard/volunteer',                      icon: Award          },
          { label: 'سفراء التحول الرقمي',   href: '/dashboard/hr/ambassador-applications',      icon: Star           },
          { label: 'المدربون',               href: '/dashboard/hr/instructors',        icon: GraduationCap  },
        ],
      },
      {
        title: 'التشغيل والموارد',
        collapsible: true,
        defaultOpen: false,
        items: [
          { label: 'الإدارات والأدوار',       href: '/dashboard/hr/departments', icon: Building2    },
          { label: 'التأهيل والانضمام',        href: '/dashboard/hr/onboarding',  icon: Rocket       },
          { label: 'مهام الموارد البشرية',     href: '/dashboard/hr/tasks',       icon: ClipboardCheck },
          { label: 'ملفات الموارد البشرية',    href: '/dashboard/hr/documents',   icon: FolderLock   },
        ],
      },
      ...resourceCenterBlock({ collapsible: true }),
      ...communicationsBlock({ collapsible: true }),
    ]
  }

  if (n === 'marketing_manager') {
    return [
      {
        items: [
          { label: 'التسويق', href: '/dashboard/marketing', icon: Megaphone },
          { label: 'طلبات البرامج التدريبية', href: '/dashboard/admin/workshop-requests', icon: Presentation },
          membersNavItem(),
        ],
      },
      ...resourceCenterBlock(),
      ...communicationsBlock(),
    ]
  }

  if (n === 'support_agent') {
    return [
      {
        items: [
          { label: 'تذاكر الدعم', href: '/dashboard/support', icon: ShieldQuestion },
          membersNavItem(),
        ],
      },
      ...resourceCenterBlock(),
      ...communicationsBlock(),
    ]
  }

  if (n === 'volunteer') {
    return [
      {
        items: [
          { label: 'بياناتي التطوعية', href: '/dashboard/volunteer/hr-profile', icon: UserCheck },
          { label: 'طلبات التطوع', href: '/dashboard/ops/volunteers', icon: HeartHandshake },
          membersNavItem(),
        ],
      },
      ...resourceCenterBlock(),
      ...communicationsBlock(),
    ]
  }

  if (n === 'department_manager') {
    return [
      { items: [{ label: 'إدارتي', href: '/dashboard/department', icon: Building2 }] },
      {
        title: 'التعلّم والبرامج والطلبات',
        items: [
          { label: 'البرامج والدورات', href: '/dashboard/department/programs', icon: BookMarked },
          { label: 'الطلبات المالية', href: '/dashboard/department/financial-requests', icon: Wallet },
          { label: 'طلبات الموارد البشرية', href: '/dashboard/department/hr-requests', icon: Users },
          { label: 'طلبات البرامج التدريبية', href: '/dashboard/admin/workshop-requests', icon: Presentation },
          membersNavItem(),
        ],
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
          membersNavItem(),
        ],
      },
      ...communicationsBlock(),
    ]
  }

  if (n === 'instructor') {
    const home = '/dashboard/instructor'
    return [
      {
        items: [
          { label: 'لوحة التحكم',   href: home,                                  icon: LayoutDashboard },
          ...(ctx?.hasEnglishCourses ? [{ label: 'المعهد الإنجليزي', href: '/dashboard/instructor/institute', icon: Building2 }] : []),
          { label: 'دوراتي',        href: '/dashboard/instructor/courses',         icon: BookMarked      },
          { label: 'مساراتي التعليمية', href: '/dashboard/instructor/learning-paths', icon: GraduationCap },
          { label: 'الجلسات',       href: '/dashboard/instructor/sessions',        icon: Calendar        },
          { label: 'الحضور',        href: '/dashboard/instructor/attendance',       icon: UserCheck       },
          { label: 'التسليمات',     href: '/dashboard/instructor/submissions',      icon: ClipboardList   },
          ...(ctx?.hasEnglishCourses ? [{ label: 'الاختبارات القصيرة', href: '/dashboard/instructor/quizzes', icon: ClipboardCheck }] : []),
          { label: 'الإشعارات',     href: '/dashboard/notifications',              icon: Bell            },
          { label: 'التقويم',       href: '/calendar',                             icon: CalendarDays    },
          { label: 'الملفات',       href: '/documents',                            icon: FolderOpen      },
          { label: 'الملف الشخصي',  href: '/dashboard/profile',                   icon: UserCog         },
        ],
      },
      ...resourceCenterBlock(),
    ]
  }

  if (!n || n === 'student') {
    return [
      {
        items: [
          { label: 'لوحة التعلم',    href: '/dashboard/student',                  icon: LayoutDashboard },
          { label: 'المعهد الإنجليزي',href: '/dashboard/student/institute',        icon: Building2       },
          { label: 'دوراتي',          href: '/dashboard/student/courses',           icon: BookOpen        },
          { label: 'مساراتي التعليمية', href: '/dashboard/student/learning-paths', icon: GraduationCap  },
          { label: 'الشهادات',       href: '/dashboard/student/certificates',      icon: Award           },
          { label: 'الإشعارات',      href: '/dashboard/student/notifications',     icon: Bell            },
          { label: 'التقويم',        href: '/dashboard/student/calendar',          icon: CalendarDays    },
          { label: 'الملفات',        href: '/dashboard/student/files',             icon: FolderOpen      },
          { label: 'المساعد الذكي',  href: '/dashboard/student/assistant',         icon: Bot             },
          { label: 'الملف الشخصي',   href: '/dashboard/student/profile',           icon: UserCog         },
          { label: 'طلباتي وفواتيري', href: '/dashboard/student/orders',            icon: Receipt         },
        ],
      },
    ]
  }

  if (n === 'programs_manager') {
    return [
      {
        title: 'لوحة البرامج',
        collapsible: true,
        defaultOpen: true,
        items: [
          { label: 'لوحة التحكم',     href: '/dashboard/programs-manager', icon: LayoutDashboard },
          { label: 'مؤشرات البرامج',  href: '/dashboard/admin/kpi',        icon: PieChart        },
          { label: 'التقارير',         href: '/dashboard/admin/reports',    icon: FileBarChart    },
        ],
      },
      {
        title: 'البرامج والمسارات',
        collapsible: true,
        defaultOpen: false,
        items: [
          { label: 'الدورات والبرامج',       href: '/dashboard/admin/programs',                  icon: GraduationCap },
          { label: 'المسارات التعليمية',   href: '/dashboard/programs-manager/learning-paths', icon: Layers        },
          { label: 'التسجيلات',            href: '/dashboard/admin/registrations',             icon: UserCheck     },
          { label: 'طلبات البرامج التدريبية', href: '/dashboard/admin/workshop-requests',      icon: Presentation  },
        ],
      },
      {
        title: 'إدارة التعلم',
        collapsible: true,
        defaultOpen: false,
        items: [
          { label: 'الجلسات',    href: '/dashboard/admin/lms/sessions',    icon: Calendar      },
          { label: 'الواجبات',   href: '/dashboard/admin/lms/assignments',  icon: ClipboardList },
          { label: 'المواد',     href: '/dashboard/admin/lms/materials',    icon: FolderOpen    },
          { label: 'التقييمات', href: '/dashboard/admin/lms/evaluations',  icon: FileText      },
          { label: 'التقدّم',    href: '/dashboard/admin/lms/progress',     icon: BarChart3     },
          { label: 'الحضور',     href: '/dashboard/admin/lms/attendance',   icon: Users         },
        ],
      },
      {
        title: 'التواصل',
        collapsible: true,
        defaultOpen: false,
        items: [
          { label: 'التقويم',       href: '/dashboard/admin/calendar',      icon: CalendarDays },
          { label: 'الإشعارات',     href: '/dashboard/notifications',        icon: Bell         },
          { label: 'الملف الشخصي', href: '/dashboard/profile',              icon: UserCog      },
        ],
      },
      ...resourceCenterBlock({ collapsible: true }),
    ]
  }

  if (n === 'operations_manager') {
    return [
      { items: [{ label: 'لوحة التشغيل والعمليات', href: '/dashboard/operations-manager', icon: Sparkles }] },
      {
        title: 'إدارة العمليات',
        items: [
          { label: 'الإدارات',   href: '/dashboard/admin/departments', icon: Building2     },
          { label: 'المهام',     href: '/dashboard/admin/tasks',        icon: ClipboardList },
          { label: 'الاجتماعات', href: '/dashboard/admin/meetings',     icon: Calendar      },
          { label: 'النماذج',    href: '/dashboard/admin/forms',        icon: FileText      },
        ],
      },
      {
        title: 'المتابعة والتقارير',
        items: [
          { label: 'مؤشرات الأداء', href: '/dashboard/admin/kpi',     icon: PieChart     },
          { label: 'التقارير',       href: '/dashboard/admin/reports', icon: FileBarChart },
          { label: 'طلبات البرامج التدريبية', href: '/dashboard/admin/workshop-requests', icon: Presentation },
          membersNavItem(),
        ],
      },
      ...resourceCenterBlock({ collapsible: true }),
      ...communicationsBlock(),
    ]
  }

  if (n === 'partnerships_manager') {
    return [
      { items: [{ label: 'لوحة الشراكات والعلاقات', href: '/dashboard/partnerships-manager', icon: HeartHandshake }] },
      {
        title: 'الشراكات والعلاقات',
        items: [
          { label: 'طلبات الشراكة', href: '/dashboard/admin/partnership-requests', icon: Briefcase   },
          { label: 'البرامج',       href: '/dashboard/admin/programs',              icon: BookMarked  },
          { label: 'التقارير',      href: '/dashboard/admin/reports',               icon: FileBarChart },
          { label: 'طلبات البرامج التدريبية', href: '/dashboard/admin/workshop-requests', icon: Presentation },
          membersNavItem(),
        ],
      },
      ...resourceCenterBlock({ collapsible: true }),
      ...communicationsBlock(),
    ]
  }

  if (n === 'community_manager') {
    return [
      { items: [{ label: 'لوحة المجتمع والصحة', href: '/dashboard/community-manager', icon: HeartHandshake }] },
      {
        title: 'المجتمع والنشاطات',
        items: [
          { label: 'المتطوعون', href: '/dashboard/admin/volunteers', icon: Users         },
          { label: 'المهام',    href: '/dashboard/admin/tasks',      icon: ClipboardList },
          { label: 'الاجتماعات', href: '/dashboard/admin/meetings', icon: Calendar      },
          { label: 'النماذج',   href: '/dashboard/admin/forms',     icon: FileText      },
        ],
      },
      {
        title: 'التقارير والمتابعة',
        items: [
          { label: 'التقارير', href: '/dashboard/admin/reports', icon: FileBarChart },
          { label: 'طلبات البرامج التدريبية', href: '/dashboard/admin/workshop-requests', icon: Presentation },
          membersNavItem(),
        ],
      },
      ...resourceCenterBlock({ collapsible: true }),
      ...communicationsBlock(),
    ]
  }

  if (n === 'section_lead') {
    return [
      { items: [{ label: 'لوحة قائد القسم', href: '/dashboard/section-lead', icon: LayoutDashboard }] },
      {
        title: 'نشاطات القسم',
        items: [
          { label: 'المهام',     href: '/dashboard/admin/tasks',    icon: ClipboardList },
          { label: 'الاجتماعات', href: '/dashboard/admin/meetings', icon: Calendar      },
        ],
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

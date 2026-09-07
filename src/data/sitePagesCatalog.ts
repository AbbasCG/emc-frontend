/**
 * Catalog of all EMC site pages/screens.
 * Used to build the per-user page-access override UI.
 */

export type PageGroup = {
  id: string
  titleAr: string
  pages: SitePage[]
}

export type SitePage = {
  id: string
  titleAr: string
  path: string
  /** Role slugs that have access by default (empty = public) */
  defaultRoles: string[]
  icon?: string
}

// ─── Public pages ──────────────────────────────────────────────────────────────
const publicPages: SitePage[] = [
  { id: 'home',          titleAr: 'الصفحة الرئيسية',  path: '/',              defaultRoles: [] },
  { id: 'courses',       titleAr: 'الدورات',           path: '/courses',       defaultRoles: [] },
  { id: 'programs',      titleAr: 'البرامج والمسارات', path: '/programs',      defaultRoles: [] },
  { id: 'tracks',        titleAr: 'المسارات التعليمية',path: '/tracks',        defaultRoles: [] },
  { id: 'instructors',   titleAr: 'المدربون',           path: '/instructors',   defaultRoles: [] },
  { id: 'departments',   titleAr: 'الإدارات',          path: '/departments',   defaultRoles: [] },
  { id: 'about',         titleAr: 'عن EMC',            path: '/about',         defaultRoles: [] },
  { id: 'contact',       titleAr: 'تواصل معنا',        path: '/contact',       defaultRoles: [] },
  { id: 'partnerships',  titleAr: 'الشراكات',          path: '/partnerships',  defaultRoles: [] },
  { id: 'volunteer',     titleAr: 'التطوع',            path: '/volunteer',     defaultRoles: [] },
  { id: 'platform',      titleAr: 'المنصة',            path: '/platform',      defaultRoles: [] },
  { id: 'login',         titleAr: 'تسجيل الدخول',     path: '/login',         defaultRoles: [] },
  { id: 'signup',        titleAr: 'إنشاء حساب',       path: '/signup',        defaultRoles: [] },
]

// ─── Operations & Tasks (التشغيل والمهام) ──────────────────────────────────────
const operationsPages: SitePage[] = [
  { id: 'ops_board',          titleAr: 'لوحة التشغيل',          path: '/dashboard/operations/board',          defaultRoles: ['admin', 'super_admin', 'operations_manager', 'executive_admin', 'tech_admin'] },
  { id: 'ops_meetings',       titleAr: 'تقارير الاجتماعات',      path: '/dashboard/operations/meeting-reports', defaultRoles: ['admin', 'super_admin', 'operations_manager', 'community_manager'] },
  { id: 'ops_weekly_reports', titleAr: 'التقارير الأسبوعية',     path: '/dashboard/operations/weekly-reports',  defaultRoles: ['admin', 'super_admin', 'operations_manager'] },
  { id: 'ops_impact_points',  titleAr: 'نقاط الأثر',             path: '/dashboard/operations/impact-points',   defaultRoles: ['admin', 'super_admin', 'operations_manager', 'community_manager'] },
  { id: 'ops_tasks_list',     titleAr: 'قائمة المهام',           path: '/dashboard/admin/tasks',               defaultRoles: ['admin', 'super_admin', 'operations_manager'] },
  { id: 'ops_tasks_kanban',   titleAr: 'كانبان المهام',          path: '/dashboard/admin/tasks/kanban',        defaultRoles: ['admin', 'super_admin', 'operations_manager'] },
  { id: 'ops_tasks_my',       titleAr: 'مهامي الفردية',          path: '/dashboard/admin/tasks/my',            defaultRoles: ['admin', 'super_admin', 'operations_manager'] },
  { id: 'ops_tasks_overdue',  titleAr: 'المهام المتأخرة',        path: '/dashboard/admin/tasks/overdue',       defaultRoles: ['admin', 'super_admin', 'operations_manager'] },
  { id: 'ops_meetings_list',  titleAr: 'سجل الاجتماعات',        path: '/dashboard/admin/meetings',            defaultRoles: ['admin', 'super_admin', 'operations_manager'] },
  { id: 'ops_forms',          titleAr: 'إدارة النماذج',          path: '/dashboard/admin/forms',               defaultRoles: ['admin', 'super_admin', 'operations_manager'] },
  { id: 'ops_analytics',      titleAr: 'تحليلات الزوار',        path: '/dashboard/admin/visitor-analytics',   defaultRoles: ['admin', 'super_admin', 'operations_manager', 'marketing_manager'] },
  { id: 'ops_marketing',      titleAr: 'التسويق والحملات',       path: '/dashboard/admin/marketing',           defaultRoles: ['admin', 'super_admin', 'marketing_manager'] },
]

// ─── Financial Management (الإدارة المالية) ────────────────────────────────────
const financePages: SitePage[] = [
  { id: 'finance_dept_reqs',   titleAr: 'الطلبات المالية للإدارات', path: '/dashboard/department/financial-requests', defaultRoles: ['department_manager', 'admin', 'super_admin', 'finance_manager'] },
  { id: 'finance_home',        titleAr: 'لوحة المالية العامة',     path: '/dashboard/admin/finance',                   defaultRoles: ['finance_manager', 'admin', 'super_admin'] },
  { id: 'finance_payments',    titleAr: 'إدارة المدفوعات',         path: '/dashboard/admin/finance/payments',          defaultRoles: ['finance_manager', 'admin', 'super_admin'] },
  { id: 'finance_transactions',titleAr: 'المعاملات المالية',       path: '/dashboard/admin/finance/transactions',      defaultRoles: ['finance_manager', 'admin', 'super_admin'] },
  { id: 'finance_coupons',     titleAr: 'الكوبونات والخصومات',     path: '/dashboard/admin/coupons',                   defaultRoles: ['finance_manager', 'admin', 'super_admin'] },
  { id: 'finance_scholarships',titleAr: 'المنح الدراسية',         path: '/dashboard/admin/scholarships',              defaultRoles: ['finance_manager', 'admin', 'super_admin'] },
  { id: 'finance_approvals',   titleAr: 'اعتمادات البرامج',        path: '/dashboard/finance/program-approvals',        defaultRoles: ['finance_manager', 'admin', 'super_admin'] },
  { id: 'finance_chart',       titleAr: 'شجرة الحسابات',           path: '/dashboard/finance/chart-of-accounts',        defaultRoles: ['finance_manager', 'admin', 'super_admin'] },
]

// ─── HR & Team (الموارد البشرية والفريق) ──────────────────────────────────────
const hrPages: SitePage[] = [
  { id: 'hr_home',             titleAr: 'لوحة الموارد البشرية',   path: '/dashboard/hr',                   defaultRoles: ['hr_manager', 'admin', 'super_admin'] },
  { id: 'hr_team',             titleAr: 'أعضاء الفريق',           path: '/dashboard/hr/team',              defaultRoles: ['hr_manager', 'admin', 'super_admin'] },
  { id: 'hr_volunteers',       titleAr: 'إدارة المتطوعين',        path: '/dashboard/hr/volunteers',        defaultRoles: ['hr_manager', 'admin', 'super_admin', 'community_manager'] },
  { id: 'hr_instructors',      titleAr: 'الكادر التدريبي',        path: '/dashboard/hr/instructors',       defaultRoles: ['hr_manager', 'admin', 'super_admin'] },
  { id: 'hr_applications',     titleAr: 'طلبات الانضمام',         path: '/dashboard/hr/applications',      defaultRoles: ['hr_manager', 'admin', 'super_admin'] },
  { id: 'hr_departments',      titleAr: 'الإدارات والأدوار',       path: '/dashboard/hr/departments',       defaultRoles: ['hr_manager', 'admin', 'super_admin'] },
  { id: 'hr_onboarding',       titleAr: 'التأهيل والانضمام',      path: '/dashboard/hr/onboarding',        defaultRoles: ['hr_manager', 'admin', 'super_admin'] },
]

// ─── Quality & Compliance (الجودة والالتزام) ──────────────────────────────────
const qualityPages: SitePage[] = [
  { id: 'quality_home',        titleAr: 'لوحة الجودة',            path: '/dashboard/quality',              defaultRoles: ['quality_manager', 'admin', 'super_admin'] },
  { id: 'quality_reviews',     titleAr: 'مراجعات الجودة',         path: '/dashboard/admin/quality',        defaultRoles: ['quality_manager', 'admin', 'super_admin'] },
  { id: 'quality_incidents',   titleAr: 'الحوادث والملاحظات',     path: '/dashboard/quality/incidents',    defaultRoles: ['quality_manager', 'admin', 'super_admin'] },
  { id: 'quality_audits',      titleAr: 'سجلات التدقيق',          path: '/dashboard/quality/audit-logs',   defaultRoles: ['quality_manager', 'admin', 'super_admin'] },
  { id: 'quality_kpi',         titleAr: 'مؤشرات الأداء KPI',      path: '/dashboard/admin/kpi',            defaultRoles: ['quality_manager', 'admin', 'super_admin', 'programs_manager'] },
  { id: 'quality_reports',     titleAr: 'التقارير التحليلية',     path: '/dashboard/admin/reports',        defaultRoles: ['quality_manager', 'admin', 'super_admin', 'executive_admin'] },
]

// ─── LMS & Certificates (التعلم والشهادات) ────────────────────────────────────
const lmsPages: SitePage[] = [
  { id: 'lms_home',            titleAr: 'نظام التعلم LMS',        path: '/dashboard/admin/lms',            defaultRoles: ['admin', 'super_admin', 'programs_manager', 'instructor'] },
  { id: 'lms_sessions',        titleAr: 'الجلسات والمحاضرات',     path: '/dashboard/admin/lms/sessions',   defaultRoles: ['admin', 'super_admin', 'programs_manager', 'instructor'] },
  { id: 'lms_attendance',      titleAr: 'الحضور والغياب',         path: '/dashboard/admin/lms/attendance', defaultRoles: ['admin', 'super_admin', 'programs_manager', 'instructor'] },
  { id: 'lms_assignments',     titleAr: 'الواجبات والتكليفات',     path: '/dashboard/admin/lms/assignments',defaultRoles: ['admin', 'super_admin', 'programs_manager', 'instructor'] },
  { id: 'lms_materials',       titleAr: 'المكتبة والمستندات',     path: '/dashboard/admin/lms/materials',  defaultRoles: ['admin', 'super_admin', 'programs_manager', 'instructor'] },
  { id: 'lms_evaluations',     titleAr: 'التقييمات والاختبارات',  path: '/dashboard/admin/lms/evaluations',defaultRoles: ['admin', 'super_admin', 'programs_manager', 'instructor'] },
  { id: 'lms_progress',        titleAr: 'تقدم الطلاب',            path: '/dashboard/admin/lms/progress',   defaultRoles: ['admin', 'super_admin', 'programs_manager', 'instructor'] },
  { id: 'lms_certificates',    titleAr: 'إدارة الشهادات',         path: '/dashboard/admin/certificates',   defaultRoles: ['admin', 'super_admin', 'programs_manager'] },
  { id: 'lms_knowledge',       titleAr: 'إدارة المعرفة والمقالات',path: '/dashboard/admin/knowledge',      defaultRoles: ['admin', 'super_admin', 'programs_manager'] },
]

// ─── Student & Instructor (الطالب والمدرب) ────────────────────────────────────
const userPages: SitePage[] = [
  { id: 'student_home',        titleAr: 'لوحة الطالب الرئيسية',   path: '/dashboard/student',               defaultRoles: ['student'] },
  { id: 'student_courses',     titleAr: 'دوراتي (طالب)',           path: '/dashboard/student/courses',       defaultRoles: ['student'] },
  { id: 'student_learning',    titleAr: 'مسار التعلم (طالب)',     path: '/dashboard/student/learning',      defaultRoles: ['student'] },
  { id: 'student_placement',   titleAr: 'اختبار التحديد',         path: '/dashboard/student/placement-test',defaultRoles: ['student'] },
  { id: 'student_certificates',titleAr: 'شهاداتي (طالب)',         path: '/dashboard/certificates',          defaultRoles: ['student'] },
  { id: 'student_payments',    titleAr: 'مدفوعاتي (طالب)',        path: '/dashboard/student/payments',      defaultRoles: ['student'] },
  { id: 'instructor_home',     titleAr: 'لوحة المدرب الرئيسية',   path: '/dashboard/instructor',            defaultRoles: ['instructor', 'teacher'] },
  { id: 'instructor_courses',  titleAr: 'دوراتي (مدرب)',          path: '/dashboard/instructor/courses',    defaultRoles: ['instructor', 'teacher'] },
  { id: 'instructor_students', titleAr: 'قائمة الطلاب (مدرب)',     path: '/dashboard/instructor/students',   defaultRoles: ['instructor', 'teacher'] },
  { id: 'instructor_lms',      titleAr: 'منصة التعلم (مدرب)',     path: '/dashboard/instructor/lms',        defaultRoles: ['instructor', 'teacher'] },
]

// ─── Super Admin & System (السوبر أدمن والنظام) ────────────────────────────────
const superAdminPages: SitePage[] = [
  { id: 'sa_home',             titleAr: 'لوحة السوبر أدمن الرئيسية', path: '/dashboard/super-admin',           defaultRoles: ['super_admin'] },
  { id: 'sa_users',            titleAr: 'إدارة المستخدمين الكاملة', path: '/dashboard/super-admin/crud/users', defaultRoles: ['super_admin'] },
  { id: 'sa_roles',            titleAr: 'الأدوار والصلاحيات',      path: '/dashboard/super-admin/crud/roles', defaultRoles: ['super_admin'] },
  { id: 'sa_courses',          titleAr: 'إدارة الدورات (SA)',      path: '/dashboard/super-admin/crud/courses',defaultRoles: ['super_admin'] },
  { id: 'sa_finance',          titleAr: 'إدارة المالية (SA)',      path: '/dashboard/super-admin/crud/finance',defaultRoles: ['super_admin'] },
  { id: 'sa_operations',       titleAr: 'إدارة العمليات (SA)',     path: '/dashboard/super-admin/crud/operations',defaultRoles: ['super_admin'] },
  { id: 'sa_ai',               titleAr: 'مركز الذكاء الاصطناعي',   path: '/dashboard/admin/ai',             defaultRoles: ['super_admin', 'admin', 'tech_admin'] },
  { id: 'sa_integrations',     titleAr: 'مركز التكاملات',          path: '/dashboard/admin/integrations',     defaultRoles: ['super_admin', 'tech_admin'] },
  { id: 'sa_webhooks',         titleAr: 'إدارة الويبهوكس',         path: '/dashboard/admin/webhooks',         defaultRoles: ['super_admin', 'tech_admin'] },
  { id: 'sa_developer',        titleAr: 'رموز المطوّر API',        path: '/dashboard/admin/developer/api-tokens', defaultRoles: ['super_admin', 'tech_admin'] },
]

// ─── Settings & Workspace (الإعدادات والنظام) ─────────────────────────────────
const systemPages: SitePage[] = [
  { id: 'sys_notifications',   titleAr: 'مركز الإشعارات والتنبيهات', path: '/dashboard/notifications',       defaultRoles: ['admin', 'super_admin', 'instructor', 'student', 'finance_manager', 'hr_manager', 'quality_manager', 'partner'] },
  { id: 'sys_profile',         titleAr: 'الملف الشخصي وحسابي',      path: '/dashboard/profile',             defaultRoles: ['admin', 'super_admin', 'instructor', 'student', 'finance_manager', 'hr_manager', 'quality_manager', 'partner'] },
  { id: 'sys_settings_notif',  titleAr: 'تفضيلات الإشعارات',        path: '/dashboard/settings/notifications',defaultRoles: ['admin', 'super_admin', 'instructor', 'student', 'finance_manager', 'hr_manager', 'quality_manager', 'partner'] },
  { id: 'sys_2fa',             titleAr: 'الأمان والتحقق 2FA',       path: '/dashboard/settings/2fa',         defaultRoles: ['admin', 'super_admin', 'instructor', 'student', 'finance_manager', 'hr_manager', 'quality_manager', 'partner'] },
  { id: 'sys_calendar',        titleAr: 'التقويم التفاعلي',         path: '/calendar',                       defaultRoles: ['admin', 'super_admin', 'instructor', 'student', 'finance_manager', 'hr_manager', 'quality_manager'] },
  { id: 'sys_documents',       titleAr: 'المستندات والملفات',       path: '/documents',                      defaultRoles: ['admin', 'super_admin', 'instructor', 'student', 'finance_manager', 'hr_manager', 'quality_manager'] },
  { id: 'sys_ai',              titleAr: 'المساعد الذكي AI',         path: '/ai',                             defaultRoles: ['admin', 'super_admin', 'instructor', 'student', 'finance_manager', 'hr_manager', 'quality_manager'] },
  { id: 'sys_resource_center', titleAr: 'مركز الموارد والمكتبة',     path: '/dashboard/resource-center',      defaultRoles: ['admin', 'super_admin', 'instructor', 'programs_manager', 'hr_manager', 'quality_manager', 'finance_manager', 'operations_manager', 'partnerships_manager', 'community_manager', 'volunteer'] },
]

// ─── Full catalog ──────────────────────────────────────────────────────────────
export const SITE_PAGES_CATALOG: PageGroup[] = [
  { id: 'operations',  titleAr: '⚙️ التشغيل والمهام والتحليلات', pages: operationsPages },
  { id: 'finance',     titleAr: '💰 الإدارة المالية والمنح',    pages: financePages },
  { id: 'hr',          titleAr: '👥 الموارد البشرية والفريق',     pages: hrPages },
  { id: 'quality',     titleAr: '🛡️ الجودة والالتزام والـ KPI', pages: qualityPages },
  { id: 'lms',          titleAr: '🎓 نظام التعلم والشهادات LMS',pages: lmsPages },
  { id: 'user_panels', titleAr: '👤 لوحات الطلاب والمدربين',     pages: userPages },
  { id: 'super_admin', titleAr: '👑 إدارة النظام والسوبر أدمن',  pages: superAdminPages },
  { id: 'system',      titleAr: '🔔 الإعدادات والملف والمستندات', pages: systemPages },
  { id: 'public',      titleAr: '🌐 الصفحات العامة للموقع',      pages: publicPages },
]

/** Flat list of all pages */
export const ALL_SITE_PAGES: SitePage[] = SITE_PAGES_CATALOG.flatMap((g) => g.pages)

/** Check if a role has default access to a page */
export function roleHasDefaultAccess(roleSlug: string, page: SitePage): boolean {
  if (page.defaultRoles.length === 0) return true // public page
  return page.defaultRoles.includes(roleSlug)
}

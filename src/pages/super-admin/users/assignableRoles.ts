import { EMC_DASHBOARD_ROLES, normalizeRole } from '@/utils/dashboardAccess'

const ROLE_LABEL_AR: Record<(typeof EMC_DASHBOARD_ROLES)[number], string> = {
  student: 'طالب',
  instructor: 'مدرب',
  admin: 'مشرف',
  super_admin: 'سوبر مشرف',
  tech_admin: 'مدير التقنية',
  executive_admin: 'مشرف تنفيذي',
  finance_manager: 'مدير مالي',
  quality_manager: 'مدير الجودة',
  hr_manager: 'مدير الموارد البشرية',
  partner: 'شريك',
  marketing_manager: 'مدير التسويق',
  support_agent: 'وكيل دعم',
  volunteer: 'متطوع',
  department_manager: 'مدير إدارة',
  department_member: 'عضو إدارة / فريق',
  programs_manager: 'مدير البرامج والمسارات',
  operations_manager: 'مدير العمليات والتشغيل',
  partnerships_manager: 'مدير الشراكات والعلاقات',
  community_manager: 'مدير الصحة النفسية والوعي',
  section_lead: 'قائد قسم',
  ai_manager: 'مدير الذكاء الاصطناعي',
  strategy_planning_manager: 'مدير الاستراتيجية والتخطيط المؤسسي',
  digital_ambassadors_manager: 'مدير سفراء التحول الرقمي',
  advisors_manager: 'مدير الاستشارات والمستشارين',
}

export const ASSIGNABLE_CANONICAL_ROLES = [
  'super_admin',
  'executive_admin',
  'admin',
  'tech_admin',
  'department_manager',
  'department_member',
  'instructor',
  'student',
  'volunteer',
  'partner',
  'support_agent',
] as const

export type AssignableRoleOption = { value: string; labelAr: string }

export function getAssignableRoleOptions(includeSuperAdmin: boolean): AssignableRoleOption[] {
  return ASSIGNABLE_CANONICAL_ROLES.filter((r) => includeSuperAdmin || r !== 'super_admin').map((value) => ({
    value,
    labelAr: ROLE_LABEL_AR[value as (typeof EMC_DASHBOARD_ROLES)[number]] ?? value,
  }))
}

/** Entire EMC role catalogue for governance screens (readonly). */
export const SUPER_ADMIN_ROLE_CATALOG_ROWS = EMC_DASHBOARD_ROLES.map((slug) => ({
  slug,
  labelAr: ROLE_LABEL_AR[slug] ?? slug,
}))

export function adminRoleLabelAr(role: string | null | undefined): string {
  const n = normalizeRole(role ?? null)
  if (!n) return role && String(role).trim() ? String(role) : '—'
  return ROLE_LABEL_AR[n as (typeof EMC_DASHBOARD_ROLES)[number]] ?? n
}

/** A department as returned by `GET /departments/options`. */
export type DepartmentOption = { id: number; name_ar?: string; name?: string }

export const DEFAULT_EMC_DEPARTMENTS: { id: number; name_ar: string; name: string }[] = [
  { id: 1, name_ar: 'الإدارة العليا', name: 'الإدارة العليا' },
  { id: 2, name_ar: 'إدارة البرامج والمسارات', name: 'إدارة البرامج والمسارات' },
  { id: 3, name_ar: 'إدارة العمليات والتشغيل', name: 'إدارة العمليات والتشغيل' },
  { id: 4, name_ar: 'إدارة الإعلام والتسويق', name: 'إدارة الإعلام والتسويق' },
  { id: 5, name_ar: 'إدارة الشراكات والعلاقات العامة', name: 'إدارة الشراكات والعلاقات العامة' },
  { id: 6, name_ar: 'الإدارة المالية', name: 'الإدارة المالية' },
  { id: 7, name_ar: 'إدارة التقنية والدعم الفني', name: 'إدارة التقنية والدعم الفني' },
  { id: 8, name_ar: 'إدارة الموارد البشرية والشؤون القانونية', name: 'إدارة الموارد البشرية والشؤون القانونية' },
  { id: 9, name_ar: 'إدارة الصحة النفسية والوعي', name: 'إدارة الصحة النفسية والوعي' },
  { id: 10, name_ar: 'إدارة الجودة والحوكمة', name: 'إدارة الجودة والحوكمة' },
  { id: 11, name_ar: 'إدارة الاستراتيجية والتخطيط المؤسسي', name: 'إدارة الاستراتيجية والتخطيط المؤسسي' },
  { id: 12, name_ar: 'إدارة الذكاء الاصطناعي والتحول الرقمي', name: 'إدارة الذكاء الاصطناعي والتحول الرقمي' },
  { id: 13, name_ar: 'إدارة سفراء التحول الرقمي', name: 'إدارة سفراء التحول الرقمي' },
  { id: 14, name_ar: 'إدارة الاستشارات والمستشارين', name: 'إدارة الاستشارات والمستشارين' },
]

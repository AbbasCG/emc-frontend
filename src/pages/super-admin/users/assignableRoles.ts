import { EMC_DASHBOARD_ROLES, normalizeRole } from '@/utils/dashboardAccess'

const ROLE_LABEL_AR: Record<(typeof EMC_DASHBOARD_ROLES)[number], string> = {
  student: 'طالب',
  instructor: 'مدرب',
  admin: 'مشرف',
  super_admin: 'سوبر مشرف',
  tech_admin: 'تقنية المعلومات والأنظمة',
  executive_admin: 'الإدارة التنفيذية',
  finance_manager: 'الإدارة المالية',
  quality_manager: 'الجودة والامتثال',
  hr_manager: 'الموارد البشرية',
  partner: 'شريك',
  marketing_manager: 'التسويق والإعلام',
  support_agent: 'الدعم الفني',
  volunteer: 'متطوع',
  department_manager: 'إداري قسم',
  programs_manager: 'البرامج والمسارات',
  operations_manager: 'العمليات والتشغيل',
  partnerships_manager: 'الشراكات والعلاقات',
  community_manager: 'الصحة النفسية والوعي',
  section_lead: 'قائد قسم',
  ai_manager: 'الذكاء الاصطناعي والتحول الرقمي',
  strategy_planning_manager: 'الاستراتيجية والتخطيط المؤسسي',
  digital_ambassadors_manager: 'سفراء التحول الرقمي',
  advisors_manager: 'الاستشارات والمستشارين',
}

export type AssignableRoleOption = { value: string; labelAr: string }

export function getAssignableRoleOptions(includeSuperAdmin: boolean): AssignableRoleOption[] {
  return EMC_DASHBOARD_ROLES.filter((r) => includeSuperAdmin || r !== 'super_admin').map((value) => ({
    value,
    labelAr: ROLE_LABEL_AR[value] ?? value,
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

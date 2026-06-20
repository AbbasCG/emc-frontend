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
  department_manager: 'مدير إداري',
  programs_manager: 'مدير البرامج والمسارات',
  operations_manager: 'مدير التشغيل والعمليات',
  partnerships_manager: 'مدير الشراكات والعلاقات',
  community_manager: 'مدير المجتمع والصحة',
  section_lead: 'قائد قسم',
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

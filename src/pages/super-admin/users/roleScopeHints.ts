import type { CapabilityId } from './roleScopeTypes'

/** Same rows as Roles matrix — kept in one module for parity. */
export const CAPABILITIES: readonly { id: CapabilityId; labelAr: string }[] = [
  { id: 'governance', labelAr: 'الحوكمة والسوبر مشرف' },
  { id: 'learning', labelAr: 'التعلّم والمحتوى' },
  { id: 'finance', labelAr: 'المالية والعقود' },
  { id: 'people', labelAr: 'الموارد البشرية والإدارات' },
  { id: 'growth', labelAr: 'التسويق والشراكة والدعم' },
] as const

/** High-level scopes shown in enterprise user drawers — aligns with Roles page CAPABILITIES taxonomy. */
export const ROLE_CAPABILITY_HINTS_AR: Record<CapabilityId, string> = {
  governance: 'الحوكمة والسوبر مشرف والإعدادات الشاملة',
  learning: 'المسارات التعليمية والمحتوى والتقييم',
  finance: 'المالية والعقود والتحصيل',
  people: 'الموارد البشرية والإدارات والتوظيف',
  growth: 'التسويق والشراكة وقنوات الدعم',
}

/**
 * Mirrors `RolesPermissionsPage` logic so permission summaries stay consistent UI-side
 * until granular Laravel Permission resources are wired.
 */
export function roleHasCapabilitySlug(roleSlug: string, cap: CapabilityId): boolean {
  const r = roleSlug
  if (cap === 'governance') return ['super_admin', 'executive_admin', 'admin'].includes(r)
  if (cap === 'learning')
    return ['super_admin', 'executive_admin', 'admin', 'instructor', 'quality_manager', 'student'].includes(r)
  if (cap === 'finance') return ['super_admin', 'executive_admin', 'finance_manager'].includes(r)
  if (cap === 'people')
    return ['super_admin', 'executive_admin', 'hr_manager', 'department_manager'].includes(r)
  if (cap === 'growth')
    return ['super_admin', 'executive_admin', 'marketing_manager', 'support_agent', 'partner', 'volunteer'].includes(
      r,
    )
  return false
}

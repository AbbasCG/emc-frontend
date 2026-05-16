import { normalizeRole } from '@/utils/dashboardAccess'

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'super_admin'
}

/** Only callers with `super_admin` may expose the super_admin assignment option in UI. */
export function canOfferSuperAdminRoleOption(currentUserRole: string | null | undefined): boolean {
  return isSuperAdminRole(currentUserRole)
}

/** Edit/update: blocked for rows when row is super_admin and actor is not super_admin (mirrors backend). */
export function canEditAdminUserRow(
  currentUserRole: string | null | undefined,
  targetRole: string | null | undefined,
): boolean {
  if (isSuperAdminRole(targetRole) && !isSuperAdminRole(currentUserRole)) return false
  return true
}

/** Delete: no self-delete; same super_admin rule as edits. */
export function canDeleteAdminUserRow(
  currentUserId: number,
  currentUserRole: string | null | undefined,
  targetId: number,
  targetRole: string | null | undefined,
): boolean {
  if (currentUserId === targetId) return false
  return canEditAdminUserRow(currentUserRole, targetRole)
}

/** Finance UI is mounted at `/dashboard/admin/finance/*` (admins) or `/dashboard/finance/*` (scoped roles). */
export function financeSectionBase(pathname: string): string {
  return pathname.startsWith('/dashboard/finance') ? '/dashboard/finance' : '/dashboard/admin/finance'
}

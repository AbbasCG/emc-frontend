import type { AdminManagedUser } from '@/api/adminUsersApi'

export const STATUS_PILL = {
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  inactive: 'bg-amber-50 text-amber-800 border-amber-200',
  deleted: 'bg-red-50 text-red-700 border-red-200',
  unknown: 'bg-slate-50 text-slate-600 border-slate-200',
} as const

export const STATUS_LABEL = {
  active: 'نشط',
  inactive: 'موقوف',
  deleted: 'محذوف',
  unknown: 'غير محدد',
} as const

export const VERIFIED_PILL = {
  yes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  no: 'bg-rose-50 text-rose-700 border-rose-200',
  unknown: 'bg-slate-50 text-slate-500 border-slate-200',
} as const

export const VERIFIED_LABEL = { yes: 'موثَّق', no: 'غير موثَّق', unknown: 'غير مُرسَل' } as const

export function isDeletedUser(u: AdminManagedUser): boolean {
  return !!u.deleted_at
}

export function userStatusKey(u: AdminManagedUser): keyof typeof STATUS_PILL {
  if (isDeletedUser(u)) return 'deleted'
  if (u.is_active === false) return 'inactive'
  if (u.is_active === true) return 'active'
  return 'unknown'
}

export function userVerifiedKey(u: AdminManagedUser): keyof typeof VERIFIED_PILL {
  const raw = u.email_verified_at
  if (raw == null || String(raw).trim() === '') return 'no'
  return Number.isFinite(Date.parse(raw)) ? 'yes' : 'unknown'
}

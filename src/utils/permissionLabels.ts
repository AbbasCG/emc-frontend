/** Display-only Arabic labels for backend permission keys — does not invent permissions. */

const GROUP_LABELS_AR: Record<string, string> = {
  workshop_requests: 'طلبات البرامج التدريبية',
  members: 'الأعضاء',
  departments: 'الإدارات',
  courses: 'الدورات',
  attendance: 'الحضور',
  assignments: 'الواجبات',
  certificates: 'الشهادات',
  notifications: 'الإشعارات',
  roles: 'الأدوار والصلاحيات',
  users: 'المستخدمون',
  finance: 'المالية',
  reports: 'التقارير',
  settings: 'الإعدادات',
}

const ACTION_LABELS_AR: Record<string, string> = {
  view_own: 'عرض طلباته فقط',
  view_department: 'عرض طلبات الإدارة',
  view_all: 'عرض كل الطلبات',
  view: 'عرض',
  create: 'إنشاء',
  review: 'مراجعة',
  approve: 'موافقة',
  reject: 'رفض',
  assign: 'تحويل / تعيين',
  edit: 'تعديل',
  delete: 'حذف',
  export: 'تصدير',
  manage: 'إدارة كاملة',
  import: 'استيراد',
  publish: 'نشر',
  archive: 'أرشفة',
  restore: 'استعادة',
  notify: 'إرسال إشعار',
  grade: 'تصحيح / درجات',
  submit: 'تسليم',
  download: 'تنزيل',
  issue: 'إصدار',
  revoke: 'سحب',
}

const ACTION_DESCRIPTIONS_AR: Record<string, string> = {
  view_own: 'يرى السجلات التي أنشأها أو يخصّه فقط.',
  view_department: 'يرى سجلات إدارته أو قسمه.',
  view_all: 'يرى جميع السجلات على مستوى المنصة.',
  create: 'يمكنه إنشاء سجل جديد.',
  review: 'يمكنه مراجعة الطلبات قبل القرار.',
  approve: 'يمكنه اعتماد الطلبات.',
  reject: 'يمكنه رفض الطلبات.',
  assign: 'يمكنه تحويل الطلب أو تعيين مسؤول.',
  edit: 'يمكنه تعديل السجلات المسموح بها.',
  delete: 'يممكنه حذف السجلات المسموح بها.',
  export: 'يمكنه تصدير البيانات.',
  manage: 'صلاحية شاملة على هذا الموديول.',
}

/** Preferred display order for permission groups in the matrix. */
export const PERMISSION_GROUP_ORDER = [
  'workshop_requests',
  'members',
  'departments',
  'courses',
  'attendance',
  'assignments',
  'certificates',
  'notifications',
  'users',
  'roles',
  'finance',
  'reports',
  'settings',
] as const

export function permissionGroupLabelAr(groupKey: string, backendLabel?: string): string {
  if (backendLabel?.trim()) return backendLabel.trim()
  return GROUP_LABELS_AR[groupKey] ?? groupKey.replace(/_/g, ' ')
}

export function permissionActionLabelAr(permissionKey: string, backendLabel?: string): string {
  if (backendLabel?.trim()) return backendLabel.trim()
  const action = permissionKey.includes('.') ? permissionKey.split('.').slice(1).join('.') : permissionKey
  if (ACTION_LABELS_AR[action]) return ACTION_LABELS_AR[action]
  return action.replace(/_/g, ' ')
}

export function permissionDescriptionAr(permissionKey: string, backendDescription?: string): string {
  if (backendDescription?.trim()) return backendDescription.trim()
  const action = permissionKey.includes('.') ? permissionKey.split('.').slice(1).join('.') : permissionKey
  return ACTION_DESCRIPTIONS_AR[action] ?? ''
}

export function sortPermissionGroups<T extends { key: string }>(groups: T[]): T[] {
  const order = new Map(PERMISSION_GROUP_ORDER.map((k, i) => [k, i]))
  return [...groups].sort((a, b) => {
    const ia = order.get(a.key as (typeof PERMISSION_GROUP_ORDER)[number]) ?? 999
    const ib = order.get(b.key as (typeof PERMISSION_GROUP_ORDER)[number]) ?? 999
    if (ia !== ib) return ia - ib
    return a.key.localeCompare(b.key, 'ar')
  })
}

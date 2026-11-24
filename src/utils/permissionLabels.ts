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
  tickets: 'التذاكر',
}

/**
 * Permissions whose name needs more than the generic «action» label. Keyed by the FULL permission key so a
 * short action word never collides across groups. The server sends the same labels (label_ar / description_ar);
 * this is the fallback for a catalog that came without them, never a second source of truth for what a key does.
 */
const PERMISSION_LABELS_AR: Record<string, string> = {
  'tickets.review_completion': 'مراجعة واعتماد إنجاز التذاكر',
  'tickets.review_participated': 'اعتماد التذاكر التي أشارك فيها',
}

const PERMISSION_DESCRIPTIONS_AR: Record<string, string> = {
  'tickets.review_completion':
    'اعتماد إنجاز التذاكر أو اعتمادها للنشر أو إعادتها للتنفيذ ضمن الإدارات التي يقودها حاملها (أو جميع الإدارات لصاحب دور عام). لا تكفي وحدها لاعتماد تذكرة أنشأها أو أُسندت إليه أو أرسل إنجازها.',
  'tickets.review_participated':
    'تتيح اعتماد تذكرة أنشأها صاحبها أو أُسندت إليه أو أرسل إنجازها للمراجعة، بشرط امتلاكه أيضًا «مراجعة واعتماد إنجاز التذاكر».',
}

/**
 * A warning shown under a permission that is deliberately NOT granted by default. «اعتماد التذاكر التي أشارك فيها»
 * is never inherited: no role gets it automatically, not even the super admin; it exists only when someone grants it
 * on purpose (to a role in the role editor, or to one person through the permission delegation).
 */
const PERMISSION_NOTES_AR: Record<string, string> = {
  'tickets.review_participated':
    'لا تُمنح تلقائيًا؛ تتيح لمن شارك في التذكرة اعتمادها. لا يمنحها أي دور تلقائيًا ولا حتى المدير العام، وتُمنح عمدًا فقط بتحديدها وحدها، لدور أو لشخص بعينه. ولا تعمل وحدها: يلزم معها «مراجعة واعتماد إنجاز التذاكر».',
}

/**
 * Permissions that must only ever be granted by an explicit, individual tick. A group-wide «تحديد الكل» / «إلغاء الكل»
 * never adds (or removes) them: granting one by accident would let someone approve work they took part in.
 */
const EXPLICIT_ONLY_PERMISSIONS: readonly string[] = ['tickets.review_participated']

export function isExplicitOnlyPermission(permissionKey: string): boolean {
  return EXPLICIT_ONLY_PERMISSIONS.includes(permissionKey)
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
  'tickets',
  'notifications',
  'users',
  'roles',
  'finance',
  'reports',
  'settings',
] as const

export function permissionGroupLabelAr(groupKey: string, backendLabel?: string): string {
  const label = backendLabel?.trim()
  // A catalog that was built from bare keys labels each group with its own key: that is no label, so the map answers.
  if (label && label !== groupKey) return label
  return GROUP_LABELS_AR[groupKey] ?? groupKey.replace(/_/g, ' ')
}

const hasArabic = (s: string): boolean => /[؀-ۿ]/.test(s)

export function permissionActionLabelAr(permissionKey: string, backendLabel?: string): string {
  const backend = backendLabel?.trim() ?? ''
  if (backend && hasArabic(backend)) return backend
  if (PERMISSION_LABELS_AR[permissionKey]) return PERMISSION_LABELS_AR[permissionKey]
  if (backend) return backend
  const action = permissionKey.includes('.') ? permissionKey.split('.').slice(1).join('.') : permissionKey
  if (ACTION_LABELS_AR[action]) return ACTION_LABELS_AR[action]
  return action.replace(/_/g, ' ')
}

/**
 * Arabic first: the server's text when it is Arabic, else the frontend's Arabic text for this key (or its action), and the
 * server's English text only as the last resort (better than a blank).
 */
export function permissionDescriptionAr(permissionKey: string, backendDescription?: string): string {
  const backend = backendDescription?.trim() ?? ''
  if (backend && hasArabic(backend)) return backend
  if (PERMISSION_DESCRIPTIONS_AR[permissionKey]) return PERMISSION_DESCRIPTIONS_AR[permissionKey]
  const action = permissionKey.includes('.') ? permissionKey.split('.').slice(1).join('.') : permissionKey
  return ACTION_DESCRIPTIONS_AR[action] || backend
}

/** The «not granted automatically» explanation of a permission, or '' when it has none. */
export function permissionNoteAr(permissionKey: string): string {
  return PERMISSION_NOTES_AR[permissionKey] ?? ''
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

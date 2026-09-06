import type { AdminAuditLogEntry } from '@/types/adminAudit'

export type BadgeTheme = keyof typeof BADGE_THEME

export const BADGE_THEME = {
  create: 'border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-100',
  update: 'border-blue-200 bg-blue-50 text-blue-900 ring-blue-100',
  delete: 'border-red-200 bg-red-50 text-red-900 ring-red-100',
  status: 'border-amber-200 bg-amber-50 text-amber-950 ring-amber-100',
  role: 'border-violet-200 bg-violet-50 text-violet-950 ring-violet-100',
  approve: 'border-teal-200 bg-teal-50 text-teal-950 ring-teal-100',
  reject: 'border-rose-200 bg-rose-50 text-rose-950 ring-rose-100',
  login: 'border-green-200 bg-green-50 text-green-900 ring-green-100',
  logout: 'border-slate-200 bg-slate-50 text-slate-700 ring-slate-100',
  enroll: 'border-cyan-200 bg-cyan-50 text-cyan-900 ring-cyan-100',
  publish: 'border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-100',
  unpublish: 'border-orange-200 bg-orange-50 text-orange-900 ring-orange-100',
  export: 'border-purple-200 bg-purple-50 text-purple-900 ring-purple-100',
  download: 'border-sky-200 bg-sky-50 text-sky-900 ring-sky-100',
  neutral: 'border-slate-200 bg-slate-50 text-slate-800 ring-slate-100',
} as const

export const CARD_BORDER: Record<BadgeTheme, string> = {
  create: 'border-r-orange-400',
  update: 'border-r-blue-500',
  delete: 'border-r-red-500',
  login: 'border-r-green-500',
  logout: 'border-r-slate-300',
  approve: 'border-r-teal-500',
  reject: 'border-r-rose-500',
  status: 'border-r-amber-400',
  role: 'border-r-violet-500',
  enroll: 'border-r-cyan-500',
  publish: 'border-r-emerald-500',
  unpublish: 'border-r-orange-400',
  export: 'border-r-purple-500',
  download: 'border-r-sky-500',
  neutral: 'border-r-slate-300',
}

export const FIELD_LABELS: Record<string, string> = {
  title: 'العنوان',
  name: 'الاسم',
  name_ar: 'الاسم (عربي)',
  name_en: 'الاسم (إنجليزي)',
  status: 'الحالة',
  price: 'السعر',
  email: 'البريد الإلكتروني',
  role: 'الدور',
  description: 'الوصف',
  short_description: 'الوصف المختصر',
  start_date: 'تاريخ البداية',
  end_date: 'تاريخ النهاية',
  is_active: 'نشط',
  is_free: 'مجاني',
  is_online: 'أونلاين',
  instructor_id: 'المدرب',
  department_id: 'القسم',
  phone: 'الهاتف',
  type: 'النوع',
  level: 'المستوى',
  language: 'اللغة',
  capacity: 'السعة',
  location: 'الموقع',
  slug: 'الرابط',
  duration: 'المدة',
  workflow_status: 'حالة سير العمل',
}

export const TIMESTAMP_SKIP = new Set(['updated_at', 'created_at', 'deleted_at', 'remember_token'])

export function resolveActionBadge(entry: AdminAuditLogEntry): { labelAr: string; theme: BadgeTheme } {
  if (entry.action_label) {
    const colorToTheme: Record<string, BadgeTheme> = {
      blue: 'create', amber: 'update', red: 'delete',
      green: 'login', gray: 'logout', cyan: 'enroll',
      teal: 'approve', rose: 'reject', emerald: 'publish',
      orange: 'unpublish', purple: 'export', indigo: 'export',
      sky: 'download',
    }
    const theme = entry.action_color ? (colorToTheme[entry.action_color] ?? 'neutral') : 'neutral'
    return { labelAr: entry.action_label, theme }
  }

  const raw = `${entry.action}`.toUpperCase()
  const ACTION_MAP: Record<string, { label: string; theme: BadgeTheme }> = {
    CREATE: { label: 'إنشاء', theme: 'create' },
    UPDATE: { label: 'تعديل', theme: 'update' },
    DELETE: { label: 'حذف', theme: 'delete' },
    LOGIN: { label: 'تسجيل دخول', theme: 'login' },
    LOGIN_FAILED: { label: 'فشل الدخول', theme: 'reject' },
    LOGOUT: { label: 'تسجيل خروج', theme: 'logout' },
    ENROLL: { label: 'تسجيل', theme: 'enroll' },
    APPROVE: { label: 'موافقة', theme: 'approve' },
    REJECT: { label: 'رفض', theme: 'reject' },
    PUBLISH: { label: 'نشر', theme: 'publish' },
    UNPUBLISH: { label: 'إلغاء النشر', theme: 'unpublish' },
    EXPORT: { label: 'تصدير', theme: 'export' },
    IMPORT: { label: 'استيراد', theme: 'export' },
    DOWNLOAD: { label: 'تنزيل', theme: 'download' },
    STATUS_CHANGED: { label: 'تغيير الحالة', theme: 'status' },
    ROLE_CHANGED: { label: 'تغيير الدور', theme: 'role' },
  }
  const found = ACTION_MAP[raw]
  if (found) return { labelAr: found.label, theme: found.theme }
  return { labelAr: `${entry.action}`.replace(/[_-]+/g, ' ') || 'حدث غير مصنَّف', theme: 'neutral' }
}

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ')
}

export function renderValue(v: unknown): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
  if (typeof v === 'object') {
    try { return JSON.stringify(v, null, 2) } catch { return String(v) }
  }
  return String(v)
}

export function fmtDate(iso: string): string {
  if (!iso || iso === '—') return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtTime24(iso: string): string {
  if (!iso || iso === '—') return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function actorDisplay(name: string): string {
  return !name || name.trim() === '—' ? 'غير معروف' : name
}

export function parseUserAgent(ua?: string | null): { browser: string; os: string } {
  const s = ua?.trim() ?? ''
  if (!s) return { browser: '—', os: '—' }

  let browser = '—'
  if (/Edg\//i.test(s)) browser = 'Edge'
  else if (/Chrome\//i.test(s)) browser = 'Chrome'
  else if (/Firefox\//i.test(s)) browser = 'Firefox'
  else if (/Safari\//i.test(s)) browser = 'Safari'

  let os = '—'
  if (/Windows/i.test(s)) os = 'Windows'
  else if (/Mac OS X|Macintosh/i.test(s)) os = 'macOS'
  else if (/Android/i.test(s)) os = 'Android'
  else if (/iPhone|iPad|iOS/i.test(s)) os = 'iOS'
  else if (/Linux/i.test(s)) os = 'Linux'

  return { browser, os }
}

export function timelineDayLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(todayStart.getDate() - 1)

  if (d >= todayStart) return 'اليوم'
  if (d >= yesterdayStart) return 'أمس'

  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function groupEntriesByDay<T extends { created_at: string }>(entries: T[]): { label: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const entry of entries) {
    const label = timelineDayLabel(entry.created_at)
    const bucket = map.get(label) ?? []
    bucket.push(entry)
    map.set(label, bucket)
  }
  return [...map.entries()].map(([label, items]) => ({ label, items }))
}

export function datePresetToRange(preset: string): { from?: string; to?: string } {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const today = fmt(now)

  if (preset === 'today') return { from: today, to: today }
  if (preset === 'yesterday') {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    const ys = fmt(y)
    return { from: ys, to: ys }
  }
  if (preset === 'last_7') {
    const s = new Date(now)
    s.setDate(s.getDate() - 6)
    return { from: fmt(s), to: today }
  }
  if (preset === 'last_30') {
    const s = new Date(now)
    s.setDate(s.getDate() - 29)
    return { from: fmt(s), to: today }
  }
  return {}
}

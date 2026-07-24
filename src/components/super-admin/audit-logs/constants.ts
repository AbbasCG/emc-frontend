import type { AdminAuditLogEntry, AdminAuditLogStats } from '@/types/adminAudit'

export const AUDIT_LOGS_PER_PAGE_KEY = 'emc_audit_logs_per_page'
export const DEFAULT_PER_PAGE = 50
export const PER_PAGE_OPTIONS = [25, 50, 100] as const

export const ACTION_FILTER_OPTIONS = [
  { value: 'all', labelAr: 'كل العمليات' },
  { value: 'CREATE', labelAr: 'إنشاء' },
  { value: 'UPDATE', labelAr: 'تعديل' },
  { value: 'DELETE', labelAr: 'حذف' },
  { value: 'LOGIN', labelAr: 'تسجيل دخول' },
  { value: 'LOGOUT', labelAr: 'تسجيل خروج' },
  { value: 'ENROLL', labelAr: 'تسجيل طالب' },
  { value: 'APPROVE', labelAr: 'موافقة' },
  { value: 'REJECT', labelAr: 'رفض' },
  { value: 'PUBLISH', labelAr: 'نشر' },
  { value: 'UNPUBLISH', labelAr: 'إلغاء النشر' },
  { value: 'EXPORT', labelAr: 'تصدير' },
  { value: 'IMPORT', labelAr: 'استيراد' },
  { value: 'DOWNLOAD', labelAr: 'تنزيل' },
  { value: 'status_changed', labelAr: 'تغيير حالة' },
  { value: 'role_changed', labelAr: 'تغيير دور' },
] as const

export const ENTITY_FILTER_OPTIONS = [
  { value: 'all', labelAr: 'كل الكيانات' },
  { value: 'Course', labelAr: 'دورة' },
  { value: 'Workshop', labelAr: 'ورشة' },
  { value: 'Student', labelAr: 'طالب' },
  { value: 'User', labelAr: 'مستخدم' },
  { value: 'Registration', labelAr: 'تسجيل' },
  { value: 'Certificate', labelAr: 'شهادة' },
  { value: 'Payment', labelAr: 'دفع' },
  { value: 'LearningPath', labelAr: 'مسار تعلم' },
] as const

export const METHOD_FILTER_OPTIONS = [
  { value: 'all', labelAr: 'كل الطرق' },
  { value: 'GET', labelAr: 'GET' },
  { value: 'POST', labelAr: 'POST' },
  { value: 'PUT', labelAr: 'PUT' },
  { value: 'PATCH', labelAr: 'PATCH' },
  { value: 'DELETE', labelAr: 'DELETE' },
] as const

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', labelAr: 'كل الحالات' },
  { value: 'success', labelAr: 'ناجح' },
  { value: 'failed', labelAr: 'فاشل' },
] as const

export const DATE_PRESET_OPTIONS = [
  { value: 'all', labelAr: 'كل الفترات' },
  { value: 'today', labelAr: 'اليوم' },
  { value: 'yesterday', labelAr: 'أمس' },
  { value: 'last_7', labelAr: 'آخر 7 أيام' },
  { value: 'last_30', labelAr: 'آخر 30 يوماً' },
  { value: 'custom', labelAr: 'مخصص' },
] as const

export type AuditLogFilterState = {
  search: string
  action: string
  role: string
  user: string
  entity_type: string
  date_preset: string
  date_from: string
  date_to: string
  ip_address: string
  method: string
  status: string
  page: number
  per_page: number
}

export type AuditLogsPageResult = {
  entries: AdminAuditLogEntry[]
  total: number
  page: number
  perPage: number
  lastPage: number
  from: number | null
  to: number | null
}

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf'

export const EMPTY_STATS: AdminAuditLogStats = {
  total: 0,
  today: 0,
  this_week: 0,
  this_month: 0,
  unique_users: 0,
  failed_operations: 0,
  successful_operations: 0,
  top_entity: null,
  most_active_user: null,
  most_common_action: null,
}

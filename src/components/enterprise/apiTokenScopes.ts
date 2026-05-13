import type { ApiTokenScope } from '@/types/phase7'

export const ALL_API_TOKEN_SCOPES: ApiTokenScope[] = [
  'read:registrations',
  'read:courses',
  'write:webhooks',
  'read:reports',
  'write:forms',
]

export const API_TOKEN_SCOPE_LABELS_AR: Record<ApiTokenScope, string> = {
  'read:registrations': 'قراءة التسجيلات',
  'read:courses': 'قراءة الدورات',
  'write:webhooks': 'كتابة الويبهوكس',
  'read:reports': 'قراءة التقارير',
  'write:forms': 'كتابة النماذج',
}

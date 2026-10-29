import type { MemberStatus } from '@/api/unitMembersApi'

export const STATUS_LABEL: Record<MemberStatus, string> = { active: 'نشط', inactive: 'غير نشط', on_leave: 'في إجازة' }
export const STATUS_TONE = { active: 'good', inactive: 'neutral', on_leave: 'warn' } as const

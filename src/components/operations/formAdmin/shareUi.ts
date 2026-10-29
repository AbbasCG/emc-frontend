import type { FormAccessMode } from '@/types/operations'
import type { ShareLinkStatus } from '@/api/formsShareApi'

/** Wording and tones for the Share screen. */

export const ACCESS_MODE_AR: Record<FormAccessMode, { label: string; hint: string }> = {
  public: {
    label: 'عام',
    hint: 'يستطيع أي شخص يملك الرابط تعبئة النموذج دون تسجيل دخول.',
  },
  authenticated: {
    label: 'مستخدمو EMC المسجّلون',
    hint: 'يجب أن يسجّل الشخص الدخول بحسابه في المنصة، وتُسجَّل إجابته باسمه.',
  },
  invited: {
    label: 'مدعوّون فقط',
    hint: 'يستطيع التعبئة فقط المستخدمون الذين تدعوهم، وبحساباتهم هم. رابط يُعاد توجيهه لا يغني عن تسجيل الدخول بالحساب المدعو.',
  },
}

export const LINK_STATUS_AR: Record<ShareLinkStatus, { label: string; tone: string }> = {
  active: { label: 'نشط', tone: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  expired: { label: 'منتهي الصلاحية', tone: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' },
  exhausted: { label: 'اكتمل عدد الإجابات', tone: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' },
  revoked: { label: 'مُلغى', tone: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
}

/** The colour of the public-status banner, by what the public can do. */
export function publicTone(reachable: boolean, accepting: boolean): string {
  if (accepting) return 'bg-emerald-50 text-emerald-900 ring-emerald-200'
  if (!reachable) return 'bg-slate-100 text-slate-700 ring-slate-200'

  return 'bg-amber-50 text-amber-900 ring-amber-200'
}

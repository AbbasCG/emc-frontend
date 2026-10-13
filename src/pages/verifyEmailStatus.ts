export type VerifyEmailStatus = 'success' | 'already' | 'expired' | 'invalid'

export const VERIFY_EMAIL_COPY: Record<VerifyEmailStatus, { title: string; body: string }> = {
  success: { title: 'تم التوثيق', body: 'تم توثيق بريدك الإلكتروني بنجاح.' },
  already: { title: 'موثّق مسبقًا', body: 'بريدك الإلكتروني موثّق مسبقًا.' },
  expired: { title: 'الرابط غير صالح', body: 'رابط التوثيق غير صالح أو انتهت صلاحيته.' },
  invalid: { title: 'الرابط غير صالح', body: 'رابط التوثيق غير صالح أو انتهت صلاحيته.' },
}

export function parseVerifyEmailStatus(raw: string | null): VerifyEmailStatus {
  return raw === 'success' || raw === 'already' || raw === 'expired' || raw === 'invalid' ? raw : 'invalid'
}

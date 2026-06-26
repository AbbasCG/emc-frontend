// ar-EG-u-nu-latn → Arabic month names with Latin (English) digits, Europe/Amsterdam timezone
const TZ = 'Europe/Amsterdam'
const arDate = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ })
const arDateTime = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: TZ,
})

export function fmtDate(raw: string | null | undefined): string {
  if (!raw) return '—'
  try { return arDate.format(new Date(raw)) } catch { return raw }
}

export function fmtDateTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  try { return arDateTime.format(new Date(raw)) } catch { return raw }
}

export function fmtNum(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

export function normCourseTitle(raw: string | null | undefined): string {
  return raw?.trim() || 'دورة غير مرتبطة'
}

export function normInstructor(raw: string | null | undefined): string {
  return raw?.trim() || 'بدون مدرب'
}

export function normStatus(raw: string | null | undefined): string {
  if (!raw) return '—'
  const map: Record<string, string> = {
    scheduled: 'قادمة',
    live: 'مباشرة',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
    active: 'نشط',
    archived: 'أرشيف',
    pending: 'معلّق',
    submitted: 'مُسلَّم',
    graded: 'مُقيَّم',
    present: 'حاضر',
    absent: 'غائب',
    late: 'متأخر',
    excused: 'معذور',
    in_progress: 'جارٍ',
    not_started: 'لم يبدأ',
  }
  return map[raw] ?? raw
}

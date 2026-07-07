// ar-EG-u-nu-latn → Arabic month names with Latin (English) digits, Europe/Amsterdam timezone
const TZ = 'Europe/Amsterdam'
const arDate = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ })
const arDateTime = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: TZ,
})
const en24h = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })

export function fmtDate(raw: string | null | undefined): string {
  if (!raw) return '—'
  try { return arDate.format(new Date(raw)) } catch { return raw }
}

export function fmtDateTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  try { return arDateTime.format(new Date(raw)) } catch { return raw }
}

/** "HH:MM" or "HH:MM:SS" → Arabic 12h: "09:00 ص" / "07:00 م" */
export function formatLmsTime(rawTime: string | null | undefined): string {
  if (!rawTime) return '—'
  try {
    const parts = rawTime.split(':')
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1] ?? '0', 10)
    if (isNaN(h) || isNaN(m)) return rawTime
    const ampm = h >= 12 ? 'م' : 'ص'
    const h12 = h % 12 || 12
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
  } catch { return rawTime ?? '—' }
}

/** ISO date → "10 يوليو 2026" (Amsterdam TZ) */
export const formatLmsDate = fmtDate

/** ISO datetime → "10 يوليو 2026، 07:00 م" — avoids BiDi artifacts */
export function formatLmsDateTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return raw
    const datePart = arDate.format(d)
    const time24 = en24h.format(d)          // e.g. "19:00"
    return `${datePart}، ${formatLmsTime(time24)}`
  } catch { return raw ?? '—' }
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

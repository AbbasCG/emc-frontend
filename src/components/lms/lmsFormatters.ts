const arDate = new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
const arDateTime = new Intl.DateTimeFormat('ar-EG', {
  year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

export function fmtDate(raw: string | null | undefined): string {
  if (!raw) return '—'
  try { return arDate.format(new Date(raw)) } catch { return raw }
}

export function fmtDateTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  try { return arDateTime.format(new Date(raw)) } catch { return raw }
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

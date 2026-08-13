/** Canonical volunteer education levels — stable DB values + Arabic labels. */

export const EDUCATION_LEVELS = [
  { value: 'none', label: 'بدون مؤهل / لا يوجد' },
  { value: 'primary', label: 'المرحلة الابتدائية' },
  { value: 'middle_school', label: 'المرحلة الإعدادية / المتوسطة' },
  { value: 'high_school', label: 'الثانوية العامة' },
  { value: 'diploma', label: 'دبلوم' },
  { value: 'higher_diploma', label: 'دبلوم عالي' },
  { value: 'bachelor', label: 'بكالوريوس' },
  { value: 'master', label: 'ماجستير' },
  { value: 'doctorate', label: 'دكتوراه' },
  { value: 'fellowship_board', label: 'زمالة / بورد مهني' },
  { value: 'professional_certificate', label: 'شهادة مهنية' },
  { value: 'university_student', label: 'طالب جامعي' },
  { value: 'other', label: 'أخرى' },
] as const

export type EducationLevelValue = (typeof EDUCATION_LEVELS)[number]['value']

const BY_VALUE = new Map<string, string>(EDUCATION_LEVELS.map((e) => [e.value, e.label]))
const BY_LABEL = new Map<string, string>(EDUCATION_LEVELS.map((e) => [e.label, e.value]))

/** Human-readable label for HR/detail views. Preserves unknown legacy text. */
export function getEducationLabel(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null
  const trimmed = stored.trim()
  return BY_VALUE.get(trimmed) ?? trimmed
}

/**
 * Map a stored education value into select + optional "other" text.
 * Supports canonical codes, exact Arabic labels, and free-text legacy rows.
 */
export function educationToFormState(stored: string | null | undefined): {
  select: string
  other: string
} {
  if (!stored?.trim()) return { select: '', other: '' }
  const trimmed = stored.trim()
  if (BY_VALUE.has(trimmed) && trimmed !== 'other') {
    return { select: trimmed, other: '' }
  }
  if (trimmed === 'other') return { select: 'other', other: '' }
  const fromLabel = BY_LABEL.get(trimmed)
  if (fromLabel && fromLabel !== 'other') return { select: fromLabel, other: '' }
  return { select: 'other', other: trimmed }
}

/** Persist select (+ other text) back to the education string field. */
export function educationFromFormState(select: string, other: string): string | undefined {
  if (!select) return undefined
  if (select === 'other') {
    const custom = other.trim()
    return custom || 'other'
  }
  return select
}

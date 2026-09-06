export const UNIVERSITY_SPECIALIZATIONS = [
  'هندسة البرمجيات',
  'علوم الحاسوب',
  'تقنية المعلومات',
  'الذكاء الاصطناعي',
  'هندسة الشبكات',
  'إدارة الأعمال',
  'المحاسبة',
  'التسويق',
  'التمويل والمصارف',
  'القانون',
  'الطب البشري',
  'طب الأسنان',
  'الصيدلة',
  'التمريض',
  'التغذية العلاجية',
  'الهندسة المدنية',
  'الهندسة الكهربائية',
  'الهندسة الميكانيكية',
  'العمارة',
  'اللغة الإنجليزية',
  'اللغة العربية وآدابها',
  'الترجمة',
  'التربية',
  'علم النفس',
  'العلوم السياسية',
  'الإعلام والصحافة',
  'التصميم الجرافيكي',
  'أخرى',
] as const

export const UNIVERSITY_SPECIALIZATION_OTHER = 'أخرى'

/** Split a stored free-text specialization into {select, other} for the combobox+custom-input UI. */
export function specializationToFormState(value: string | null | undefined): { select: string; other: string } {
  if (!value) return { select: '', other: '' }
  const known = (UNIVERSITY_SPECIALIZATIONS as readonly string[]).includes(value)
  return known ? { select: value, other: '' } : { select: UNIVERSITY_SPECIALIZATION_OTHER, other: value }
}

/** Combine the combobox selection + optional custom text back into the single stored string. */
export function specializationFromFormState(select: string, other: string): string | undefined {
  if (!select) return undefined
  if (select === UNIVERSITY_SPECIALIZATION_OTHER) return other.trim() || undefined
  return select
}

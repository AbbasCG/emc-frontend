/**
 * The questions both volunteer application forms ask, in one place.
 *
 * `/volunteer/apply` (general) is the source of truth; the opportunity form follows it field for field. The only
 * deliberate difference is the department: a general applicant picks one, while an opportunity applicant applies
 * to the opportunity's own department, which the server fills in.
 */

export const EXPERIENCE_LEVELS = ['مبتدئ', 'متوسط', 'متقدم', 'خبير']

export const AVAILABILITY_OPTIONS = ['أقل من 3 ساعات أسبوعيًا', '3-5 ساعات أسبوعيًا', '5-10 ساعات أسبوعيًا', 'أكثر من 10 ساعات أسبوعيًا']

export const GENDER_OPTIONS = [
  { value: 'male', label: 'ذكر' },
  { value: 'female', label: 'أنثى' },
] as const

/** Field labels, exactly as the general form words them. */
export const FORM_LABELS = {
  fullName: 'الاسم الكامل',
  email: 'البريد الإلكتروني',
  phone: 'رقم الجوال',
  country: 'الدولة',
  city: 'المدينة',
  gender: 'الجنس',
  department: 'القسم الذي ترغب بالتطوع فيه',
  experienceLevel: 'مستوى الخبرة',
  availability: 'التوفر الأسبوعي',
  skills: 'المهارات',
  motivation: 'لماذا ترغب بالتطوع مع EMC؟',
  previousExperience: 'هل لديك خبرة سابقة في التطوع؟',
  cv: 'السيرة الذاتية',
  notes: 'ملاحظات إضافية',
} as const

export const CONSENT_TEXT = 'أوافق على استخدام بياناتي لغرض مراجعة طلب التطوع والتواصل معي.'
export const MOTIVATION_MIN = 20

import {
  COMMITMENT_STATEMENTS,
  MOTIVATION_STATEMENTS,
  SITUATIONAL_QUESTIONS,
} from '@/components/volunteerOpportunities/volunteerFormSpec'
import {
  FIELD_STEP,
  VOLUNTEER_STEP_COUNT,
  type VolunteerFieldKey,
  type VolunteerFormState,
} from './formModel'

/** A message per field that needs attention. Only fields with a problem are present. */
export type VolunteerFieldErrors = Partial<Record<VolunteerFieldKey, string>>

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ARABIC_INDIC = /[\u0660-\u0669]/g
const EASTERN_PERSIAN = /[\u06F0-\u06F9]/g

/** Digits typed on an Arabic keyboard count as digits. */
function latinDigits(value: string): string {
  return value
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(EASTERN_PERSIAN, (d) => String(d.charCodeAt(0) - 0x06f0))
}

/**
 * A phone number with its country code: digits with an optional leading + and the usual separators, 7 to 15 digits
 * (the international maximum) and at most 30 characters, which is what the server accepts.
 */
export function isPlausiblePhone(raw: string): boolean {
  const value = latinDigits(raw).trim()
  if (value.length === 0 || value.length > 30) return false
  // One + at the start, or inside an opening bracket as in "(+966) 50 123 4567"; the rest is digits and separators.
  if (!/^(?:\+|\(\+)?[\d\s().-]+$/.test(value)) return false
  const digits = value.replace(/\D/g, '').length
  return digits >= 7 && digits <= 15
}

export const MESSAGES = {
  full_name: 'يرجى إدخال الاسم الرباعي.',
  email_required: 'يرجى إدخال البريد الإلكتروني.',
  email_invalid: 'البريد الإلكتروني غير صالح. اكتبه بالشكل name@example.com.',
  phone_required: 'يرجى إدخال رقم الجوال مع مفتاح الدولة.',
  phone_invalid: 'رقم الجوال غير صالح. تحقق من مفتاح الدولة والرقم.',
  country: 'يرجى اختيار بلد الإقامة.',
  city: 'يرجى إدخال المدينة.',
  education_level: 'يرجى تحديد أعلى مؤهل علمي.',
  current_status: 'يرجى تحديد وضعك الحالي.',
  job_title: 'يرجى كتابة المسمى الوظيفي.',
  volunteer_days_availability: 'يرجى تحديد مدى توافرك.',
  volunteer_days: 'يرجى اختيار يوم واحد على الأقل.',
  preferred_time_slot: 'يرجى تحديد الفترة المناسبة لك.',
  daily_hours: 'يرجى تحديد عدد الساعات اليومية.',
  has_previous_volunteering: 'يرجى الإجابة عما إذا سبق لك التطوع.',
  volunteering_duration: 'يرجى تحديد مدة خبرتك التطوعية.',
  motivation_ratings: 'يرجى تقييم جميع عبارات الدافعية.',
  commitment_ratings: 'يرجى تقييم جميع عبارات الجدية والالتزام.',
  situational_responses: 'يرجى الإجابة عن جميع أسئلة المواقف العملية.',
  primary_value_department: 'يرجى اختيار الإدارة الأنسب لمهاراتك.',
  agree_terms: 'يرجى الموافقة على استخدام البيانات قبل إرسال الطلب.',
} as const

const WEEKDAY_ANSWERS = ['أيام محددة خلال الأسبوع', 'أيام الإجازة فقط']

/** What is wrong on one level. Mirrors what the server requires, plus the checks a person can fix before sending. */
export function validateVolunteerStep(form: VolunteerFormState, step: number): VolunteerFieldErrors {
  const errors: VolunteerFieldErrors = {}

  if (step === 1) {
    if (!form.full_name.trim()) errors.full_name = MESSAGES.full_name

    if (!form.email.trim()) errors.email = MESSAGES.email_required
    else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = MESSAGES.email_invalid

    if (!form.phone.trim()) errors.phone = MESSAGES.phone_required
    else if (!isPlausiblePhone(form.phone)) errors.phone = MESSAGES.phone_invalid

    if (!form.country) errors.country = MESSAGES.country
    if (!form.city.trim()) errors.city = MESSAGES.city
  }

  if (step === 2) {
    if (!form.education_level) errors.education_level = MESSAGES.education_level
    if (!form.current_status) errors.current_status = MESSAGES.current_status
    if (form.current_status === 'موظف' && !form.job_title.trim()) errors.job_title = MESSAGES.job_title
    if (!form.volunteer_days_availability) errors.volunteer_days_availability = MESSAGES.volunteer_days_availability
    if (WEEKDAY_ANSWERS.includes(form.volunteer_days_availability) && form.volunteer_days.length === 0) {
      errors.volunteer_days = MESSAGES.volunteer_days
    }
    if (!form.preferred_time_slot) errors.preferred_time_slot = MESSAGES.preferred_time_slot
    if (!form.daily_hours) errors.daily_hours = MESSAGES.daily_hours
  }

  if (step === 3) {
    if (form.has_previous_volunteering === null) errors.has_previous_volunteering = MESSAGES.has_previous_volunteering
    if (form.has_previous_volunteering === true && !form.volunteering_duration) {
      errors.volunteering_duration = MESSAGES.volunteering_duration
    }
  }

  if (step === 4) {
    if (MOTIVATION_STATEMENTS.some((s) => !form.motivation_ratings[s.id])) errors.motivation_ratings = MESSAGES.motivation_ratings
    if (COMMITMENT_STATEMENTS.some((s) => !form.commitment_ratings[s.id])) errors.commitment_ratings = MESSAGES.commitment_ratings
    if (SITUATIONAL_QUESTIONS.some((q) => !form.situational_responses[q.id])) errors.situational_responses = MESSAGES.situational_responses
  }

  if (step === 5) {
    if (!form.primary_value_department) errors.primary_value_department = MESSAGES.primary_value_department
    if (!form.agree_terms) errors.agree_terms = MESSAGES.agree_terms
  }

  return errors
}

const FIELD_ORDER = Object.keys(FIELD_STEP) as VolunteerFieldKey[]

/** Fields with a message, in the order they appear on the form. */
export function orderedErrorFields(errors: VolunteerFieldErrors): VolunteerFieldKey[] {
  return FIELD_ORDER.filter((key) => Boolean(errors[key]))
}

/** The whole application at once: every message, and the earliest level that has one. */
export function validateVolunteerForm(form: VolunteerFormState): { errors: VolunteerFieldErrors; firstStep: number | null } {
  const errors: VolunteerFieldErrors = {}
  for (let step = 1; step <= VOLUNTEER_STEP_COUNT; step++) Object.assign(errors, validateVolunteerStep(form, step))

  const first = orderedErrorFields(errors)[0]

  return { errors, firstStep: first ? FIELD_STEP[first] : null }
}

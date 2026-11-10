import type { Country } from '@/components/ui/CountrySelector'

/**
 * The five-level volunteer application: its values, the level each field lives on, and the Arabic name used in
 * messages. One place, so validation, server errors and the screen all agree on which field is on which level.
 */

export interface VolunteerFormState {
  // المستوى الأول
  full_name: string
  birth_date: string
  nationality: string
  country: Country | null
  city: string
  phone: string
  email: string
  gender: string

  // المستوى الثاني
  education_level: string
  current_status: string
  job_title: string
  specialization: string
  volunteer_days_availability: string
  volunteer_days: string[]
  preferred_time_slot: string
  daily_hours: string
  in_person_capable: string
  remote_capable: string

  // المستوى الثالث
  has_previous_volunteering: boolean | null
  volunteering_organizations: string
  volunteering_duration: string
  past_volunteer_tasks: string[]
  personal_skills: string[]
  skill_level_rating: number
  technical_tools: string[]
  value_add_contributions: string
  portfolio_link_status: string
  portfolio_url: string
  cv_file: File | null

  // المستوى الرابع
  motivation_ratings: Record<string, number>
  commitment_ratings: Record<string, number>
  situational_responses: Record<string, string>
  expected_duration: string
  commitment_three_months: string

  // المستوى الخامس
  reasons_for_applying: string[]
  expected_gains: string[]
  primary_value_department: string
  department_skills: string[]
  preferred_work_environment: string
  quit_reasons: string[]
  suggestions: string
  notes: string
  agree_terms: boolean
}

export type VolunteerFieldKey = keyof VolunteerFormState

export const initialVolunteerForm: VolunteerFormState = {
  full_name: '',
  birth_date: '',
  nationality: '',
  country: null,
  city: '',
  phone: '',
  email: '',
  gender: '',

  education_level: '',
  current_status: '',
  job_title: '',
  specialization: '',
  volunteer_days_availability: '',
  volunteer_days: [],
  preferred_time_slot: '',
  daily_hours: '',
  in_person_capable: '',
  remote_capable: '',

  has_previous_volunteering: null,
  volunteering_organizations: '',
  volunteering_duration: '',
  past_volunteer_tasks: [],
  personal_skills: [],
  skill_level_rating: 3,
  technical_tools: [],
  value_add_contributions: '',
  portfolio_link_status: '',
  portfolio_url: '',
  cv_file: null,

  motivation_ratings: {},
  commitment_ratings: {},
  situational_responses: {},
  expected_duration: '',
  commitment_three_months: '',

  reasons_for_applying: [],
  expected_gains: [],
  primary_value_department: '',
  department_skills: [],
  preferred_work_environment: '',
  quit_reasons: [],
  suggestions: '',
  notes: '',
  agree_terms: false,
}

export const VOLUNTEER_STEP_COUNT = 5

/** The level (1 to 5) each field is asked on. */
export const FIELD_STEP: Record<VolunteerFieldKey, number> = {
  full_name: 1, birth_date: 1, nationality: 1, country: 1, city: 1, phone: 1, email: 1, gender: 1,
  education_level: 2, current_status: 2, job_title: 2, specialization: 2, volunteer_days_availability: 2, volunteer_days: 2,
  preferred_time_slot: 2, daily_hours: 2, in_person_capable: 2, remote_capable: 2,
  has_previous_volunteering: 3, volunteering_organizations: 3, volunteering_duration: 3, past_volunteer_tasks: 3, personal_skills: 3,
  skill_level_rating: 3, technical_tools: 3, value_add_contributions: 3, portfolio_link_status: 3, portfolio_url: 3, cv_file: 3,
  motivation_ratings: 4, commitment_ratings: 4, situational_responses: 4, expected_duration: 4, commitment_three_months: 4,
  reasons_for_applying: 5, expected_gains: 5, primary_value_department: 5, department_skills: 5, preferred_work_environment: 5,
  quit_reasons: 5, suggestions: 5, notes: 5, agree_terms: 5,
}

/** How each field is named in a sentence. */
export const FIELD_LABEL: Record<VolunteerFieldKey, string> = {
  full_name: 'الاسم الرباعي', birth_date: 'تاريخ الميلاد', nationality: 'الجنسية', country: 'بلد الإقامة', city: 'المدينة',
  phone: 'رقم الجوال', email: 'البريد الإلكتروني', gender: 'الجنس',
  education_level: 'أعلى مؤهل علمي', current_status: 'الوضع الحالي', job_title: 'المسمى الوظيفي', specialization: 'التخصص',
  volunteer_days_availability: 'مدى التوافر', volunteer_days: 'أيام التطوع', preferred_time_slot: 'الفترة المناسبة', daily_hours: 'الساعات اليومية',
  in_person_capable: 'المشاركة الحضورية', remote_capable: 'المشاركة عن بُعد',
  has_previous_volunteering: 'الخبرة التطوعية السابقة', volunteering_organizations: 'الجهات التي تطوعت معها', volunteering_duration: 'مدة الخبرة التطوعية',
  past_volunteer_tasks: 'المهام السابقة', personal_skills: 'المهارات', skill_level_rating: 'مستوى المهارات', technical_tools: 'الأدوات التقنية',
  value_add_contributions: 'ما تستطيع تقديمه للمؤسسة', portfolio_link_status: 'نماذج الأعمال', portfolio_url: 'رابط نماذج الأعمال', cv_file: 'السيرة الذاتية',
  motivation_ratings: 'مقياس الدافعية', commitment_ratings: 'مقياس الجدية والالتزام', situational_responses: 'أسئلة المواقف العملية',
  expected_duration: 'مدة الاستمرار المتوقعة', commitment_three_months: 'الالتزام لثلاثة أشهر',
  reasons_for_applying: 'أسباب التقديم', expected_gains: 'ما تتوقع الحصول عليه', primary_value_department: 'الإدارة الأنسب لمهاراتك',
  department_skills: 'مهاراتك في الإدارة', preferred_work_environment: 'بيئة العمل المفضلة', quit_reasons: 'أسباب التوقف',
  suggestions: 'الاقتراحات', notes: 'الملاحظات', agree_terms: 'الموافقة على استخدام البيانات',
}

/**
 * Server field names that are not form field names, plus the ones that arrive as `field.0` / `field.key`.
 * `desired_department`, `skills`, `availability` and `previous_experience` are filled by the form from other answers,
 * so a message about them belongs to the answer the person actually gave.
 */
const SERVER_ALIAS: Record<string, VolunteerFieldKey> = {
  desired_department: 'primary_value_department',
  skills: 'personal_skills',
  availability: 'volunteer_days_availability',
  previous_experience: 'volunteering_organizations',
  experience_level: 'education_level',
  motivation: 'value_add_contributions',
  volunteer_days_availability: 'volunteer_days_availability',
}

export function isVolunteerField(key: string): key is VolunteerFieldKey {
  return Object.prototype.hasOwnProperty.call(FIELD_STEP, key)
}

/** The form field a server validation key refers to, or null when it is not one the form shows. */
export function serverFieldToFormField(serverKey: string): VolunteerFieldKey | null {
  const base = serverKey.split('.')[0] ?? serverKey
  if (Object.prototype.hasOwnProperty.call(SERVER_ALIAS, base)) return SERVER_ALIAS[base]
  return isVolunteerField(base) ? base : null
}

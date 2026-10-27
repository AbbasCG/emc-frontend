import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { CenteredModal } from '@/components/ui/CenteredModal'
import LanguagesSelect from '@/components/forms/LanguagesSelect'
import { getApiErrorMessage, getLaravelFieldErrors } from '@/api/apiErrors'
import { fetchJobTitles, type JobTitleOption } from '@/api/jobTitlesApi'
import { updateHrVolunteerProfile, type HrVolunteerProfilePatch } from '@/api/hrVolunteerProfilesApi'
import type { VolunteerHrProfile } from '@/api/volunteerHrProfileApi'
import { ALL_COUNTRIES } from '@/lib/countries'
import { EDUCATION_LEVELS } from '@/data/educationLevels'
import { buildNationalityOptions } from '@/data/nationalities'

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/20 aria-[invalid=true]:border-red-400'
const BIO_MAX = 500

const EMPLOYMENT_OPTIONS = [
  { value: 'volunteer', label: 'متطوع منتظم' },
  { value: 'intern', label: 'متدرب' },
  { value: 'part_time', label: 'دوام جزئي' },
  { value: 'full_time', label: 'دوام كامل' },
]

type Values = {
  full_name: string
  email: string
  phone: string
  phone_country_code: string
  country_code: string
  country: string
  city: string
  date_of_birth: string
  gender: string
  nationality: string
  department_id: string
  job_title: string
  employment_type: string
  join_date: string
  availability: string
  weekly_hours: string
  skills: string
  languages: string[]
  education: string
  university_specialization: string
  experience: string
  professional_bio: string
  linkedin_url: string
  portfolio_url: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

function fromProfile(p: VolunteerHrProfile): Values {
  return {
    full_name: p.full_name ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
    phone_country_code: p.phone_country_code ?? '',
    country_code: p.country_code ?? '',
    country: p.country ?? '',
    city: p.city ?? '',
    date_of_birth: p.date_of_birth ?? '',
    gender: p.gender ?? '',
    nationality: p.nationality ?? '',
    department_id: p.department_id ? String(p.department_id) : '',
    job_title: p.job_title ?? '',
    employment_type: p.employment_type ?? '',
    join_date: p.join_date ?? '',
    availability: p.availability ?? '',
    weekly_hours: p.weekly_hours != null ? String(p.weekly_hours) : '',
    skills: p.skills ?? '',
    languages: Array.isArray(p.languages) ? p.languages : [],
    education: p.education ?? '',
    university_specialization: p.university_specialization ?? '',
    experience: p.experience ?? '',
    professional_bio: p.professional_bio ?? '',
    linkedin_url: p.linkedin_url ?? '',
    portfolio_url: p.portfolio_url ?? '',
    emergency_contact_name: p.emergency_contact_name ?? '',
    emergency_contact_phone: p.emergency_contact_phone ?? '',
  }
}

const orNull = (v: string) => (v.trim() === '' ? null : v.trim())

/** Only the fields that differ from what was loaded: a save never rewrites a value nobody touched. */
function patchOf(initial: Values, v: Values): HrVolunteerProfilePatch {
  const out: HrVolunteerProfilePatch = {}
  const text = ['full_name', 'email', 'phone', 'job_title', 'join_date'] as const
  for (const k of text) if (v[k].trim() !== initial[k].trim()) out[k] = v[k].trim()
  const nullable = [
    'phone_country_code', 'country', 'country_code', 'city', 'date_of_birth', 'gender', 'nationality', 'employment_type',
    'availability', 'skills', 'education', 'university_specialization', 'experience', 'professional_bio', 'linkedin_url',
    'portfolio_url', 'emergency_contact_name', 'emergency_contact_phone',
  ] as const
  for (const k of nullable) if (v[k].trim() !== initial[k].trim()) out[k] = orNull(v[k])
  if (v.department_id !== initial.department_id) out.department_id = Number(v.department_id)
  if (v.weekly_hours !== initial.weekly_hours) out.weekly_hours = v.weekly_hours.trim() === '' ? null : Number(v.weekly_hours)
  if (JSON.stringify(v.languages) !== JSON.stringify(initial.languages)) out.languages = v.languages

  return out
}

/** The checks the server makes too, so the obvious mistakes are caught before a round trip. The server stays the authority. */
function localErrors(v: Values): Record<string, string> {
  const e: Record<string, string> = {}
  if (!v.full_name.trim()) e.full_name = 'الاسم الكامل مطلوب.'
  if (!v.email.trim()) e.email = 'البريد الإلكتروني مطلوب.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'صيغة البريد الإلكتروني غير صحيحة.'
  if (!v.phone.trim()) e.phone = 'رقم الهاتف مطلوب.'
  if (!v.department_id) e.department_id = 'القسم مطلوب.'
  if (!v.job_title.trim()) e.job_title = 'المسمى الوظيفي مطلوب.'
  if (!v.join_date) e.join_date = 'تاريخ الانضمام مطلوب.'
  if (v.weekly_hours.trim() !== '' && (!/^\d+$/.test(v.weekly_hours.trim()) || Number(v.weekly_hours) > 168)) e.weekly_hours = 'أدخل عدد ساعات بين 0 و168.'
  if (v.professional_bio.length > BIO_MAX) e.professional_bio = `النبذة المهنية لا تتجاوز ${BIO_MAX} حرف.`
  for (const k of ['linkedin_url', 'portfolio_url'] as const) {
    if (v[k].trim() && !/^https?:\/\/\S+$/i.test(v[k].trim())) e[k] = 'أدخل رابطاً كاملاً يبدأ بـ https://'
  }

  return e
}

function Field({ label, htmlFor, error, required, hint, children }: { label: string; htmlFor: string; error?: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={htmlFor} className="text-[12px] font-black text-deepBlue">
        {label}
        {required && <span className="text-red-600" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] font-semibold text-slate-400">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} role="alert" className="text-[11px] font-bold text-red-700">{error}</p>}
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <legend className="px-1 text-[12px] font-black text-slate-500">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

/**
 * HR edits a volunteer's profile. The fields are the ones the HR profile really holds; the review status, the account, the
 * volunteer's consents and their files are not here. For an accepted volunteer, the name, job title, department, contact details,
 * place, gender, skills and join date also update their team record (the server does it, in the same save).
 */
export default function HrVolunteerProfileEditModal({
  profile,
  departments,
  onClose,
  onSaved,
}: {
  profile: VolunteerHrProfile
  departments: { id: number; name: string }[]
  onClose: () => void
  onSaved: (next: VolunteerHrProfile) => void
}) {
  const initial = useMemo(() => fromProfile(profile), [profile])
  const [values, setValues] = useState<Values>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [jobTitles, setJobTitles] = useState<JobTitleOption[]>([])

  const departmentId = values.department_id
  useEffect(() => {
    if (!departmentId) return
    let cancelled = false
    fetchJobTitles(Number(departmentId)).then((rows) => { if (!cancelled) setJobTitles(rows) }).catch(() => { if (!cancelled) setJobTitles([]) })
    return () => { cancelled = true }
  }, [departmentId])

  const patch = patchOf(initial, values)
  const dirty = Object.keys(patch).length > 0
  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => {
      if (!e[key]) return e
      const { [key]: _gone, ...rest } = e
      void _gone
      return rest
    })
  }

  // Values stored before the pickers existed stay selectable, so opening and saving the form never changes them by itself.
  const countryOptions = useMemo(() => {
    const list = ALL_COUNTRIES.map((c) => ({ code: c.code, name: c.name }))
    if (initial.country && !list.some((c) => c.name === initial.country)) list.unshift({ code: initial.country_code, name: initial.country })
    return list
  }, [initial.country, initial.country_code])
  const nationalityOptions = useMemo(() => {
    const list = buildNationalityOptions().map((o) => ({ value: o.value, label: o.label }))
    if (initial.nationality && !list.some((o) => o.value === initial.nationality)) list.unshift({ value: initial.nationality, label: initial.nationality })
    return list
  }, [initial.nationality])
  const educationOptions = useMemo(() => {
    const list: { value: string; label: string }[] = EDUCATION_LEVELS.filter((l) => l.value !== 'other').map((l) => ({ value: l.value, label: l.label }))
    if (initial.education && !list.some((l) => l.value === initial.education)) list.push({ value: initial.education, label: initial.education })
    return list
  }, [initial.education])
  const genderOptions = useMemo(() => {
    const list = [{ value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }]
    if (initial.gender && !list.some((g) => g.value === initial.gender)) list.push({ value: initial.gender, label: initial.gender })
    return list
  }, [initial.gender])
  const employmentOptions = useMemo(() => {
    if (initial.employment_type && !EMPLOYMENT_OPTIONS.some((o) => o.value === initial.employment_type)) {
      return [...EMPLOYMENT_OPTIONS, { value: initial.employment_type, label: initial.employment_type }]
    }
    return EMPLOYMENT_OPTIONS
  }, [initial.employment_type])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setFormError(null)
    const local = localErrors(values)
    setErrors(local)
    if (Object.keys(local).length > 0) {
      setFormError('راجع الحقول المحددة قبل الحفظ.')
      return
    }
    if (!dirty) {
      onClose()
      return
    }
    setSaving(true)
    try {
      const next = await updateHrVolunteerProfile(profile.id, patch, profile.updated_at)
      onSaved(next)
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      if (status === 422) {
        const fieldErrors = getLaravelFieldErrors(err)
        setErrors(fieldErrors)
        setFormError(Object.keys(fieldErrors).length ? 'لم تُحفظ التعديلات. راجع الحقول المحددة.' : getApiErrorMessage(err))
      } else if (status === 409) {
        setFormError('تم تعديل ملف المتطوع بعد أن فتحته. أغلق النافذة وأعد فتح الملف لتحميل آخر البيانات، ثم عدّل مرة أخرى.')
      } else if (status === 403) {
        setFormError('لا تملك صلاحية تعديل ملفات المتطوعين.')
      } else {
        setFormError(getApiErrorMessage(err) || 'تعذّر حفظ التعديلات. حاول مرة أخرى.')
      }
    } finally {
      setSaving(false)
    }
  }

  const invalid = (k: string) => (errors[k] ? { 'aria-invalid': true as const, 'aria-describedby': `vol-${k}-error` } : {})
  const linked = profile.status === 'approved'

  return (
    <CenteredModal
      open
      onClose={onClose}
      title="تعديل بيانات المتطوع"
      subtitle={profile.full_name}
      size="lg"
      busy={saving}
      dirty={dirty}
      dirtyMessage="لديك تعديلات لم تُحفظ على بيانات المتطوع. هل تريد إغلاق النافذة وتجاهلها؟"
      testId="hr-volunteer-edit"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            إلغاء
          </button>
          <button type="submit" form="hr-volunteer-edit-form" disabled={saving || !dirty} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-customBlue px-5 py-2.5 text-[12px] font-black text-white shadow-sm hover:opacity-90 disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" aria-hidden />}
            {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      }
    >
      <form id="hr-volunteer-edit-form" onSubmit={(e) => void submit(e)} noValidate dir="rtl" className="grid gap-4 p-4 text-right sm:p-6">
        {linked && (
          <p className="rounded-xl bg-sky-50 px-4 py-3 text-[12px] font-bold leading-6 text-sky-900 ring-1 ring-sky-100">
            المتطوع مقبول: الاسم والمسمى الوظيفي والقسم وبيانات التواصل والدولة والمدينة والجنس والمهارات وتاريخ الانضمام تُحدَّث في سجل الفريق أيضاً. لا يتغير ظهوره في الفريق ولا دوره ولا صلاحياته.
          </p>
        )}
        {formError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[12px] font-bold text-red-700">{formError}</p>}

        <Group title="البيانات الشخصية">
          <Field label="الاسم الكامل" htmlFor="vol-full_name" required error={errors.full_name}>
            <input id="vol-full_name" value={values.full_name} onChange={(e) => set('full_name', e.target.value)} maxLength={255} className={INPUT} {...invalid('full_name')} />
          </Field>
          <Field label="الجنس" htmlFor="vol-gender" error={errors.gender}>
            <select id="vol-gender" value={values.gender} onChange={(e) => set('gender', e.target.value)} className={INPUT} {...invalid('gender')}>
              <option value="">غير محدد</option>
              {genderOptions.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="تاريخ الميلاد" htmlFor="vol-date_of_birth" error={errors.date_of_birth}>
            <input id="vol-date_of_birth" type="date" value={values.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} className={INPUT} {...invalid('date_of_birth')} />
          </Field>
          <Field label="الجنسية" htmlFor="vol-nationality" error={errors.nationality}>
            <select id="vol-nationality" value={values.nationality} onChange={(e) => set('nationality', e.target.value)} className={INPUT} {...invalid('nationality')}>
              <option value="">غير محددة</option>
              {nationalityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </Group>

        <Group title="التواصل والإقامة">
          <Field label="البريد الإلكتروني" htmlFor="vol-email" required error={errors.email} hint="بريد ملف التطوع. لا يغيّر بريد تسجيل الدخول في حساب المتطوع.">
            <input id="vol-email" type="email" dir="ltr" value={values.email} onChange={(e) => set('email', e.target.value)} maxLength={255} className={`${INPUT} text-left`} {...invalid('email')} />
          </Field>
          <div className="grid grid-cols-[6.5rem_1fr] gap-2">
            <Field label="رمز الدولة" htmlFor="vol-phone_country_code" error={errors.phone_country_code}>
              <input id="vol-phone_country_code" dir="ltr" value={values.phone_country_code} onChange={(e) => set('phone_country_code', e.target.value)} maxLength={10} placeholder="+31" className={`${INPUT} text-left`} {...invalid('phone_country_code')} />
            </Field>
            <Field label="رقم الهاتف" htmlFor="vol-phone" required error={errors.phone}>
              <input id="vol-phone" type="tel" dir="ltr" value={values.phone} onChange={(e) => set('phone', e.target.value)} maxLength={30} className={`${INPUT} text-left`} {...invalid('phone')} />
            </Field>
          </div>
          <Field label="دولة الإقامة" htmlFor="vol-country" error={errors.country}>
            <select
              id="vol-country"
              value={values.country}
              onChange={(e) => {
                const c = countryOptions.find((o) => o.name === e.target.value)
                setValues((v) => ({ ...v, country: e.target.value, country_code: c?.code ?? '' }))
              }}
              className={INPUT}
              {...invalid('country')}
            >
              <option value="">غير محددة</option>
              {countryOptions.map((c) => <option key={`${c.code}-${c.name}`} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="المدينة" htmlFor="vol-city" error={errors.city}>
            <input id="vol-city" value={values.city} onChange={(e) => set('city', e.target.value)} maxLength={100} className={INPUT} {...invalid('city')} />
          </Field>
        </Group>

        <Group title="التطوع والعضوية">
          <Field label="القسم" htmlFor="vol-department_id" required error={errors.department_id}>
            <select id="vol-department_id" value={values.department_id} onChange={(e) => set('department_id', e.target.value)} className={INPUT} {...invalid('department_id')}>
              <option value="">اختر القسم</option>
              {departments.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              {values.department_id && !departments.some((d) => String(d.id) === values.department_id) && (
                <option value={values.department_id}>{profile.department?.name ?? `القسم ${values.department_id}`}</option>
              )}
            </select>
          </Field>
          <Field label="المسمى الوظيفي" htmlFor="vol-job_title" required error={errors.job_title} hint={jobTitles.length ? 'اختر من مسميات القسم أو اكتب مسمى آخر.' : undefined}>
            <input id="vol-job_title" list="vol-job-titles" value={values.job_title} onChange={(e) => set('job_title', e.target.value)} maxLength={255} className={INPUT} {...invalid('job_title')} />
            <datalist id="vol-job-titles">
              {jobTitles.map((t) => <option key={t.id} value={t.name} />)}
            </datalist>
          </Field>
          <Field label="تاريخ الانضمام" htmlFor="vol-join_date" required error={errors.join_date}>
            <input id="vol-join_date" type="date" value={values.join_date} onChange={(e) => set('join_date', e.target.value)} className={INPUT} {...invalid('join_date')} />
          </Field>
          <Field label="نوع الالتزام" htmlFor="vol-employment_type" error={errors.employment_type}>
            <select id="vol-employment_type" value={values.employment_type} onChange={(e) => set('employment_type', e.target.value)} className={INPUT} {...invalid('employment_type')}>
              <option value="">غير محدد</option>
              {employmentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="التوفر" htmlFor="vol-availability" error={errors.availability}>
            <input id="vol-availability" value={values.availability} onChange={(e) => set('availability', e.target.value)} maxLength={100} placeholder="مثال: مساءً / نهاية الأسبوع" className={INPUT} {...invalid('availability')} />
          </Field>
          <Field label="الساعات الأسبوعية" htmlFor="vol-weekly_hours" error={errors.weekly_hours}>
            <input id="vol-weekly_hours" type="number" inputMode="numeric" min={0} max={168} value={values.weekly_hours} onChange={(e) => set('weekly_hours', e.target.value)} className={INPUT} {...invalid('weekly_hours')} />
          </Field>
        </Group>

        <Group title="المؤهلات والخبرات">
          <Field label="المؤهل الدراسي" htmlFor="vol-education" error={errors.education}>
            <select id="vol-education" value={values.education} onChange={(e) => set('education', e.target.value)} className={INPUT} {...invalid('education')}>
              <option value="">غير محدد</option>
              {educationOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="التخصص الجامعي" htmlFor="vol-university_specialization" error={errors.university_specialization}>
            <input id="vol-university_specialization" value={values.university_specialization} onChange={(e) => set('university_specialization', e.target.value)} maxLength={255} className={INPUT} {...invalid('university_specialization')} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="اللغات" htmlFor="vol-languages-input" error={errors.languages}>
              <LanguagesSelect value={values.languages} onChange={(next) => set('languages', next)} error={errors.languages} instanceId="vol-languages" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="المهارات" htmlFor="vol-skills" error={errors.skills} hint="افصل بين المهارات بفاصلة.">
              <textarea id="vol-skills" rows={2} value={values.skills} onChange={(e) => set('skills', e.target.value)} maxLength={2000} className={`${INPUT} resize-y`} {...invalid('skills')} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="الخبرات" htmlFor="vol-experience" error={errors.experience}>
              <textarea id="vol-experience" rows={3} value={values.experience} onChange={(e) => set('experience', e.target.value)} maxLength={4000} className={`${INPUT} resize-y`} {...invalid('experience')} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="النبذة المهنية" htmlFor="vol-professional_bio" error={errors.professional_bio} hint={`${values.professional_bio.length} / ${BIO_MAX}`}>
              <textarea id="vol-professional_bio" rows={3} value={values.professional_bio} onChange={(e) => set('professional_bio', e.target.value)} maxLength={BIO_MAX} className={`${INPUT} resize-y`} {...invalid('professional_bio')} />
            </Field>
          </div>
          <Field label="رابط LinkedIn" htmlFor="vol-linkedin_url" error={errors.linkedin_url}>
            <input id="vol-linkedin_url" type="url" dir="ltr" value={values.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} maxLength={255} placeholder="https://" className={`${INPUT} text-left`} {...invalid('linkedin_url')} />
          </Field>
          <Field label="رابط معرض الأعمال" htmlFor="vol-portfolio_url" error={errors.portfolio_url}>
            <input id="vol-portfolio_url" type="url" dir="ltr" value={values.portfolio_url} onChange={(e) => set('portfolio_url', e.target.value)} maxLength={255} placeholder="https://" className={`${INPUT} text-left`} {...invalid('portfolio_url')} />
          </Field>
        </Group>

        <Group title="جهة الاتصال في الطوارئ">
          <Field label="الاسم" htmlFor="vol-emergency_contact_name" error={errors.emergency_contact_name}>
            <input id="vol-emergency_contact_name" value={values.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} maxLength={255} className={INPUT} {...invalid('emergency_contact_name')} />
          </Field>
          <Field label="رقم الهاتف" htmlFor="vol-emergency_contact_phone" error={errors.emergency_contact_phone}>
            <input id="vol-emergency_contact_phone" type="tel" dir="ltr" value={values.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} maxLength={30} className={`${INPUT} text-left`} {...invalid('emergency_contact_phone')} />
          </Field>
        </Group>

        <p className="text-[11px] font-semibold leading-5 text-slate-400">
          لا تُعدَّل هنا كلمة المرور ولا الدور ولا حالة الطلب ولا الموافقات ولا الملفات المرفوعة.
        </p>
      </form>
    </CenteredModal>
  )
}

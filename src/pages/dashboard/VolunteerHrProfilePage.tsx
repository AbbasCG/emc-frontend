import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { CheckCircle2, Clock, FileText, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import toast from '@/lib/toast'
import { getApiErrorMessage, getLaravelFieldErrors } from '@/api/apiErrors'
import AppFileUpload from '@/components/ui/AppFileUpload'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import LanguagesSelect from '@/components/forms/LanguagesSelect'
import CountrySelector, { type Country } from '@/components/ui/CountrySelector'
import PhoneInput from '@/components/forms/PhoneInput'
import { buildE164Phone } from '@/components/forms/phoneUtils'
import { fetchDepartmentOptions, fetchJobTitles, type JobTitleOption } from '@/api/jobTitlesApi'
import {
  fetchMyVolunteerHrProfile,
  submitVolunteerHrProfile,
  updateVolunteerHrProfile,
  type VolunteerHrProfile,
  type VolunteerHrProfileFormValues,
} from '@/api/volunteerHrProfileApi'
import {
  EDUCATION_LEVELS,
  educationFromFormState,
  educationToFormState,
} from '@/data/educationLevels'
import {
  UNIVERSITY_SPECIALIZATIONS,
  UNIVERSITY_SPECIALIZATION_OTHER,
  specializationFromFormState,
  specializationToFormState,
} from '@/data/universitySpecializations'
import { ALL_COUNTRIES } from '@/lib/countries'
import {
  buildNationalityOptions,
  buildResidenceCountryOptions,
  resolveNationalityCode,
} from '@/data/nationalities'
import AnimatedSelect from '@/components/ui/AnimatedSelect'
import ConsentCard from '@/components/forms/ConsentCard'

const CUSTOM_JOB_TITLE_VALUE = '__custom__'
const BIO_MAX_LENGTH = 500
const EDUCATION_OPTIONS = EDUCATION_LEVELS.map((l) => ({ value: l.value, label: l.label }))
const SPECIALIZATION_OPTIONS = UNIVERSITY_SPECIALIZATIONS.map((s) => ({ value: s, label: s }))
const RESIDENCE_COUNTRY_OPTIONS = buildResidenceCountryOptions()
const NATIONALITY_OPTIONS = buildNationalityOptions()
const GENDER_OPTIONS = [
  { value: 'male', label: 'ذكر' },
  { value: 'female', label: 'أنثى' },
]

const STATUS_CFG: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  draft:        { label: 'مسودة',        icon: FileText,     cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  submitted:    { label: 'تم الإرسال — قيد الانتظار', icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  under_review: { label: 'قيد المراجعة',  icon: Clock,        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved:     { label: 'تم القبول',     icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:     { label: 'مرفوض',         icon: XCircle,      cls: 'bg-red-50 text-red-700 border-red-200' },
  archived:     { label: 'مؤرشف',         icon: FileText,     cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const emptyForm: VolunteerHrProfileFormValues = {
  full_name: '', email: '', phone: '', department_id: 0, job_title: '', join_date: '',
  languages: [], confirmed: false, cv_file: null, profile_photo: null,
  // Unanswered by default — never pre-checked, the volunteer must choose explicitly.
  photo_publication_consent: null, professional_profile_consent: null,
}

export default function VolunteerHrProfilePage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<VolunteerHrProfile | null>(null)
  const [departments, setDepartments] = useState<{ id: number; name_ar: string }[]>([])
  const [form, setForm] = useState<VolunteerHrProfileFormValues>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [customJobTitle, setCustomJobTitle] = useState('')
  const [jobTitleOptions, setJobTitleOptions] = useState<JobTitleOption[]>([])
  const [jobTitleSelectValue, setJobTitleSelectValue] = useState('')
  const [jobTitlesLoading, setJobTitlesLoading] = useState(false)
  // Two independent selectors on purpose: the phone dial-code and the
  // volunteer's actual country of residence are different concepts and must
  // never be inferred from one another (per the audit — the previous single
  // "الدولة" field ambiguously drove both at once).
  const [phoneCountry, setPhoneCountry] = useState<Country | null>(null)
  const [residenceCountry, setResidenceCountry] = useState<Country | null>(null)
  const [localPhone, setLocalPhone] = useState('')
  const [educationSelect, setEducationSelect] = useState('')
  const [educationOther, setEducationOther] = useState('')
  const [specializationSelect, setSpecializationSelect] = useState('')
  const [specializationOther, setSpecializationOther] = useState('')
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([fetchMyVolunteerHrProfile(), fetchDepartmentOptions()])
      .then(([mine, depts]) => {
        setProfile(mine)
        setDepartments(depts.map((d) => ({ id: d.id, name_ar: d.name_ar })))
        // Prefill education select when the volunteer can still edit (draft/rejected).
        if (mine && (mine.status === 'rejected' || mine.status === 'draft')) {
          const edu = educationToFormState(mine.education)
          setEducationSelect(edu.select)
          setEducationOther(edu.other)
          const spec = specializationToFormState(mine.university_specialization)
          setSpecializationSelect(spec.select)
          setSpecializationOther(spec.other)
          if (mine.country_code) {
            const match = ALL_COUNTRIES.find((c) => c.code === mine.country_code)
            if (match) setResidenceCountry(match)
          }
          setForm((f) => ({
            ...f,
            education: mine.education ?? undefined,
            university_specialization: mine.university_specialization ?? undefined,
            professional_bio: mine.professional_bio ?? undefined,
            city: mine.city ?? undefined,
            // Prefer stable ISO; resolve legacy free-text demonyms when possible.
            nationality: resolveNationalityCode(mine.nationality) ?? mine.nationality ?? undefined,
            photo_publication_consent: mine.photo_publication_consent,
            professional_profile_consent: mine.professional_profile_consent,
          }))
        }
      })
      .catch((err) => toast.error(getApiErrorMessage(err) || 'تعذر تحميل البيانات'))
      .finally(() => setLoading(false))
  }, [])

  // Job titles depend on the selected department. The synchronous resets run
  // during render via the P2 "adjust state when a dep changes" pattern
  // (docs/04-references/effect-patterns.md) — the effect only owns the fetch,
  // whose setStates live in .then/.catch/.finally callbacks (allowed).
  const [seenDepartmentId, setSeenDepartmentId] = useState(form.department_id)
  if (seenDepartmentId !== form.department_id) {
    setSeenDepartmentId(form.department_id)
    if (form.department_id) setJobTitlesLoading(true)
    else setJobTitleOptions([])
  }

  useEffect(() => {
    if (!form.department_id) return
    fetchJobTitles(form.department_id)
      .then(setJobTitleOptions)
      .catch(() => setJobTitleOptions([]))
      .finally(() => setJobTitlesLoading(false))
  }, [form.department_id])

  function set<K extends keyof VolunteerHrProfileFormValues>(key: K, value: VolunteerHrProfileFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key as string]: '' }))
  }

  function handleDepartmentChange(id: number) {
    set('department_id', id)
    // Selected job title almost certainly doesn't belong to the new department.
    set('job_title', '')
    set('job_title_source', undefined)
    setJobTitleSelectValue('')
    setCustomJobTitle('')
  }

  function handleJobTitleSelectChange(selectValue: string) {
    setJobTitleSelectValue(selectValue)
    if (selectValue === CUSTOM_JOB_TITLE_VALUE) {
      set('job_title', customJobTitle)
      set('job_title_source', 'custom')
      return
    }
    set('job_title', selectValue)
    set('job_title_source', selectValue ? 'canonical' : undefined)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})

    // Explicit-choice guard, mirrored by the backend's own `required|boolean`
    // rule — catches it before a round trip, never trusted in place of it.
    // false is a valid explicit answer — only null (no selection yet) blocks submission.
    const nextErrors: Record<string, string> = {}
    if (form.photo_publication_consent === null || form.photo_publication_consent === undefined) {
      nextErrors.photo_publication_consent = 'يرجى تحديد موافقتك على استخدام الصورة الشخصية'
    }
    if (form.professional_profile_consent === null || form.professional_profile_consent === undefined) {
      nextErrors.professional_profile_consent = 'يرجى تحديد موافقتك على عرض البيانات المهنية'
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    const payload: VolunteerHrProfileFormValues = {
      ...form,
      job_title: jobTitleSelectValue === CUSTOM_JOB_TITLE_VALUE ? customJobTitle : form.job_title,
      education: educationFromFormState(educationSelect, educationOther),
      university_specialization: specializationFromFormState(specializationSelect, specializationOther),
      phone: buildE164Phone(phoneCountry, localPhone),
      phone_country_code: phoneCountry?.dialCode,
      // Residence, not the phone dial-code country — a fully independent selector.
      country: residenceCountry?.name,
      country_code: residenceCountry?.code,
      // Prefer stable ISO over free-text demonyms.
      nationality: resolveNationalityCode(form.nationality) ?? form.nationality,
    }

    setSubmitting(true)
    try {
      const canResubmit = profile && profile.status === 'rejected'
      const saved = canResubmit
        ? await updateVolunteerHrProfile(profile.id, payload)
        : await submitVolunteerHrProfile(payload)
      // Drives the confirmation branch immediately from the mutation's own
      // response — never depends on a follow-up GET or a page refresh.
      setProfile(saved)
      setErrors({})
      toast.success('تم إرسال بياناتك بنجاح')
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (err) {
      const code = axios.isAxiosError<{ code?: string }>(err) ? err.response?.data?.code : undefined
      if (code === 'pending_exists' || code === 'already_volunteer') {
        // The backend already has a profile for this account (e.g. a fast
        // double-submit beat the disabled button) — re-sync to it instead of
        // leaving the user stuck on a form that can't be resubmitted.
        toast.error(getApiErrorMessage(err) || 'تم إرسال بياناتك مسبقاً وهي قيد المراجعة')
        try {
          setProfile(await fetchMyVolunteerHrProfile())
        } catch {
          /* keep the form visible if even the re-sync fails — better than a blank state */
        }
        return
      }
      if (code === 'already_member') {
        toast.error('أنت مضاف بالفعل ضمن أعضاء الفريق.')
        return
      }
      const fieldErrors = getLaravelFieldErrors(err)
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors)
      } else {
        toast.error(getApiErrorMessage(err) || 'تعذر إرسال البيانات')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-customBlue" />
      </div>
    )
  }

  // Already submitted and not (yet) rejected — show status card, not the form.
  if (profile && profile.status !== 'rejected' && profile.status !== 'draft') {
    // STATUS_CFG covers every value VolunteerHrProfile::STATUSES can hold —
    // still, an unrecognized/future status must never fall through to a
    // blank page: fall back to a generic-but-real card instead of crashing.
    const cfg = STATUS_CFG[profile.status] ?? {
      label: profile.status, icon: FileText, cls: 'bg-slate-100 text-slate-600 border-slate-200',
    }
    const Icon = cfg.icon
    return (
      <div dir="rtl" ref={topRef} className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Icon className="mx-auto mb-4 h-10 w-10 text-customBlue" />
          <h1 className="mb-1 text-lg font-black text-deepBlue">ملفك التعريفي كمتطوع</h1>
          <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${cfg.cls}`}>
            {cfg.label}
          </span>
          <p className="mt-4 text-sm font-semibold text-slate-500">
            {profile.status === 'approved'
              ? 'تم قبولك وإضافتك إلى فريق العمل. مرحباً بك!'
              : 'سيتم إشعارك فور مراجعة طلبك من قبل فريق الموارد البشرية.'}
          </p>
          <dl className="mx-auto mt-5 grid max-w-xs gap-2 text-right text-xs">
            {profile.submitted_at && (
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <dt className="font-black text-slate-400">تاريخ التقديم</dt>
                <dd className="font-bold text-deepBlue">{new Date(profile.submitted_at).toLocaleDateString('ar')}</dd>
              </div>
            )}
            {profile.department && (
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <dt className="font-black text-slate-400">القسم</dt>
                <dd className="font-bold text-deepBlue">{profile.department.name}</dd>
              </div>
            )}
            {profile.job_title && (
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <dt className="font-black text-slate-400">المسمى الوظيفي</dt>
                <dd className="font-bold text-deepBlue">{profile.job_title}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" ref={topRef} className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 rounded-2xl bg-gradient-to-l from-customBlue to-deepBlue p-6 text-white shadow-lg">
        <h1 className="text-xl font-black">الملف التعريفي للمتطوعين</h1>
        <p className="mt-1 text-sm font-semibold text-white/80">
          الرجاء تعبئة البيانات التالية بدقة لمراجعتها من قبل فريق الموارد البشرية.
        </p>
      </div>

      {profile?.status === 'rejected' && profile.rejection_reason && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-right">
          <p className="text-xs font-black text-red-700">تم رفض طلبك السابق</p>
          <p className="mt-1 text-xs font-semibold text-red-600">السبب: {profile.rejection_reason}</p>
          <p className="mt-1 text-[11px] font-semibold text-red-500">يمكنك تعديل البيانات وإعادة الإرسال أدناه.</p>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* Section 1 — Personal information */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-black uppercase tracking-wide text-customBlue">المعلومات الشخصية</p>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <Field label="الاسم الكامل" error={errors.full_name} required>
              <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="البريد الإلكتروني" error={errors.email} required>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} dir="ltr" />
            </Field>
            <Field label="رقم الهاتف" error={errors.phone} required hint="اختر مفتاح الاتصال الدولي ثم أدخل الرقم">
              <div className="grid gap-1.5">
                <CountrySelector value={phoneCountry} onChange={setPhoneCountry} />
                <PhoneInput country={phoneCountry} value={localPhone} onChange={setLocalPhone} error={errors.phone} />
              </div>
            </Field>
            <Field label="الجنسية" error={errors.nationality} hint="يُحفظ كرمز الدولة — العرض باسم الدولة">
              <AnimatedSelect
                ariaLabel="الجنسية"
                searchable
                searchPlaceholder="ابحث باسم الدولة أو English أو ISO…"
                value={form.nationality ?? ''}
                placeholder="اختر الجنسية"
                options={NATIONALITY_OPTIONS}
                onChange={(code) => set('nationality', code)}
              />
            </Field>
            <EmcDatePicker label="تاريخ الميلاد" value={form.date_of_birth ?? ''} onChange={(v) => set('date_of_birth', v)} layout="stacked" maxDate={new Date().toISOString().slice(0, 10)} showPresets={false} />
            <Field label="الجنس" error={errors.gender}>
              <AnimatedSelect
                ariaLabel="الجنس"
                value={form.gender ?? ''}
                placeholder="اختر"
                options={GENDER_OPTIONS}
                onChange={(v) => set('gender', v)}
              />
            </Field>
          </div>
        </section>

        {/* Section 1b — Current residence (deliberately separate from nationality) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-black uppercase tracking-wide text-customBlue">مكان الإقامة الحالي</p>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <Field label="بلد الإقامة الحالي" error={errors.country_code} hint="أين تقيم حاليًا — قد يختلف عن جنسيتك ورقم الهاتف">
              <AnimatedSelect
                ariaLabel="بلد الإقامة الحالي"
                searchable
                searchPlaceholder="ابحث بالعربية أو English أو ISO…"
                value={residenceCountry?.code ?? ''}
                placeholder="اختر بلد الإقامة"
                options={RESIDENCE_COUNTRY_OPTIONS}
                onChange={(code) => {
                  const match = ALL_COUNTRIES.find((c) => c.code === code) ?? null
                  setResidenceCountry(match)
                  setErrors((err) => ({ ...err, country_code: '' }))
                }}
              />
            </Field>
            <Field label="مدينة الإقامة الحالية" error={errors.city}>
              <input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} className={inputCls} placeholder="مثال: Breda / صنعاء" />
            </Field>
          </div>
        </section>

        {/* Section 2 — Volunteer role */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-black uppercase tracking-wide text-customBlue">دور المتطوع</p>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <Field label="القسم" error={errors.department_id} required>
              <select aria-label="القسم" value={form.department_id || ''} onChange={(e) => handleDepartmentChange(Number(e.target.value))} className={inputCls}>
                <option value="">اختر القسم</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name_ar}</option>)}
              </select>
            </Field>
            <Field label="المسمى الوظيفي" error={errors.job_title} required>
              <select
                aria-label="المسمى الوظيفي"
                value={jobTitleSelectValue}
                onChange={(e) => handleJobTitleSelectChange(e.target.value)}
                disabled={!form.department_id || jobTitlesLoading}
                className={inputCls}
              >
                <option value="">{!form.department_id ? 'اختر القسم أولاً' : 'اختر المسمى الوظيفي'}</option>
                {jobTitleOptions.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                <option value={CUSTOM_JOB_TITLE_VALUE}>أخرى</option>
              </select>
            </Field>
            {jobTitleSelectValue === CUSTOM_JOB_TITLE_VALUE && (
              <Field label="حدد المسمى الوظيفي">
                <input
                  value={customJobTitle}
                  onChange={(e) => {
                    setCustomJobTitle(e.target.value)
                    set('job_title', e.target.value)
                  }}
                  className={inputCls}
                />
              </Field>
            )}
            <EmcDatePicker label="تاريخ الانضمام" value={form.join_date} onChange={(v) => set('join_date', v)} layout="stacked" required showPresets={false} />
            <Field label="عدد الساعات الأسبوعية" error={errors.weekly_hours}>
              <input type="number" min={0} max={168} value={form.weekly_hours ?? ''} onChange={(e) => set('weekly_hours', e.target.value ? Number(e.target.value) : undefined)} className={inputCls} />
            </Field>
            <Field label="التوفر" error={errors.availability}>
              <input value={form.availability ?? ''} onChange={(e) => set('availability', e.target.value)} className={inputCls} placeholder="مثال: مساءً / نهاية الأسبوع" />
            </Field>
          </div>
        </section>

        {/* Section 3 — Skills and experience */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-black uppercase tracking-wide text-customBlue">المهارات والخبرات</p>
          <div className="grid gap-4">
            <Field label="المهارات"><textarea value={form.skills ?? ''} onChange={(e) => set('skills', e.target.value)} className={`${inputCls} min-h-20`} /></Field>
            <Field label="اللغات">
              <LanguagesSelect value={form.languages ?? []} onChange={(langs) => set('languages', langs)} error={errors.languages} />
            </Field>
            <Field label="المؤهل العلمي" error={errors.education}>
              <AnimatedSelect
                ariaLabel="المؤهل العلمي"
                value={educationSelect}
                placeholder="اختر المؤهل العلمي"
                options={EDUCATION_OPTIONS}
                onChange={(next) => {
                  setEducationSelect(next)
                  if (next !== 'other') setEducationOther('')
                  set('education', educationFromFormState(next, next === 'other' ? educationOther : ''))
                  setErrors((err) => ({ ...err, education: '' }))
                }}
              />
            </Field>
            {educationSelect === 'other' && (
              <Field label="يرجى تحديد المؤهل العلمي" error={errors.education_other}>
                <input
                  value={educationOther}
                  onChange={(e) => {
                    setEducationOther(e.target.value)
                    set('education', educationFromFormState('other', e.target.value))
                    setErrors((err) => ({ ...err, education: '', education_other: '' }))
                  }}
                  className={inputCls}
                  placeholder="اكتب المؤهل العلمي"
                  aria-label="يرجى تحديد المؤهل العلمي"
                />
              </Field>
            )}
            <Field label="التخصص الجامعي" error={errors.university_specialization}>
              <AnimatedSelect
                ariaLabel="التخصص الجامعي"
                value={specializationSelect}
                placeholder="اختر التخصص الجامعي"
                options={SPECIALIZATION_OPTIONS}
                onChange={(next) => {
                  setSpecializationSelect(next)
                  if (next !== UNIVERSITY_SPECIALIZATION_OTHER) setSpecializationOther('')
                  set('university_specialization', specializationFromFormState(next, next === UNIVERSITY_SPECIALIZATION_OTHER ? specializationOther : ''))
                  setErrors((err) => ({ ...err, university_specialization: '' }))
                }}
              />
            </Field>
            {specializationSelect === UNIVERSITY_SPECIALIZATION_OTHER && (
              <Field label="اكتب تخصصك الجامعي">
                <input
                  value={specializationOther}
                  onChange={(e) => {
                    setSpecializationOther(e.target.value)
                    set('university_specialization', specializationFromFormState(UNIVERSITY_SPECIALIZATION_OTHER, e.target.value))
                  }}
                  className={inputCls}
                  placeholder="اكتب تخصصك الجامعي"
                />
              </Field>
            )}
            <Field label="الخبرات السابقة"><textarea value={form.experience ?? ''} onChange={(e) => set('experience', e.target.value)} className={`${inputCls} min-h-20`} /></Field>
            <Field label="المهام الحالية / الدافع للتطوع"><textarea value={form.motivation ?? ''} onChange={(e) => set('motivation', e.target.value)} className={`${inputCls} min-h-20`} /></Field>
          </div>
        </section>

        {/* Section 3b — About the volunteer */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-black uppercase tracking-wide text-customBlue">نبذة عن المتطوع</p>
          <Field label="نبذة تعريفية" error={errors.professional_bio} hint="اكتب نبذة قصيرة ومهنية يمكن عرضها في منصة EMC">
            <textarea
              value={form.professional_bio ?? ''}
              onChange={(e) => set('professional_bio', e.target.value.slice(0, BIO_MAX_LENGTH))}
              maxLength={BIO_MAX_LENGTH}
              className={`${inputCls} min-h-24`}
            />
            <span className="mt-1 block text-left text-[11px] font-bold text-slate-400" dir="ltr">
              {(form.professional_bio ?? '').length} / {BIO_MAX_LENGTH}
            </span>
          </Field>
        </section>

        {/* Section 4 — Documents */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-black uppercase tracking-wide text-customBlue">المستندات</p>
          <div className="grid gap-4">
            <AppFileUpload
              label="السيرة الذاتية"
              name="cv_file"
              file={form.cv_file ?? null}
              onChange={(f) => set('cv_file', f)}
              error={errors.cv_file}
              required
              accept=".pdf,.doc,.docx"
              hint="PDF أو Word، بحد أقصى 5 ميجابايت"
              compress
            />
            <AppFileUpload
              label="الصورة الشخصية"
              name="profile_photo"
              file={form.profile_photo ?? null}
              onChange={(f) => set('profile_photo', f)}
              error={errors.profile_photo}
              accept="image/*"
              hint="JPG أو PNG أو WEBP — يمكن استخدام الصورة في الملف التعريفي بعد موافقتك"
              imageContext="avatar"
            />
            <Field label="رابط LinkedIn" error={errors.linkedin_url}>
              <input value={form.linkedin_url ?? ''} onChange={(e) => set('linkedin_url', e.target.value)} className={inputCls} dir="ltr" />
            </Field>
            <Field label="رابط معرض الأعمال" error={errors.portfolio_url}>
              <input value={form.portfolio_url ?? ''} onChange={(e) => set('portfolio_url', e.target.value)} className={inputCls} dir="ltr" />
            </Field>
          </div>
        </section>

        {/* Section 4b — Consent and privacy — two INDEPENDENT explicit consents, never bundled */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-black uppercase tracking-wide text-customBlue">الموافقات والخصوصية</p>
          <div className="grid gap-3">
            <ConsentCard
              title="استخدام الصورة الشخصية"
              question="هل توافق على استخدام ونشر صورتك الشخصية في منصات المركز؟"
              explanation="قد تُستخدم صورتك في منصة EMC، الموقع الإلكتروني، المجلات والمنشورات، وحسابات التواصل الاجتماعي الرسمية الخاصة بالمركز."
              value={form.photo_publication_consent ?? null}
              onChange={(v) => set('photo_publication_consent', v)}
              error={errors.photo_publication_consent}
            />
            <ConsentCard
              title="عرض البيانات المهنية"
              question="هل توافق على عرض بياناتك المهنية الأساسية ضمن منصات EMC؟"
              explanation="سيتم استخدام وعرض المعلومات اللازمة فقط مثل الاسم، الصورة عند الموافقة، القسم، المسمى الوظيفي، التخصص، والنبذة التعريفية. لن يتم نشر بيانات الاتصال الخاصة مثل رقم الهاتف أو البريد الإلكتروني دون حاجة أو صلاحية مناسبة."
              value={form.professional_profile_consent ?? null}
              onChange={(v) => set('professional_profile_consent', v)}
              error={errors.professional_profile_consent}
            />
          </div>
        </section>

        {/* Section 5 — Confirmation */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="flex items-center gap-2 text-xs font-bold text-deepBlue">
            <input type="checkbox" checked={form.confirmed} onChange={(e) => set('confirmed', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            <ShieldCheck size={14} className="text-customBlue" />
            أؤكد أن جميع المعلومات المدخلة صحيحة
          </label>
          {errors.confirmed && <p className="mt-1 text-[11px] font-bold text-red-600">{errors.confirmed}</p>}
        </section>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-customOrange py-3.5 text-sm font-black text-white shadow-lg shadow-customOrange/25 transition hover:bg-[#d4832e] disabled:opacity-60"
        >
          {submitting ? 'جارٍ الإرسال...' : 'إرسال البيانات'}
        </button>
      </form>
    </div>
  )
}

const inputCls = 'box-border min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'

function Field({ label, error, required, hint, children }: { label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-black text-deepBlue">
      <span className="inline-flex min-h-[1.25rem] items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </span>
      {children}
      {hint && !error && <span className="text-[11px] font-semibold text-slate-400">{hint}</span>}
      {error && <span className="text-[11px] font-bold text-red-600">{error}</span>}
    </label>
  )
}

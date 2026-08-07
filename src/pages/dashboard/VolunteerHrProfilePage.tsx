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

const CUSTOM_JOB_TITLE_VALUE = '__custom__'

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
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [localPhone, setLocalPhone] = useState('')
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([fetchMyVolunteerHrProfile(), fetchDepartmentOptions()])
      .then(([mine, depts]) => {
        setProfile(mine)
        setDepartments(depts.map((d) => ({ id: d.id, name_ar: d.name_ar })))
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

    const payload: VolunteerHrProfileFormValues = {
      ...form,
      job_title: jobTitleSelectValue === CUSTOM_JOB_TITLE_VALUE ? customJobTitle : form.job_title,
      phone: buildE164Phone(selectedCountry, localPhone),
      phone_country_code: selectedCountry?.dialCode,
      country: selectedCountry?.name,
      country_code: selectedCountry?.code,
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الاسم الكامل" error={errors.full_name} required>
              <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="البريد الإلكتروني" error={errors.email} required>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} dir="ltr" />
            </Field>
            <Field label="الدولة" error={errors.country_code}>
              <CountrySelector value={selectedCountry} onChange={setSelectedCountry} error={errors.country_code} />
            </Field>
            <Field label="رقم الهاتف" error={errors.phone} required>
              <PhoneInput country={selectedCountry} value={localPhone} onChange={setLocalPhone} error={errors.phone} />
            </Field>
            <Field label="المدينة" error={errors.city}>
              <input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} className={inputCls} />
            </Field>
            <Field label="الجنسية" error={errors.nationality}>
              <input value={form.nationality ?? ''} onChange={(e) => set('nationality', e.target.value)} className={inputCls} />
            </Field>
            <EmcDatePicker label="تاريخ الميلاد" value={form.date_of_birth ?? ''} onChange={(v) => set('date_of_birth', v)} layout="stacked" maxDate={new Date().toISOString().slice(0, 10)} showPresets={false} />
            <Field label="الجنس" error={errors.gender}>
              <select value={form.gender ?? ''} onChange={(e) => set('gender', e.target.value)} className={inputCls}>
                <option value="">اختر</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </Field>
          </div>
        </section>

        {/* Section 2 — Volunteer role */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-black uppercase tracking-wide text-customBlue">دور المتطوع</p>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Field label="المؤهل العلمي"><input value={form.education ?? ''} onChange={(e) => set('education', e.target.value)} className={inputCls} /></Field>
            <Field label="الخبرات السابقة"><textarea value={form.experience ?? ''} onChange={(e) => set('experience', e.target.value)} className={`${inputCls} min-h-20`} /></Field>
            <Field label="المهام الحالية / الدافع للتطوع"><textarea value={form.motivation ?? ''} onChange={(e) => set('motivation', e.target.value)} className={`${inputCls} min-h-20`} /></Field>
          </div>
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

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-black text-deepBlue">
      {label} {required && <span className="text-red-500">*</span>}
      {children}
      {error && <span className="text-[11px] font-bold text-red-600">{error}</span>}
    </label>
  )
}
